import { query, queryOne } from '../config/database';
import { Location, CreateLocationDto } from '../types';

export const LocationModel = {
  async findAll(): Promise<Location[]> {
    return query<Location>('SELECT * FROM locations ORDER BY is_default DESC, name ASC');
  },

  async findById(id: number): Promise<Location | null> {
    return queryOne<Location>('SELECT * FROM locations WHERE id = $1', [id]);
  },

  async create(dto: CreateLocationDto): Promise<Location> {
    if (dto.is_default) {
      await query('UPDATE locations SET is_default = FALSE');
    }
    const result = await queryOne<Location>(
      `INSERT INTO locations (name, type, description, city, state, zip_code, latitude, longitude, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        dto.name,
        dto.type,
        dto.description ?? null,
        dto.city ?? 'Chandler',
        dto.state ?? 'AZ',
        dto.zip_code ?? '85224',
        dto.latitude ?? 33.3062,
        dto.longitude ?? -111.8413,
        dto.is_default ?? false,
      ]
    );
    return result!;
  },

  async update(id: number, dto: Partial<CreateLocationDto>): Promise<Location | null> {
    if (dto.is_default) {
      await query('UPDATE locations SET is_default = FALSE WHERE id != $1', [id]);
    }
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    const allowed: (keyof CreateLocationDto)[] = [
      'name','type','description','city','state','zip_code','latitude','longitude','is_default',
    ];
    for (const key of allowed) {
      if (key in dto) {
        fields.push(`${key} = $${idx++}`);
        values.push(dto[key]);
      }
    }
    if (!fields.length) return this.findById(id);
    values.push(id);
    return queryOne<Location>(
      `UPDATE locations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    );
  },

  async delete(id: number): Promise<boolean> {
    const rows = await query('DELETE FROM locations WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  async getDefault(): Promise<Location | null> {
    return queryOne<Location>('SELECT * FROM locations WHERE is_default = TRUE LIMIT 1');
  },
};
