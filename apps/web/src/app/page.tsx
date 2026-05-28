import Link from "next/link";
import { prisma } from "@recipe-planner/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";

  const [recipes, stats] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    Promise.all([
      prisma.recipe.count(),
      prisma.recipe.count({ where: { status: "ready" } }),
      prisma.recipe.count({
        where: { status: { in: ["pending", "processing"] } },
      }),
    ]),
  ]);

  const jobs = isAdmin
    ? await prisma.importJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { recipe: { select: { name: true } } },
      })
    : [];

  return (
    <div className="container">
      <h1>Recipe Planner</h1>
      <p className="muted">
        Browse recipes and plan your week.{" "}
        {isAdmin ? (
          <>You are signed in as admin — you can import videos.</>
        ) : (
          <>
            <Link href="/login">Admin sign in</Link> to import & transcribe
            videos.
          </>
        )}
      </p>

      <div className="grid-2">
        <div className="card">
          <h3>Library</h3>
          <p>
            <strong>{stats[0]}</strong> recipes · {stats[1]} ready ·{" "}
            {stats[2]} in progress
          </p>
          <Link href="/recipes" className="btn">
            View all recipes
          </Link>
        </div>
        <div className="card">
          <h3>Weekly plan</h3>
          <p className="muted">Build a meal plan and shopping list.</p>
          <Link href="/plan" className="btn">
            Open meal planner
          </Link>
        </div>
      </div>

      {isAdmin && (
        <div className="card">
          <h3>Quick import (admin)</h3>
          <Link href="/import/youtube" className="btn" style={{ marginRight: 8 }}>
            YouTube
          </Link>
          <Link href="/import/instagram" className="btn btn-secondary">
            Instagram
          </Link>
        </div>
      )}

      <h2>Recent recipes</h2>
      {recipes.length === 0 ? (
        <p className="muted">No recipes yet.</p>
      ) : (
        <table className="table card">
          <thead>
            <tr>
              <th>Name</th>
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
                <td>{r.sourceType}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isAdmin && jobs.length > 0 && (
        <>
          <h2>Recent import jobs</h2>
          <table className="table card">
            <thead>
              <tr>
                <th>Recipe</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.recipe?.name ?? j.sourceUrl?.slice(0, 40)}</td>
                  <td className="muted">{j.progress ?? "—"}</td>
                  <td>
                    <StatusBadge status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
