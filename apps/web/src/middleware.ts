import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

function needsAdmin(pathname: string): boolean {
  return (
    pathname.startsWith("/import") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/import") ||
    pathname.startsWith("/api/ig-threads") ||
    pathname.startsWith("/api/chat") ||
    /^\/api\/recipes\/[^/]+\/retry$/.test(pathname)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: getAuthSecret(),
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (needsAdmin(pathname) && token.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  return res;
}

export const config = {
  matcher: [
    "/import/:path*",
    "/settings/:path*",
    "/api/import/:path*",
    "/api/ig-threads/:path*",
    "/api/recipes/:path*/retry",
    "/api/chat/:path*",
  ],
};
