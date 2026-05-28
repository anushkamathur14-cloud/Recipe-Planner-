import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NavAuth } from "./NavAuth";

export async function Nav() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "admin";

  return (
    <nav className="nav">
      <div className="nav-links">
        <Link href="/" className="brand">
          Recipe Planner
        </Link>
        <Link href="/recipes">Recipes</Link>
        <Link href="/plan">Meal Plan</Link>
        {isAdmin && (
          <>
            <Link href="/import/youtube">YouTube</Link>
            <Link href="/import/instagram">IG / Facebook</Link>
            <Link href="/settings">Settings</Link>
          </>
        )}
        {!isAdmin && <Link href="/login">Admin</Link>}
      </div>
      <NavAuth isAdmin={isAdmin} userName={session?.user?.name} />
    </nav>
  );
}
