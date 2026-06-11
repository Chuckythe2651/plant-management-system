import { query, queryOne } from '../config/database';
import { Sensor, CreateSensorDto } from '../types';

export const SensorModel = {
  async findAll(locationId?: number): Promise<Sensor[]> {
    if (locationId !== undefined) {
      return query<Sensor>(
        'SELECT * FROM sensors WHERE location_id = $1 ORDER BY name ASC',
        [locationId]
      );
    }
    return query<Sensor>('SELECT * FROM sensors ORDER BY name ASC');
  },

  async findById(id: number): Promise<Sensor | null> {
    return queryOne<Sensor>('SELECT * FROM sensors WHERE id = $1', [id]);
  },

  async create(dto: CreateSensorDto): Promise<Sensor> {
    const result = await queryOne<Sensor>(
      `INSERT INTO sensors (location_id, name, sensor_type, ha_entity_id, unit)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [dto.location_id ?? null, dto.name, dto.sensor_type, dto.ha_entity_id, dto.unit ?? null]
    );
    return result!;
  },

  async update(id: number, dto: Partial<CreateSensorDto>): Promise<Sensor | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const allowed: (keyof CreateSensorDto)[] = ['location_id', 'name', 'sensor_type', 'ha_entity_id', 'unit'];
    for (const key of allowed) {
      if (key in dto) {
        fields.push(`${key} = $${idx++}`);
        values.push(dto[key]);
      }
    }
    if (!fields.length) return this.findById(id);
    values.push(id);
    return queryOne<Sensor>(
      `UPDATE sensors SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );
  },

  async updateReading(id: number, value: number, unit: string, recordedAt: string): Promise<Sensor | null> {
    return queryOne<Sensor>(
      `UPDATE sensors SET last_value = $1, unit = $2, last_reading_at = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [value, unit, recordedAt, id]
    );
  },

  async delete(id: number): Promise<boolean> {
    const rows = await query('DELETE FROM sensors WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};
