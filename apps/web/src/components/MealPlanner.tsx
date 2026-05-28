"use client";

import { useCallback, useEffect, useState } from "react";
import { DAY_LABELS, MEAL_TYPES } from "@recipe-planner/shared";

type Recipe = { id: string; name: string; status: string };
type Slot = {
  id: string;
  day: number;
  mealType: string;
  servingsMultiplier: number;
  recipe: { id: string; name: string; servings: number };
};
type ShoppingLine = { formatted: string; name: string; quantity: number | null; unit: string | null };

export function MealPlanner({
  week,
  prevWeek,
  nextWeek,
}: {
  week: string;
  prevWeek: string;
  nextWeek: string;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingLine[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [day, setDay] = useState(0);
  const [mealType, setMealType] = useState("dinner");
  const [multiplier, setMultiplier] = useState(1);

  const load = useCallback(async () => {
    const [planRes, recipesRes] = await Promise.all([
      fetch(`/api/meal-plans?week=${week}`),
      fetch("/api/recipes?status=ready"),
    ]);
    const planData = await planRes.json();
    const recipesData = await recipesRes.json();
    setSlots(planData.plan?.slots ?? []);
    setShoppingList(planData.shoppingList ?? []);
    setRecipes(recipesData);
    if (recipesData[0] && !recipeId) setRecipeId(recipesData[0].id);
  }, [week, recipeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/meal-plans/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week,
        recipeId,
        day,
        mealType,
        servingsMultiplier: multiplier,
      }),
    });
    load();
  }

  async function removeSlot(slotId: string) {
    await fetch(`/api/meal-plans/slots?slotId=${slotId}`, { method: "DELETE" });
    load();
  }

  function copyShoppingList() {
    const text = shoppingList.map((l) => l.formatted).join("\n");
    navigator.clipboard.writeText(text);
  }

  const slotsByDay = DAY_LABELS.map((_, dayIndex) =>
    slots.filter((s) => s.day === dayIndex)
  );

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <a href={`/plan?week=${prevWeek}`} className="btn btn-secondary">
          ← Prev week
        </a>
        <span style={{ alignSelf: "center" }}>Week of {week}</span>
        <a href={`/plan?week=${nextWeek}`} className="btn btn-secondary">
          Next week →
        </a>
      </div>

      <form onSubmit={addSlot} className="card">
        <h3>Add meal</h3>
        <div className="grid-2">
          <div>
            <label>Recipe</label>
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Day</label>
            <select value={day} onChange={(e) => setDay(parseInt(e.target.value, 10))}>
              {DAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Meal</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Servings multiplier</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>
        <button type="submit" className="btn">
          Add to plan
        </button>
      </form>

      <div className="planner-grid">
        {DAY_LABELS.map((label, dayIndex) => (
          <div key={label} className="planner-day">
            <h4>{label}</h4>
            {slotsByDay[dayIndex].map((slot) => (
              <div key={slot.id} className="slot">
                <strong>{slot.mealType}</strong>
                <br />
                {slot.recipe.name}
                <br />
                <span className="muted">×{slot.servingsMultiplier}</span>
                <br />
                <button
                  type="button"
                  style={{
                    fontSize: "0.7rem",
                    marginTop: 4,
                    cursor: "pointer",
                  }}
                  onClick={() => removeSlot(slot.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3>Shopping list</h3>
        <button type="button" className="btn btn-secondary" onClick={copyShoppingList}>
          Copy to clipboard
        </button>
        {shoppingList.length === 0 ? (
          <p className="muted">Add meals to generate your shopping list.</p>
        ) : (
          <ul>
            {shoppingList.map((line, i) => (
              <li key={i}>{line.formatted}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
