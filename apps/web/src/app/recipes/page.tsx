import Link from "next/link";
import { prisma } from "@recipe-planner/db";
import { SetupBanner } from "@/components/SetupBanner";
import { checkDatabase } from "@/lib/setup";
import { RecipeLibraryTable } from "@/components/RecipeLibraryTable";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const db = await checkDatabase();
  if (!db.ok) {
    return <SetupBanner message={db.message} />;
  }

  const recipes = await prisma.recipe.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="container">
      <h1>Recipe library</h1>
      <p className="muted">
        Change <strong>Cook for</strong> to scale ingredient amounts. When it
        differs from the recipe&apos;s base serves, two quantity columns appear.
      </p>
      <p>
        <Link href="/recipes">All</Link>
        {" · "}
        <Link href="/recipes?status=ready">Ready</Link>
        {" · "}
        <Link href="/recipes?status=processing">Processing</Link>
        {" · "}
        <Link href="/recipes?status=failed">Failed</Link>
      </p>
      <RecipeLibraryTable
        recipes={recipes.map((r) => ({
          id: r.id,
          name: r.name,
          servings: r.servings,
          sourceUrl: r.sourceUrl,
          sourceType: r.sourceType,
          status: r.status,
          ingredients: r.ingredients,
        }))}
      />
    </div>
  );
}
