import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@recipe-planner/db";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const allowedEmail = process.env.AUTH_EMAIL;
      const allowedPassword = process.env.AUTH_PASSWORD;
      if (!allowedEmail || !allowedPassword) return null;

      if (
        credentials?.email?.toLowerCase() !== allowedEmail.toLowerCase() ||
        credentials?.password !== allowedPassword
      ) {
        return null;
      }

      let user = await prisma.user.findUnique({
        where: { email: allowedEmail.toLowerCase() },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: allowedEmail.toLowerCase(),
            name: allowedEmail.split("@")[0],
          },
        });
      }

      return { id: user.id, email: user.email, name: user.name };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
