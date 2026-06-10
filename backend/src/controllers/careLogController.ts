import { Request, Response } from 'express';
import { CareLogModel } from '../models/CareLog';
import { AppError } from '../middleware/errorHandler';

export const careLogController = {
  async list(req: Request, res: Response) {
    const plantId = req.query.plant_id ? Number(req.query.plant_id) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const logs = await CareLogModel.findAll(plantId, limit);
    res.json({ success: true, data: logs });
  },

  async create(req: Request, res: Response) {
    const log = await CareLogModel.create(req.body);
    res.status(201).json({ success: true, data: log });
  },

  async delete(req: Request, res: Response) {
    const deleted = await CareLogModel.delete(Number(req.params.id));
    if (!deleted) throw new AppError(404, 'Care log not found');
    res.json({ success: true, message: 'Care log deleted' });
  },
};
