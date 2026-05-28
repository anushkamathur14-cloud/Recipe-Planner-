import type { Ingredient } from "./schemas";

export type ShoppingLine = {
  name: string;
  unit: string | null;
  quantity: number | null;
  notes: string[];
};

function ingredientKey(name: string, unit: string | null): string {
  return `${name.trim().toLowerCase()}::${(unit ?? "").trim().toLowerCase()}`;
}

export function aggregateIngredients(
  items: { ingredients: Ingredient[]; multiplier: number }[]
): ShoppingLine[] {
  const map = new Map<string, ShoppingLine>();

  for (const { ingredients, multiplier } of items) {
    for (const ing of ingredients) {
      const unit = ing.unit ?? null;
      const key = ingredientKey(ing.name, unit);
      const scaledQty =
        ing.quantity != null ? ing.quantity * multiplier : null;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          name: ing.name,
          unit,
          quantity: scaledQty,
          notes: ing.notes ? [ing.notes] : [],
        });
        continue;
      }

      if (scaledQty != null && existing.quantity != null) {
        existing.quantity += scaledQty;
      } else if (scaledQty != null) {
        existing.quantity = scaledQty;
      }

      if (ing.notes && !existing.notes.includes(ing.notes)) {
        existing.notes.push(ing.notes);
      }
    }
  }

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export function formatShoppingLine(line: ShoppingLine): string {
  const qty =
    line.quantity != null
      ? `${line.quantity % 1 === 0 ? line.quantity : line.quantity.toFixed(2)}`
      : "";
  const unit = line.unit ? ` ${line.unit}` : "";
  const qtyPart = qty ? `${qty}${unit} ` : "";
  const notes = line.notes.length ? ` (${line.notes.join("; ")})` : "";
  return `${qtyPart}${line.name}${notes}`.trim();
}
