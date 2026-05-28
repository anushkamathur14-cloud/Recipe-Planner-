import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Admin credentials — override with AUTH_USERNAME + AUTH_PASSWORD on Railway */
export function getAdminCredentials() {
  const username =
    process.env.AUTH_USERNAME?.trim() ||
    process.env.AUTH_EMAIL?.trim() ||
    "Admin-1";
  const password = process.env.AUTH_PASSWORD?.trim() || "Pwd-11";
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
