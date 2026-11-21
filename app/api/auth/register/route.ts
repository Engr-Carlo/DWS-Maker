import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "@/lib/db";
import { hashPassword, issueVerificationToken, normalizeEmail } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const registration = z.object({
  email: z.email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  const parsed = registration.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and a password of at least 10 characters." }, { status: 400 });
  }

  await ensureSchema();
  const email = normalizeEmail(parsed.data.email);
  const sql = db();
  const rows = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${hashPassword(parsed.data.password)})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;
  const created = rows[0] as { id?: string } | undefined;
  if (!created?.id) {
    return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
  }

  try {
    const token = await issueVerificationToken(created.id);
    const appUrl = process.env.APP_URL || request.headers.get("origin") || new URL(request.url).origin;
    await sendVerificationEmail(email, `${appUrl}/verify?token=${encodeURIComponent(token)}`);
  } catch (error) {
    await sql`DELETE FROM users WHERE id = ${created.id} AND email_verified_at IS NULL`;
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
