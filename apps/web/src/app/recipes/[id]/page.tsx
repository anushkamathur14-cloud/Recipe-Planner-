import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@recipe-planner/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseIngredients, parseSteps } from "@recipe-planner/shared";
import { StatusBadge } from "@/components/StatusBadge";
import { RecipeEditor } from "@/components/RecipeEditor";
import { RecipeChat } from "@/components/RecipeChat";
import { RetryButton } from "@/components/RetryButton";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) redirect("/login");
  const isAdmin = user.role === "admin";
  const { id } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: { id, userId: user.id },
  });
  if (!recipe) notFound();

  const ingredients = parseIngredients(recipe.ingredients);
  const steps = parseSteps(recipe.steps);

  return (
    <div className="container">
      <p>
        <Link href="/recipes">← Recipes</Link>
      </p>
      <h1>{recipe.name}</h1>
      <p>
        <StatusBadge status={recipe.status} /> · Serves {recipe.servings} ·{" "}
        <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
          View {recipe.sourceType} source
        </a>
      </p>
      {recipe.errorMessage && (
        <p className="error">{recipe.errorMessage}</p>
      )}
      {isAdmin &&
        (recipe.status === "failed" || recipe.status === "pending") && (
          <RetryButton recipeId={recipe.id} />
        )}

      <div className="grid-2">
        <div className="card">
          <h3>Ingredients</h3>
          {ingredients.length === 0 ? (
            <p className="muted">No ingredients yet.</p>
          ) : (
            <ul>
              {ingredients.map((ing, i) => (
                <li key={i}>
                  {ing.quantity != null ? `${ing.quantity} ` : ""}
                  {ing.unit ? `${ing.unit} ` : ""}
                  {ing.name}
                  {ing.notes ? ` (${ing.notes})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>Method</h3>
          {steps.length === 0 ? (
            <p className="muted">No steps yet.</p>
          ) : (
            <ol>
              {steps.map((s) => (
                <li key={s.order}>{s.text}</li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {recipe.transcript && (
        <details className="card">
          <summary>Transcript</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
            {recipe.transcript}
          </pre>
        </details>
      )}

      <RecipeEditor
        recipeId={recipe.id}
        initial={{
          name: recipe.name,
          servings: recipe.servings,
          ingredients,
          steps,
          status: recipe.status,
        }}
      />

      {recipe.status === "ready" && <RecipeChat recipeId={recipe.id} />}
    </div>
  );
}
