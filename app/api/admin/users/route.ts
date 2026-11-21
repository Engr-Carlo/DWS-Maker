import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

async function requireAdmin() {
  const user = await getAuthenticatedUser();
  return user?.isAdmin ? user : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  await ensureSchema();
  const sql = db();
  const rows = await sql`
    SELECT
      u.id,
      u.email,
      u.email_verified_at,
      u.approved_at,
      u.created_at,
      s.updated_at AS schedule_updated_at,
      s.state IS NOT NULL AS has_schedule
    FROM users u
    LEFT JOIN user_schedules s ON s.user_id = u.id
    ORDER BY u.created_at DESC
  `;
  return NextResponse.json({
    users: rows.map((row) => {
      const user = row as {
        id: string;
        email: string;
        email_verified_at: string | null;
        approved_at: string | null;
        created_at: string;
        schedule_updated_at: string | null;
        has_schedule: boolean;
      };
      return {
        id: user.id,
        email: user.email,
        verified: Boolean(user.email_verified_at),
        approved: Boolean(user.approved_at),
        createdAt: user.created_at,
        scheduleUpdatedAt: user.schedule_updated_at,
        hasSchedule: user.has_schedule,
      };
    }),
  });
}

const approval = z.object({
  userId: z.uuid(),
  approved: z.boolean(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const parsed = approval.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval request." }, { status: 400 });

  await ensureSchema();
  const sql = db();
  await sql`
    UPDATE users
    SET
      approved_at = CASE WHEN ${parsed.data.approved} THEN COALESCE(approved_at, NOW()) ELSE NULL END,
      approved_by = CASE WHEN ${parsed.data.approved} THEN ${admin.id}::uuid ELSE NULL END,
      updated_at = NOW()
    WHERE id = ${parsed.data.userId} AND email_verified_at IS NOT NULL
  `;
  return NextResponse.json({ ok: true });
}
