import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// A handful of routes are reachable without a session: individual entry
// pages and their photos decide public-vs-private themselves based on the
// entry's isPublic flag (so /entries/<id> must be reachable to check that —
// just not /entries/new or /entries/<id>/edit, which stay auth-only), and a
// user's public map is always public by design.
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/u/")) return true;
  if (pathname.startsWith("/api/images/")) return true;
  const entryDetailMatch = /^\/entries\/([^/]+)$/.exec(pathname);
  if (entryDetailMatch && entryDetailMatch[1] !== "new") return true;
  return false;
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return;
  }

  if (!isLoggedIn && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
