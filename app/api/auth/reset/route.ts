import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeEmail, resetPassword } from "@/lib/auth";

const resetSchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    const parsed = resetSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter the six-digit code and a password of at least 10 characters." }, { status: 400 });
    }
    const reset = await resetPassword(normalizeEmail(parsed.data.email), parsed.data.code, parsed.data.password);
    if (!reset) return NextResponse.json({ error: "The reset code is incorrect or has expired." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "We could not reset your password. Please try again." }, { status: 503 });
  }
}
