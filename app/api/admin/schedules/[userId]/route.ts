import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

const paramsSchema = z.object({ userId: z.uuid() });

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const admin = await getAuthenticatedUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid user." }, { status: 400 });

  await ensureSchema();
  const sql = db();
  const rows = await sql`
    SELECT u.email, s.state, s.updated_at
    FROM users u
    JOIN user_schedules s ON s.user_id = u.id
    WHERE u.id = ${parsed.data.userId}
  `;
  const row = rows[0] as { email?: string; state?: unknown; updated_at?: string } | undefined;
  if (!row?.state) return NextResponse.json({ error: "This user has not saved a schedule." }, { status: 404 });

  return NextResponse.json({
    email: row.email,
    updatedAt: row.updated_at,
    state: row.state,
  });
}
