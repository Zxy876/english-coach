import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Per Tech Spec §7: no auth beyond a dev-mode cookie. A random UUID is set on
// first visit to any student route so the session record has something to
// attribute activity to. The cookie is NOT httpOnly — the dashboard may want
// to read it client-side.
const COOKIE = "english_coach_student_id";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(COOKIE)) {
    res.cookies.set(COOKIE, crypto.randomUUID(), {
      path: "/",
      sameSite: "lax",
    });
  }
  return res;
}

export const config = {
  matcher: [
    "/lessons/:path*",
    "/lessons",
    "/author/:path*",
    "/author",
    "/exercises/:path*",
    "/exercises",
    "/sessions/:path*",
    "/sessions",
    "/live",
    "/live/:path*",
    "/reasoning/:path*",
    "/cohort/:path*",
    "/cohorts",
  ],
};
