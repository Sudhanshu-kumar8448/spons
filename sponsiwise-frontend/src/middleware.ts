import { NextRequest, NextResponse } from "next/server";
import { findRouteRule } from "@/lib/route-config";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

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

    // USER role users trying to access /dashboard → redirect to /onboarding
    if (
      userRole === "USER" &&
      (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
    ) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
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
