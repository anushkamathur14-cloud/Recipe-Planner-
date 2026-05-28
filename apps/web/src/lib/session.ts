import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user?.id) throw new Error("Unauthorized");
  return user;
}
