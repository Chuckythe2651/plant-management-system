import { Request, Response } from 'express';
import { SettingModel } from '../models/Setting';

export const mapsController = {
  async getFloorPlan(_req: Request, res: Response) {
    const settings = await SettingModel.getFullMap();
    const url = settings['maps.floor_plan_url'] || null;
    res.json({ success: true, data: { url } });
  },

  async uploadFloorPlan(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    await SettingModel.bulkUpsert({ 'maps.floor_plan_url': url });
    res.status(201).json({ success: true, data: { url } });
  },
};
