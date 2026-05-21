import { NextRequest } from "next/server";
import { findOrCreateUser, setUserCookie } from "../../../lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/pseudo-login { email, role }
export async function POST(req: NextRequest) {
  const { email, role } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
  }
  const user = await findOrCreateUser();
  const res = new Response(JSON.stringify({ id: user.id, email: user.email, role: user.role }));
  setUserCookie();
  return res;
}
