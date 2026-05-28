import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        Recipe Planner
      </Link>
      <Link href="/recipes">Recipes</Link>
      <Link href="/import/youtube">YouTube</Link>
      <Link href="/import/instagram">Instagram</Link>
      <Link href="/plan">Meal Plan</Link>
      <Link href="/settings">Settings</Link>
    </nav>
  );
}
