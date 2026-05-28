import Link from "next/link";
import { prisma } from "@recipe-planner/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) redirect("/login");
  const isAdmin = user.role === "admin";

  const [recipes, jobs] = await Promise.all([
    prisma.recipe.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.importJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { recipe: { select: { name: true } } },
    }),
  ]);

  const stats = {
    total: await prisma.recipe.count({ where: { userId: user.id } }),
    ready: await prisma.recipe.count({
      where: { userId: user.id, status: "ready" },
    }),
    processing: await prisma.recipe.count({
      where: { userId: user.id, status: { in: ["pending", "processing"] } },
    }),
  };

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p className="muted">Welcome back{user.name ? `, ${user.name}` : ""}.</p>

      <div className="grid-2">
        <div className="card">
          <h3>Library</h3>
          <p>
            <strong>{stats.total}</strong> recipes · {stats.ready} ready ·{" "}
            {stats.processing} in progress
          </p>
          <Link href="/recipes" className="btn">
            View all recipes
          </Link>
        </div>
        {isAdmin && (
          <div className="card">
            <h3>Quick import (admin)</h3>
            <p className="muted">
              Paste YouTube or Instagram links to transcribe.
            </p>
            <Link href="/import/youtube" className="btn" style={{ marginRight: 8 }}>
              YouTube
            </Link>
            <Link href="/import/instagram" className="btn btn-secondary">
              Instagram
            </Link>
          </div>
        )}
      </div>

      <h2>Recent recipes</h2>
      {recipes.length === 0 ? (
        <p className="muted">No recipes yet. Import your first video.</p>
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

      <h2>Recent import jobs</h2>
      {jobs.length === 0 ? (
        <p className="muted">No import jobs yet.</p>
      ) : (
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
      )}
    </div>
  );
}
