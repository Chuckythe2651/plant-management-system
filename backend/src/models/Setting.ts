import { query, queryOne } from '../config/database';
import { Setting } from '../types';

export const SettingModel = {
  async findAll(): Promise<Setting[]> {
    return query<Setting>('SELECT * FROM settings ORDER BY category, key');
  },

  async findByCategory(category: string): Promise<Setting[]> {
    return query<Setting>('SELECT * FROM settings WHERE category = $1 ORDER BY key', [category]);
  },

  async findByKey(key: string): Promise<Setting | null> {
    return queryOne<Setting>('SELECT * FROM settings WHERE key = $1', [key]);
  },

  async getValue(key: string): Promise<string | null> {
    const row = await queryOne<Setting>('SELECT value FROM settings WHERE key = $1', [key]);
    return row?.value ?? null;
  },

  async upsert(key: string, value: string): Promise<Setting> {
    // Try UPDATE first (all settings are pre-seeded — this is the common path).
    // Avoids the "inconsistent types deduced for parameter $1" error that
    // occurs when the same parameter appears in both VALUES and a subquery
    // WHERE clause in a single INSERT ... ON CONFLICT statement (BUG-003).
    const updated = await queryOne<Setting>(
      `UPDATE settings SET value = $2, updated_at = NOW() WHERE key = $1 RETURNING *`,
      [key, value]
    );
    if (updated) return updated;

    // INSERT path: key doesn't exist yet — default category to 'preferences'.
    const inserted = await queryOne<Setting>(
      `INSERT INTO settings (key, value, category, updated_at)
       VALUES ($1, $2, 'preferences', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING *`,
      [key, value]
    );
    return inserted!;
  },

  async bulkUpsert(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.upsert(key, value);
    }
  },

  // Returns settings map suitable for frontend — omits secret values
  async getPublicMap(): Promise<Record<string, string>> {
    const rows = await query<Setting>(
      'SELECT key, value, is_secret FROM settings'
    );
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.is_secret && row.value ? '***' : (row.value ?? '');
    }
    return map;
  },

  // Returns full map including secret values (for backend use only)
  async getFullMap(): Promise<Record<string, string>> {
    const rows = await query<Setting>('SELECT key, value FROM settings');
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value ?? '';
    }
    return map;
  },
};
