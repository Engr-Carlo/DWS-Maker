import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyEmailToken } from "@/lib/auth";

const verification = z.object({ token: z.string().min(20).max(200) });

export async function POST(request: Request) {
  const parsed = verification.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });

  const userId = await verifyEmailToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
  }

  await createSession(userId);
  return NextResponse.json({ ok: true });
}
