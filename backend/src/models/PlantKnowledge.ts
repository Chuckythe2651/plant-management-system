import { query, queryOne } from '../config/database';
import { PlantKnowledge } from '../types';

export const PlantKnowledgeModel = {
  async findByPlant(plantId: number): Promise<PlantKnowledge[]> {
    return query<PlantKnowledge>(
      'SELECT * FROM plant_knowledge WHERE plant_id = $1 ORDER BY fetched_at DESC',
      [plantId]
    );
  },

  async findByExternalId(source: string, externalId: string): Promise<PlantKnowledge | null> {
    return queryOne<PlantKnowledge>(
      'SELECT * FROM plant_knowledge WHERE source = $1 AND external_id = $2',
      [source, externalId]
    );
  },

  async upsert(data: {
    plant_id?: number;
    source: string;
    external_id?: string;
    slug?: string;
    data: Record<string, unknown>;
  }): Promise<PlantKnowledge> {
    const result = await queryOne<PlantKnowledge>(
      `INSERT INTO plant_knowledge (plant_id, source, external_id, slug, data, fetched_at)
       VALUES ($1,$2,$3,$4,$5, NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        data.plant_id ?? null,
        data.source,
        data.external_id ?? null,
        data.slug ?? null,
        JSON.stringify(data.data),
      ]
    );
    return result!;
  },
};
