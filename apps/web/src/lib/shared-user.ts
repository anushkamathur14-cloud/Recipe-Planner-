import { prisma } from "@recipe-planner/db";
import { adminEmailForUsername, getAdminCredentials } from "./admin";

/** Shared library owner — recipes & meal plans are public under this user. */
export async function getSharedOwnerUserId(): Promise<string> {
  const { username } = getAdminCredentials();
  const email = adminEmailForUsername(username);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: username },
    });
  }
  return user.id;
}
