import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "@/lib/db";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  await ensureSchema();
  const sql = db();
  const rows = await sql`
    SELECT id, password_hash, email_verified_at
    FROM users
    WHERE email = ${normalizeEmail(parsed.data.email)}
  `;
  const user = rows[0] as { id?: string; password_hash?: string; email_verified_at?: string | null } | undefined;
  if (!user?.id || !user.password_hash || !verifyPassword(parsed.data.password, user.password_hash)) {
    return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });
  }
  if (!user.email_verified_at) {
    return NextResponse.json({ error: "Verify your email before signing in." }, { status: 403 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
