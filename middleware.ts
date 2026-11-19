import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SESSION_COOKIE_NAME = "advos_admin_session";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "advertiseos-secure-admin-session-secret-2026";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/campaigns",
  "/catalog",
  "/calendar",
  "/crm",
  "/approvals",
  "/analytics",
  "/brand",
  "/autopilot",
  "/team",
  "/settings",
  "/voice",
  "/briefs",
];

// Edge-compatible HMAC-SHA256 validation
async function verifyEdgeToken(token: string): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    if (signature !== expectedSig) return false;

    // Check expiration
    const payloadStr = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr);
    if (!payload.exp || Date.now() / 1000 > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets & api routes bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/icon") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 1. Check custom admin session token
  const adminCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (adminCookie) {
    isAuthenticated = await verifyEdgeToken(adminCookie);
  }

  // 2. Check Supabase auth session if available
  if (!isAuthenticated && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const res = NextResponse.next();
      const sb = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll: () => req.cookies.getAll(),
            setAll: (toSet: Array<{ name: string; value: string; options?: object }>) => {
              toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options as never));
            },
          },
        }
      );
      const { data } = await sb.auth.getUser();
      if (data?.user) {
        isAuthenticated = true;
      }
    } catch {
      // ignore
    }
  }

  // Route: /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes check
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|embed.js).*)"],
};
