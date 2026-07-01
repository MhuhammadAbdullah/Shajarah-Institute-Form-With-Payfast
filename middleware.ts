import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth/session";
import { applySecurityHeaders } from "@/middleware/security-headers";
import { isTrustedOrigin } from "@/middleware/csrf";

const ADMIN_LOGIN_PATH = "/admin/login";

// PayFast calls this server-to-server; it must never be subject to the
// same-origin check applied to browser-facing API routes.
const CSRF_EXEMPT_PATHS = ["/api/payfast/ipn"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    request.method === "POST" &&
    pathname.startsWith("/api/") &&
    !CSRF_EXEMPT_PATHS.includes(pathname) &&
    !isTrustedOrigin(request)
  ) {
    return applySecurityHeaders(NextResponse.json({ success: false, error: "Invalid origin" }, { status: 403 }));
  }

  const isProtectedAdminPage = pathname.startsWith("/admin") && pathname !== ADMIN_LOGIN_PATH;
  const isProtectedAdminApi = pathname.startsWith("/api/admin");

  if (isProtectedAdminPage || isProtectedAdminApi) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const session = token ? await verifyAdminSessionToken(token) : null;

    if (!session) {
      if (isProtectedAdminApi) {
        return applySecurityHeaders(NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }));
      }
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
