"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatIngredientQuantity,
  parseIngredients,
  servingsMultiplier,
  type Ingredient,
} from "@recipe-planner/shared";
import { Fragment } from "react";
import { StatusBadge } from "./StatusBadge";

function isBrowsableSourceUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function SourceCell({ sourceUrl, sourceType }: { sourceUrl: string; sourceType: string }) {
  if (!isBrowsableSourceUrl(sourceUrl)) {
    return (
      <span className="muted">
        {sourceType === "image" ? "Screenshot" : sourceType}
      </span>
    );
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="source-link"
      title={sourceUrl}
    >
      {sourceUrl}
    </a>
  );
}

export type RecipeListItem = {
  id: string;
  name: string;
  servings: number;
  sourceUrl: string;
  sourceType: string;
  status: string;
  ingredients: unknown;
};

function IngredientCompare({
  ingredients,
  baseServings,
  targetServings,
}: {
  ingredients: Ingredient[];
  baseServings: number;
  targetServings: number;
}) {
  const multiplier = servingsMultiplier(baseServings, targetServings);

  return (
    <table className="table servings-compare-table">
      <thead>
        <tr>
          <th>Ingredient</th>
          <th>Serves {baseServings}</th>
          <th>
            Adjusted for {targetServings}{" "}
            <span className="muted">(×{multiplier.toFixed(2)})</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {ingredients.map((ing, i) => (
          <tr key={`${ing.name}-${i}`}>
            <td className="ingredient-name">{ing.name}</td>
            <td>{formatIngredientQuantity(ing, 1)}</td>
            <td>{formatIngredientQuantity(ing, multiplier)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RecipeLibraryTable({ recipes }: { recipes: RecipeListItem[] }) {
  const [targetById, setTargetById] = useState<Record<string, number>>(() =>
    Object.fromEntries(recipes.map((r) => [r.id, r.servings]))
  );

  const parsed = useMemo(
    () =>
      recipes.map((r) => ({
        ...r,
        ingredientList: parseIngredients(r.ingredients),
      })),
    [recipes]
  );

  if (recipes.length === 0) {
    return <p className="muted">No recipes yet.</p>;
  }

  return (
    <table className="table card recipe-library-table">
      <thead>
        <tr>
          <th>Recipe</th>
          <th>Serves</th>
          <th>Cook for</th>
          <th>Source</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {parsed.map((r) => {
          const target = targetById[r.id] ?? r.servings;
          const adjusted =
            target !== r.servings &&
            r.ingredientList.length > 0 &&
            r.status === "ready";

          return (
            <Fragment key={r.id}>
              <tr>
                <td>
                  <Link href={`/recipes/${r.id}`} className="recipe-link">
                    {r.name}
                  </Link>
                </td>
                <td>
                  <span className="serves-base">Serves {r.servings}</span>
                </td>
                <td>
                  <input
                    type="number"
                    className="serves-input"
                    min={1}
                    max={99}
                    value={target}
                    disabled={r.status !== "ready"}
                    title={
                      r.status !== "ready"
                        ? "Available when recipe is ready"
                        : "Target number of servings"
                    }
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setTargetById((prev) => ({
                        ...prev,
                        [r.id]: Number.isFinite(n) && n > 0 ? n : r.servings,
                      }));
                    }}
                  />
                </td>
                <td>
                  <SourceCell sourceUrl={r.sourceUrl} sourceType={r.sourceType} />
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
              {adjusted && (
                <tr className="servings-detail-row">
                  <td colSpan={5}>
                    <IngredientCompare
                      ingredients={r.ingredientList}
                      baseServings={r.servings}
                      targetServings={target}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
