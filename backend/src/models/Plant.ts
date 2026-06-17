import { query, queryOne } from '../config/database';
import { Plant, CreatePlantDto, UpdatePlantDto } from '../types';

interface FindAllOptions {
  locationId?: number;
  limit?: number;
  plant_type?: string;
  health_status?: string;
  is_favorite?: boolean;
  search?: string;
}

function orNull<T>(v: T | null | undefined): T | null {
  if (v === null || v === undefined || v === '') return null;
  return v;
}

export const PlantModel = {
  async findAll(opts: FindAllOptions = {}): Promise<Plant[]> {
    const { locationId, limit, plant_type, health_status, is_favorite, search } = opts;
    const params: unknown[] = [];
    const conditions: string[] = [];

    let sql = `
      SELECT p.*,
             l.name AS location_name, l.type AS location_type
      FROM plants p
      LEFT JOIN locations l ON l.id = p.location_id
    `;

    if (locationId) {
      params.push(locationId);
      conditions.push(`p.location_id = $${params.length}`);
    }
    if (plant_type) {
      params.push(plant_type);
      conditions.push(`p.plant_type = $${params.length}`);
    }
    if (health_status) {
      params.push(health_status);
      conditions.push(`p.health_status = $${params.length}`);
    }
    if (is_favorite !== undefined) {
      params.push(is_favorite);
      conditions.push(`p.is_favorite = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(p.name ILIKE $${idx} OR p.common_name ILIKE $${idx} OR p.scientific_name ILIKE $${idx})`);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY p.name ASC';

    if (limit && limit > 0) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
    }

    return query<Plant>(sql, params);
  },

  async findById(id: number): Promise<Plant | null> {
    return queryOne<Plant>(
      `SELECT p.*, l.name AS location_name, l.type AS location_type
       FROM plants p
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE p.id = $1`,
      [id]
    );
  },

  async create(dto: CreatePlantDto): Promise<Plant> {
    const result = await queryOne<Plant>(
      `INSERT INTO plants
         (name, common_name, scientific_name, location_id, plant_type,
          health_status, watering_frequency_days, fertilizing_frequency_days,
          sunlight_requirement, temperature_min_f, temperature_max_f,
          notes, image_url, acquired_date, is_favorite,
          last_watered_at, next_watering_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, NOW(),
               NOW() + ($7::integer * INTERVAL '1 day'))
       RETURNING *`,
      [
        dto.name,
        orNull(dto.common_name),
        orNull(dto.scientific_name),
        orNull(dto.location_id),
        orNull(dto.plant_type),
        dto.health_status ?? 'good',
        dto.watering_frequency_days ?? 7,
        dto.fertilizing_frequency_days ?? 30,
        orNull(dto.sunlight_requirement),
        orNull(dto.temperature_min_f),
        orNull(dto.temperature_max_f),
        orNull(dto.notes),
        orNull(dto.image_url),
        orNull(dto.acquired_date),
        dto.is_favorite ?? false,
      ]
    );
    return result!;
  },

  async update(id: number, dto: UpdatePlantDto): Promise<Plant | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowed: (keyof UpdatePlantDto)[] = [
      'name','common_name','scientific_name','location_id','plant_type',
      'health_status','watering_frequency_days','fertilizing_frequency_days',
      'sunlight_requirement','temperature_min_f','temperature_max_f',
      'notes','image_url','acquired_date','is_favorite',
      'last_watered_at','next_watering_at','last_fertilized_at',
    ];

    const nullableFields = new Set<keyof UpdatePlantDto>([
      'common_name','scientific_name','location_id','plant_type',
      'sunlight_requirement','temperature_min_f','temperature_max_f',
      'notes','image_url','acquired_date','last_watered_at','next_watering_at','last_fertilized_at',
    ]);

    for (const key of allowed) {
      if (key in dto) {
        fields.push(`${key} = $${idx++}`);
        values.push(nullableFields.has(key) ? orNull(dto[key]) : dto[key]);
      }
    }

    if (!fields.length) return this.findById(id);

    values.push(id);
    return queryOne<Plant>(
      `UPDATE plants SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING *`,
      values
    );
  },

  async delete(id: number): Promise<boolean> {
    const rows = await query('DELETE FROM plants WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  async logWatering(id: number): Promise<Plant | null> {
    return queryOne<Plant>(
      `UPDATE plants SET
         last_watered_at = NOW(),
         next_watering_at = NOW() + (watering_frequency_days * INTERVAL '1 day'),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
  },

  async getDueSoon(withinDays = 3): Promise<Plant[]> {
    return query<Plant>(
      `SELECT p.*, l.name AS location_name
       FROM plants p
       LEFT JOIN locations l ON l.id = p.location_id
       WHERE next_watering_at <= NOW() + ($1::integer * INTERVAL '1 day')
       ORDER BY next_watering_at ASC`,
      [withinDays]
    );
  },
};
