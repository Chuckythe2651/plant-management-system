import { query, queryOne, pool } from '../config/database';
import { CareLog, CreateCareLogDto } from '../types';

export const CareLogModel = {
  async findAll(plantId?: number, limit = 50): Promise<CareLog[]> {
    if (plantId) {
      return query<CareLog>(
        'SELECT * FROM care_logs WHERE plant_id = $1 ORDER BY performed_at DESC LIMIT $2',
        [plantId, limit]
      );
    }
    return query<CareLog>(
      `SELECT cl.*, p.name AS plant_name
       FROM care_logs cl
       JOIN plants p ON p.id = cl.plant_id
       ORDER BY cl.performed_at DESC LIMIT $1`,
      [limit]
    );
  },

  async findById(id: number): Promise<CareLog | null> {
    return queryOne<CareLog>('SELECT * FROM care_logs WHERE id = $1', [id]);
  },

  async create(dto: CreateCareLogDto): Promise<CareLog> {
    const performedAt = dto.performed_at ? new Date(dto.performed_at) : new Date();

    // Wrap in a transaction so both the INSERT and the plant UPDATE
    // either both succeed or both roll back (fixes BUG-002).
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<CareLog>(
        `INSERT INTO care_logs (plant_id, care_type, notes, amount_ml, product_used, performed_at)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          dto.plant_id,
          dto.care_type,
          dto.notes ?? null,
          dto.amount_ml ?? null,
          dto.product_used ?? null,
          performedAt,
        ]
      );

      if (dto.care_type === 'watering') {
        // ::timestamptz cast ensures PostgreSQL can resolve the parameter type
        // when used in timestamp + interval arithmetic (fixes BUG-002).
        await client.query(
          `UPDATE plants SET
             last_watered_at  = $1::timestamptz,
             next_watering_at = $1::timestamptz + (watering_frequency_days * INTERVAL '1 day'),
             updated_at       = NOW()
           WHERE id = $2`,
          [performedAt, dto.plant_id]
        );
      }

      if (dto.care_type === 'fertilizing') {
        await client.query(
          `UPDATE plants SET last_fertilized_at = $1::timestamptz, updated_at = NOW() WHERE id = $2`,
          [performedAt, dto.plant_id]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    const rows = await query('DELETE FROM care_logs WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};
