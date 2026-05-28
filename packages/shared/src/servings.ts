import type { Ingredient } from "./schemas";

export function servingsMultiplier(
  baseServings: number,
  targetServings: number
): number {
  if (baseServings <= 0) return 1;
  return targetServings / baseServings;
}

export function scaleQuantity(
  quantity: number | null | undefined,
  multiplier: number
): number | null {
  if (quantity == null) return null;
  const scaled = quantity * multiplier;
  return Math.round(scaled * 100) / 100;
}

export function formatIngredientAmount(
  ing: Ingredient,
  multiplier = 1
): string {
  const qtyPart = formatIngredientQuantity(ing, multiplier);
  const parts = [qtyPart, ing.name].filter(Boolean);
  let line = parts.join(" ");
  if (ing.notes) line += ` (${ing.notes})`;
  return line;
}

/** Quantity + unit only (for side-by-side serving columns). */
export function formatIngredientQuantity(
  ing: Ingredient,
  multiplier = 1
): string {
  const qty = scaleQuantity(ing.quantity ?? null, multiplier);
  const parts: string[] = [];
  if (qty != null) {
    parts.push(qty % 1 === 0 ? String(qty) : qty.toFixed(2));
  }
  if (ing.unit) parts.push(ing.unit);
  if (parts.length === 0) return "—";
  let line = parts.join(" ");
  if (ing.notes) line += ` (${ing.notes})`;
  return line;
}
