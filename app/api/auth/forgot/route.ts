import { NextResponse } from "next/server";
import { z } from "zod";
import { db, ensureSchema } from "@/lib/db";
import { issuePasswordResetCode, normalizeEmail } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const requestSchema = z.object({ email: z.email().max(254) });

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    await ensureSchema();
    const email = normalizeEmail(parsed.data.email);
    const sql = db();
    const rows = await sql`SELECT id FROM users WHERE email = ${email} AND email_verified_at IS NOT NULL`;
    const user = rows[0] as { id?: string } | undefined;
    if (user?.id) {
      const code = await issuePasswordResetCode(user.id);
      await sendPasswordResetEmail(email, code);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json({ error: "We could not send the reset code. Please try again." }, { status: 503 });
  }
}
