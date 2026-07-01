import type { NextRequest } from "next/server";

/**
 * Same-origin check for browser-initiated, cookie/JSON POST requests.
 * PayFast's IPN callback is server-to-server (no browser origin header) and
 * is intentionally excluded from this check by the caller.
 */
export function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, server-to-server) don't send Origin

  try {
    const originHost = new URL(origin).host;
    return originHost === request.nextUrl.host;
  } catch {
    return false;
  }
}
