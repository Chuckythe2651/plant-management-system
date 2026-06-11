import { Request, Response } from 'express';
import { LocationModel } from '../models/Location';
import { AppError } from '../middleware/errorHandler';

export const locationController = {
  async list(_req: Request, res: Response) {
    const locations = await LocationModel.findAll();
    res.json({ success: true, data: locations });
  },

  async tree(_req: Request, res: Response) {
    const tree = await LocationModel.findTree();
    res.json({ success: true, data: tree });
  },

  async getById(req: Request, res: Response) {
    const location = await LocationModel.findById(Number(req.params.id));
    if (!location) throw new AppError(404, 'Location not found');
    res.json({ success: true, data: location });
  },

  async create(req: Request, res: Response) {
    const location = await LocationModel.create(req.body);
    res.status(201).json({ success: true, data: location });
  },

  async update(req: Request, res: Response) {
    const location = await LocationModel.update(Number(req.params.id), req.body);
    if (!location) throw new AppError(404, 'Location not found');
    res.json({ success: true, data: location });
  },

  async delete(req: Request, res: Response) {
    const deleted = await LocationModel.delete(Number(req.params.id));
    if (!deleted) throw new AppError(404, 'Location not found');
    res.json({ success: true, message: 'Location deleted' });
  },
};
