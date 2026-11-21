import { neon } from "@neondatabase/serverless";

function databaseUrl() {
  const value = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

export function db() {
  return neon(databaseUrl());
}

let schemaPromise: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = initializeSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function initializeSchema() {
  const sql = db();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS user_schedules (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS verification_tokens_user_id_idx ON email_verification_tokens(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS reset_tokens_user_id_idx ON password_reset_tokens(user_id)`;
}
