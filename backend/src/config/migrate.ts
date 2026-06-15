import fs from 'fs';
import path from 'path';
import { pool } from './database';

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? '/app/migrations';

export async function runMigrations(): Promise<void> {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('[migrate] No migrations directory found, skipping');
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] No migration files found');
    return;
  }

  const client = await pool.connect();
  try {
    // Ensure the tracking table exists (it's in init SQL, but guard anyway)
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations'
    );
    const applied = new Set(rows.map((r) => r.version));

    for (const file of files) {
      // Derive version key from filename: "003_features.sql" → "003_features"
      const version = path.basename(file, '.sql');
      if (applied.has(version)) {
        console.log(`[migrate] Already applied: ${version}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] Applying: ${version}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`[migrate] Applied: ${version}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${version} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    client.release();
  }
}
