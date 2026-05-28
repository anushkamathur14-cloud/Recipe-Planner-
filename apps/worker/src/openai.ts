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

export async function extractRecipeFromTranscript(
  transcript: string,
  sourceUrl: string
): Promise<ExtractedRecipe> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract structured recipes from video transcripts. Return JSON with:
- name: recipe title
- servings: integer default servings
- ingredients: array of { name, quantity (number or null), unit (string or null), notes? }
- steps: array of { order (1-based), text } — each step must include specific quantities when mentioned in the transcript
- confidence: "high" | "medium" | "low" based on how complete the transcript is

Be faithful to the transcript. Use null quantity when not specified.`,
      },
      {
        role: "user",
        content: `Source URL: ${sourceUrl}\n\nTranscript:\n${transcript.slice(0, 120000)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty LLM response");
  const parsed = JSON.parse(raw);
  return extractedRecipeSchema.parse(parsed);
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
