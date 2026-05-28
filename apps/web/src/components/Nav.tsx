import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function Nav() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        Recipe Planner
      </Link>
      <Link href="/recipes">Recipes</Link>
      {isAdmin && (
        <>
          <Link href="/import/youtube">YouTube</Link>
          <Link href="/import/instagram">Instagram</Link>
        </>
      )}
      <Link href="/plan">Meal Plan</Link>
      {isAdmin && <Link href="/settings">Settings</Link>}
    </nav>
  );
}
