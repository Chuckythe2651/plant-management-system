import { query, queryOne } from '../config/database';
import { LLMInteraction } from '../types';

export const LlmInteractionModel = {
  async findAll(plantId?: number, limit = 50): Promise<LLMInteraction[]> {
    if (plantId) {
      return query<LLMInteraction>(
        'SELECT * FROM llm_interactions WHERE plant_id = $1 ORDER BY created_at DESC LIMIT $2',
        [plantId, limit]
      );
    }
    return query<LLMInteraction>(
      `SELECT li.*, p.name AS plant_name
       FROM llm_interactions li
       LEFT JOIN plants p ON p.id = li.plant_id
       ORDER BY li.created_at DESC LIMIT $1`,
      [limit]
    );
  },

  async create(data: {
    plant_id?: number;
    llm_provider: string;
    llm_model?: string;
    prompt_type: string;
    user_input?: string;
    image_url?: string;
    response?: string;
    structured?: Record<string, unknown>;
    tokens_used?: number;
    cost_estimate?: number;
    duration_ms?: number;
  }): Promise<LLMInteraction> {
    const result = await queryOne<LLMInteraction>(
      `INSERT INTO llm_interactions
         (plant_id, llm_provider, llm_model, prompt_type, user_input,
          image_url, response, structured, tokens_used, cost_estimate, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        data.plant_id ?? null,
        data.llm_provider,
        data.llm_model ?? null,
        data.prompt_type,
        data.user_input ?? null,
        data.image_url ?? null,
        data.response ?? null,
        data.structured ? JSON.stringify(data.structured) : null,
        data.tokens_used ?? null,
        data.cost_estimate ?? null,
        data.duration_ms ?? null,
      ]
    );
    return result!;
  },
};
