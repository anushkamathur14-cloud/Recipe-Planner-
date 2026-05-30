import OpenAI from "openai";
import {
  extractedRecipeSchema,
  type ExtractedRecipe,
} from "@recipe-planner/shared";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required");
  return new OpenAI({ apiKey: key });
}

export async function transcribeAudio(filePath: string): Promise<string> {
  const fs = await import("fs");
  const stream = fs.createReadStream(filePath);
  const response = await getOpenAI().audio.transcriptions.create({
    file: stream,
    model: "whisper-1",
  });
  return response.text;
}

const RECIPE_JSON_FIELDS = `- name: recipe title
- servings: integer default servings
- ingredients: array of { name, quantity (number or null), unit (string or null), notes? }
- steps: array of { order (1-based), text } — include specific quantities when mentioned
- confidence: "high" | "medium" | "low" based on how complete the source is

Be faithful to the source. Use null quantity when not specified.`;

export async function extractRecipeFromTranscript(
  transcript: string,
  sourceUrl: string
): Promise<ExtractedRecipe> {
  return extractRecipeFromText(
    transcript,
    sourceUrl,
    "video transcript"
  );
}

export async function extractRecipeFromText(
  text: string,
  sourceLabel: string,
  sourceKind: "video transcript" | "web page" | "screenshot"
): Promise<ExtractedRecipe> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract structured recipes from ${sourceKind} content. Return JSON with:
${RECIPE_JSON_FIELDS}`,
      },
      {
        role: "user",
        content: `Source: ${sourceLabel}\n\nContent:\n${text.slice(0, 120000)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty LLM response");
  const parsed = JSON.parse(raw);
  return extractedRecipeSchema.parse(parsed);
}

export async function extractRecipeFromImageWithOpenAI(
  mimeType: string,
  dataBase64: string,
  sourceLabel: string
): Promise<{ extracted: ExtractedRecipe; transcript: string }> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract structured recipes from recipe screenshots. Return JSON with:
${RECIPE_JSON_FIELDS}
- transcript: plain-text summary of all recipe text visible in the image`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Source: ${sourceLabel}\n\nExtract the recipe from this image.` },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${dataBase64}`,
            },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty LLM response");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const rawTranscript =
    typeof parsed.transcript === "string" ? parsed.transcript : "";
  const { transcript: _t, ...recipeFields } = parsed;
  const extracted = extractedRecipeSchema.parse(recipeFields);

  const transcript =
    rawTranscript.trim() ||
    [
      extracted.name,
      "",
      "Ingredients:",
      ...extracted.ingredients.map((i) =>
        [i.quantity, i.unit, i.name, i.notes ? `(${i.notes})` : ""]
          .filter(Boolean)
          .join(" ")
      ),
      "",
      "Steps:",
      ...extracted.steps.map((s) => `${s.order}. ${s.text}`),
    ].join("\n");

  return { extracted, transcript };
}

export async function answerRecipeQuestion(
  recipeContext: string,
  history: { role: "user" | "assistant"; content: string }[],
  question: string
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a helpful cooking assistant. Answer only based on the recipe data provided. If unsure, say so. Suggest substitutions with quantities when asked.

Recipe data:
${recipeContext}`,
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ],
  });

  return response.choices[0]?.message?.content ?? "I could not generate a response.";
}
