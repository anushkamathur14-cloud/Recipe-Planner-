import { GoogleGenAI } from "@google/genai";
import {
  extractedRecipeSchema,
  type ExtractedRecipe,
} from "@recipe-planner/shared";

const RECIPE_PROMPT = `You are extracting a recipe from a cooking video.

Watch the video and return JSON only (no markdown) with:
- name: recipe title
- servings: integer default servings
- ingredients: array of { name, quantity (number or null), unit (string or null), notes? }
- steps: array of { order (1-based), text } — include quantities when mentioned
- confidence: "high" | "medium" | "low"
- transcript: full spoken instructions from the video as plain text

Be faithful to the video. Use null quantity when not specified.`;

export function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function parseJsonResponse(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const json = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(json) as Record<string, unknown>;
}

export async function extractRecipeFromYouTubeWithGemini(
  sourceUrl: string
): Promise<{ extracted: ExtractedRecipe; transcript: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Gemini YouTube processing");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = getGeminiModel();

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: sourceUrl,
              mimeType: "video/*",
            },
          },
          { text: RECIPE_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response for this video");
  }

  const parsed = parseJsonResponse(text);
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
