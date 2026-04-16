import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedPrefixes = ["/dashboard", "/home", "/account", "/admin", "/manager", "/cart"];
const protectedImagePrefixes = ["/images/uploads/products"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isProtectedImage = protectedImagePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!hasSession && isProtectedImage) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  if (!hasSession && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/home/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/manager/:path*",
    "/cart/:path*",
    "/images/uploads/products/:path*"
  ]
};
