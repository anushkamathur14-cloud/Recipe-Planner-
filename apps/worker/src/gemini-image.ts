import { GoogleGenAI } from "@google/genai";
import {
  extractedRecipeSchema,
  type ExtractedRecipe,
} from "@recipe-planner/shared";
import { parseJsonResponse, geminiErrorMessage, getGeminiModel } from "./gemini-shared";

const IMAGE_RECIPE_PROMPT = `You are extracting a structured recipe from a screenshot of a recipe (cookbook page, blog, app, or handwritten notes).

Return JSON only (no markdown) with:
- name: recipe title
- servings: integer default servings
- ingredients: array of { name, quantity (number or null), unit (string or null), notes? }
- steps: array of { order (1-based), text } — include quantities when visible
- confidence: "high" | "medium" | "low"
- transcript: plain-text summary of all recipe text you can read in the image

Be faithful to the image. Use null quantity when not specified.`;

export async function extractRecipeFromImageWithGemini(
  mimeType: string,
  dataBase64: string
): Promise<{ extracted: ExtractedRecipe; transcript: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for image import");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = getGeminiModel();

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: dataBase64 } },
            { text: IMAGE_RECIPE_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
  } catch (err) {
    throw new Error(geminiErrorMessage(err));
  }

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response for this image");
  }

  try {
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
  } catch (err) {
    throw new Error(
      `Gemini returned invalid recipe JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
