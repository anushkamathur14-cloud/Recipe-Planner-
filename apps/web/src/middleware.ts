export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/recipes/:path*",
    "/import/:path*",
    "/plan/:path*",
    "/settings/:path*",
    "/api/import/:path*",
    "/api/recipes/:path*",
    "/api/meal-plans/:path*",
    "/api/ig-threads/:path*",
    "/api/chat/:path*",
  ],
};
