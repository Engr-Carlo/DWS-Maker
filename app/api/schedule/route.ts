import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { sanitizeState } from "@/lib/dws";

async function userId() {
  return (await getAuthenticatedUser())?.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  await ensureSchema();
  const sql = db();
  const rows = await sql`SELECT state FROM user_schedules WHERE user_id = ${id}`;
  return NextResponse.json({ state: (rows[0] as { state?: unknown } | undefined)?.state ?? null });
}

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { state?: unknown } | null;
  const state = sanitizeState(body?.state);
  if (!state) return NextResponse.json({ error: "The schedule data is invalid." }, { status: 400 });

  await ensureSchema();
  const sql = db();
  await sql`
    INSERT INTO user_schedules (user_id, state, updated_at)
    VALUES (${id}, ${JSON.stringify(state)}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET state = EXCLUDED.state, updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
