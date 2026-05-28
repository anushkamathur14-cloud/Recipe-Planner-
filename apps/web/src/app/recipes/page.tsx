import Link from "next/link";
import { prisma } from "@recipe-planner/db";
import { StatusBadge } from "@/components/StatusBadge";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const recipes = await prisma.recipe.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="container">
      <h1>Recipe library</h1>
      <p>
        <Link href="/recipes">All</Link>
        {" · "}
        <Link href="/recipes?status=ready">Ready</Link>
        {" · "}
        <Link href="/recipes?status=processing">Processing</Link>
        {" · "}
        <Link href="/recipes?status=failed">Failed</Link>
      </p>
      {recipes.length === 0 ? (
        <p className="muted">No recipes yet.</p>
      ) : (
        <table className="table card">
          <thead>
            <tr>
              <th>Name</th>
              <th>Servings</th>
              <th>Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/recipes/${r.id}`}>{r.name}</Link>
                </td>
                <td>{r.servings}</td>
                <td>
                  <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                    {r.sourceType}
                  </a>
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
