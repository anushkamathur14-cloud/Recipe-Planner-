import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@recipe-planner/db";
import { adminEmailForUsername, getAdminCredentials } from "./admin";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Admin",
      credentials: {
        username: { label: "Name", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const inputUsername = credentials?.username?.trim() ?? "";
        const inputPassword = credentials?.password ?? "";
        const { username: allowedUsername, password: allowedPassword } =
          getAdminCredentials();

        if (
          inputUsername !== allowedUsername ||
          inputPassword !== allowedPassword
        ) {
          console.warn(
            "[auth] Login rejected for username:",
            inputUsername
          );
          return null;
        }

        const email = adminEmailForUsername(allowedUsername);

        try {
          let user = await prisma.user.findUnique({ where: { email } });

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: allowedUsername,
              },
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: "admin" as const,
          };
        } catch (err) {
          console.error("[auth] Database error during login:", err);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "admin" | "user" }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "admin" | "user") ?? "user";
      }
      return session;
    },
  },
};
