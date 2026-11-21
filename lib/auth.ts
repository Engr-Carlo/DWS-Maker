import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db, ensureSchema } from "./db";

export const SESSION_COOKIE = "dws_session";
const SESSION_DAYS = 30;
const VERIFY_MINUTES = 15;

export interface AuthUser {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  approvedAt: Date | null;
  isAdmin: boolean;
}

export function isAdminEmail(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(adminEmail && normalizeEmail(email) === adminEmail);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actualBuffer = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "base64url");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function digestSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function digestVerificationToken(token: string) {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) throw new Error("EMAIL_VERIFICATION_SECRET is not configured");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function issueVerificationCode(userId: string) {
  await ensureSchema();
  const code = String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
  const expiresAt = new Date(Date.now() + VERIFY_MINUTES * 60 * 1000);
  const sql = db();
  await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO email_verification_tokens (token_hash, user_id, expires_at)
    VALUES (${digestVerificationToken(code)}, ${userId}, ${expiresAt.toISOString()})
  `;
  return code;
}

export async function verifyEmailCode(email: string, code: string) {
  await ensureSchema();
  const sql = db();
  const rows = await sql`
    DELETE FROM email_verification_tokens t
    USING users u
    WHERE t.user_id = u.id
      AND u.email = ${email}
      AND t.token_hash = ${digestVerificationToken(code)}
      AND t.expires_at > NOW()
    RETURNING t.user_id
  `;
  const row = rows[0] as { user_id?: string } | undefined;
  if (!row?.user_id) return null;
  await sql`
    UPDATE users
    SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
    WHERE id = ${row.user_id}
  `;
  return row.user_id;
}

export async function issuePasswordResetCode(userId: string) {
  await ensureSchema();
  const code = String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
  const expiresAt = new Date(Date.now() + VERIFY_MINUTES * 60 * 1000);
  const sql = db();
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
    VALUES (${digestVerificationToken(code)}, ${userId}, ${expiresAt.toISOString()})
  `;
  return code;
}

export async function resetPassword(email: string, code: string, password: string) {
  await ensureSchema();
  const sql = db();
  const rows = await sql`
    DELETE FROM password_reset_tokens t
    USING users u
    WHERE t.user_id = u.id
      AND u.email = ${email}
      AND t.token_hash = ${digestVerificationToken(code)}
      AND t.expires_at > NOW()
    RETURNING t.user_id
  `;
  const row = rows[0] as { user_id?: string } | undefined;
  if (!row?.user_id) return false;

  await sql`
    UPDATE users
    SET password_hash = ${hashPassword(password)}, updated_at = NOW()
    WHERE id = ${row.user_id}
  `;
  await sql`DELETE FROM sessions WHERE user_id = ${row.user_id}`;
  return true;
}

export async function createSession(userId: string) {
  await ensureSchema();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const sql = db();
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${digestSessionToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await ensureSchema();
    const sql = db();
    await sql`DELETE FROM sessions WHERE token_hash = ${digestSessionToken(token)}`;
  }
  jar.delete(SESSION_COOKIE);
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureSchema();
  const sql = db();
  const rows = await sql`
    SELECT u.id, u.email, u.email_verified_at, u.approved_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${digestSessionToken(token)}
      AND s.expires_at > NOW()
      AND u.email_verified_at IS NOT NULL
  `;
  const row = rows[0] as { id?: string; email?: string; email_verified_at?: string | null; approved_at?: string | null } | undefined;
  if (!row?.id || !row.email) return null;
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    isAdmin: isAdminEmail(row.email),
  };
}
