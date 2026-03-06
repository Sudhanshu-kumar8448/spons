import { NextRequest, NextResponse } from "next/server";
import { findRouteRule } from "@/lib/route-config";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

function getDefaultPathForRole(role: string): string {
  const roleRedirects: Record<string, string> = {
    SPONSOR: "/brand/dashboard",
    ORGANIZER: "/organizer/dashboard",
    MANAGER: "/manager/dashboard",
    ADMIN: "/admin",
    SUPER_ADMIN: "/admin",
    USER: "/onboarding",
  };
  return roleRedirects[role] || "/login";
}

/**
 * Next.js Middleware – runs server-side on every matched request.
 * Performs stateless JWT verification using `jose` to avoid database hits.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = findRouteRule(pathname);

  // No protection rule ⇒ public route, let it through.
  if (!rule) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    return redirectToLogin(request, pathname);
  }

  try {
    if (!JWT_SECRET) {
      // Safety net: if secret is missing, fail closed
      console.error("JWT_ACCESS_SECRET is not defined in environment");
      return redirectToLogin(request, pathname);
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userRole = payload.role as string;

    // Non-USER roles should never see onboarding selection/forms.
    if (
      userRole !== "USER" &&
      (pathname === "/onboarding" || pathname.startsWith("/onboarding/"))
    ) {
      return NextResponse.redirect(new URL(getDefaultPathForRole(userRole), request.url));
    }

    // USER role users trying to access role-specific areas → redirect to /onboarding
    if (userRole === "USER") {
      const rolePrefixes = ["/brand", "/manager", "/organizer", "/admin"];
      const isRoleArea = rolePrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
      );
      if (isRoleArea) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }

    // Enforce role restriction (if any)
    if (rule.roles && rule.roles.length > 0) {
      if (!rule.roles.includes(userRole)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  } catch (error) {
    // Token invalid, expired, or verification failed ⇒ redirect to login
    return redirectToLogin(request, pathname);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, callbackPath: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", callbackPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
