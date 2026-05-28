import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export function getAdminCredentials() {
  const username = process.env.AUTH_USERNAME ?? process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) {
    throw new Error("AUTH_USERNAME and AUTH_PASSWORD must be set");
  }
  return { username, password };
}

export function adminEmailForUsername(username: string): string {
  return `${username.toLowerCase().replace(/\s+/g, "-")}@recipe-planner.admin`;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return session.user;
}
