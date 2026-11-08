import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Edge Middleware for TiBoutik Admin Web
 * Enforces strict role-based access control before pages render.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminSession = request.cookies.get("admin_session")?.value;
  const isAuthenticated = adminSession === "active";

  // Public / Auth routes
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";

  // Prevent any access to register (admin registration is disabled)
  if (isRegisterPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If already authenticated and accessing login or root, redirect to dashboard
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If on login page and not authenticated, allow access
  if (isLoginPage) {
    return NextResponse.next();
  }

  // Root route "/"
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // All other routes are protected administrative pages
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions (.png, .jpg, .jpeg, .svg, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
