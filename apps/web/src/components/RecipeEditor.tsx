"use client";

import { useState } from "react";
import type { Ingredient, Step } from "@recipe-planner/shared";

type Props = {
  recipeId: string;
  initial: {
    name: string;
    servings: number;
    ingredients: Ingredient[];
    steps: Step[];
    status: string;
  };
};

export function RecipeEditor({ recipeId, initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [servings, setServings] = useState(initial.servings);
  const [ingredients, setIngredients] = useState(initial.ingredients);
  const [steps, setSteps] = useState(initial.steps);
  const [status, setStatus] = useState(initial.status);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/recipes/${recipeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, servings, ingredients, steps, status }),
    });
    setSaving(false);
    setMsg(res.ok ? "Saved" : "Save failed");
  }

  return (
    <div className="card">
      <h3>Edit recipe</h3>
      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <label>Servings</label>
      <input
        type="number"
        value={servings}
        onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
      />
      <label>Status</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">pending</option>
        <option value="processing">processing</option>
        <option value="ready">ready</option>
        <option value="failed">failed</option>
      </select>

      <h4>Ingredients</h4>
      {ingredients.map((ing, i) => (
        <div key={i} className="grid-2" style={{ alignItems: "end" }}>
          <input
            placeholder="Name"
            value={ing.name}
            onChange={(e) => {
              const next = [...ingredients];
              next[i] = { ...ing, name: e.target.value };
              setIngredients(next);
            }}
          />
          <input
            placeholder="Qty"
            type="number"
            value={ing.quantity ?? ""}
            onChange={(e) => {
              const next = [...ingredients];
              next[i] = {
                ...ing,
                quantity: e.target.value ? parseFloat(e.target.value) : null,
              };
              setIngredients(next);
            }}
          />
          <input
            placeholder="Unit"
            value={ing.unit ?? ""}
            onChange={(e) => {
              const next = [...ingredients];
              next[i] = { ...ing, unit: e.target.value || null };
              setIngredients(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() =>
          setIngredients([
            ...ingredients,
            { name: "", quantity: null, unit: null },
          ])
        }
      >
        + Ingredient
      </button>

      <h4>Steps</h4>
      {steps.map((step, i) => (
        <textarea
          key={i}
          rows={2}
          value={step.text}
          onChange={(e) => {
            const next = [...steps];
            next[i] = { ...step, text: e.target.value };
            setSteps(next);
          }}
        />
      ))}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() =>
          setSteps([...steps, { order: steps.length + 1, text: "" }])
        }
      >
        + Step
      </button>

      <div style={{ marginTop: "1rem" }}>
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {msg && <span className="muted" style={{ marginLeft: 12 }}>{msg}</span>}
      </div>
    </div>
  );
}
