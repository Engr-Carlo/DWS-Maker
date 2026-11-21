import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, normalizeEmail, verifyEmailCode } from "@/lib/auth";

const verification = z.object({ email: z.email(), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  const parsed = verification.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the six-digit code from your email." }, { status: 400 });

  const userId = await verifyEmailCode(normalizeEmail(parsed.data.email), parsed.data.code);
  if (!userId) {
    return NextResponse.json({ error: "The code is incorrect or has expired." }, { status: 400 });
  }

  await createSession(userId);
  return NextResponse.json({ ok: true });
}
