import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "@/lib/db";
import { issueVerificationCode, normalizeEmail } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const requestSchema = z.object({ email: z.email().max(254) });

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter the email used for registration." }, { status: 400 });

    await ensureSchema();
    const email = normalizeEmail(parsed.data.email);
    const sql = db();
    const rows = await sql`
      SELECT id, email_verified_at
      FROM users
      WHERE email = ${email}
    `;
    const user = rows[0] as { id?: string; email_verified_at?: string | null } | undefined;
    if (user?.id && !user.email_verified_at) {
      const code = await issueVerificationCode(user.id);
      await sendVerificationEmail(email, code);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verification resend failed:", error);
    return NextResponse.json({ error: "We could not send a new code. Please try again." }, { status: 503 });
  }
}
