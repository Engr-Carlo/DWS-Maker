import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "@/lib/db";
import { hashPassword, issueVerificationCode, normalizeEmail } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const registration = z.object({
  email: z.email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
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
      const code = await issueVerificationCode(created.id);
      await sendVerificationEmail(email, code);
    } catch (error) {
      await sql`DELETE FROM users WHERE id = ${created.id} AND email_verified_at IS NULL`;
      throw error;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    const message = error instanceof Error ? error.message : "";
    const configurationMissing = /not configured/i.test(message);
    return NextResponse.json(
      { error: configurationMissing ? "Account service is not fully configured yet. Please try again after deployment is complete." : "We could not create the account or send the verification email. Please try again." },
      { status: 503 },
    );
  }
}
