import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export const stepSchema = z.object({
  order: z.number(),
  text: z.string(),
});

export const extractedRecipeSchema = z.object({
  name: z.string(),
  servings: z.number().int().positive().default(4),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

export type Ingredient = z.infer<typeof ingredientSchema>;
export type Step = z.infer<typeof stepSchema>;
export type ExtractedRecipe = z.infer<typeof extractedRecipeSchema>;

/** Stored on ImportJob.payload for screenshot imports (worker reads base64). */
export const imageImportPayloadSchema = z.object({
  mimeType: z.string(),
  dataBase64: z.string(),
  fileName: z.string().optional(),
});

export type ImageImportPayload = z.infer<typeof imageImportPayloadSchema>;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function parseIngredients(json: unknown): Ingredient[] {
  const parsed = z.array(ingredientSchema).safeParse(json);
  return parsed.success ? parsed.data : [];
}

export function parseSteps(json: unknown): Step[] {
  const parsed = z.array(stepSchema).safeParse(json);
  return parsed.success ? parsed.data : [];
}
