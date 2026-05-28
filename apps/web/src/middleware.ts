export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/import/:path*",
    "/settings/:path*",
    "/api/import/:path*",
    "/api/ig-threads/:path*",
    "/api/recipes/:id/retry",
    "/api/chat/:path*",
  ],
};
