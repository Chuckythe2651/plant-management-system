import { Request, Response } from 'express';
import { SettingModel } from '../models/Setting';
import { PlantKnowledgeModel } from '../models/PlantKnowledge';
import { searchPlants, getPlantDetail } from '../services/perenualService';
import { AppError } from '../middleware/errorHandler';

export const knowledgeController = {
  async search(req: Request, res: Response) {
    const q = req.query.q as string;
    if (!q) throw new AppError(400, 'Search query required');

    const settings = await SettingModel.getFullMap();
    const apiKey = settings['api.perenual_key'];

    const results = await searchPlants(apiKey, q);
    res.json({ success: true, data: results });
  },

  async getForPlant(req: Request, res: Response) {
    const knowledge = await PlantKnowledgeModel.findByPlant(Number(req.params.plantId));
    res.json({ success: true, data: knowledge });
  },

  async fetchAndCache(req: Request, res: Response) {
    const { plant_id, perenual_id } = req.body as { plant_id?: number; perenual_id: number };

    const settings = await SettingModel.getFullMap();
    const apiKey = settings['api.perenual_key'];

    const detail = await getPlantDetail(apiKey, perenual_id);
    if (!detail) throw new AppError(502, 'Could not fetch plant details from Perenual');

    const cached = await PlantKnowledgeModel.upsert({
      plant_id,
      source: 'perenual',
      external_id: String(perenual_id),
      slug: detail.common_name?.toLowerCase().replace(/\s+/g, '-'),
      data: detail as unknown as Record<string, unknown>,
    });

    res.json({ success: true, data: cached });
  },
};
