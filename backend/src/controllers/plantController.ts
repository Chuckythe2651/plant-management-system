import { Request, Response } from 'express';
import { PlantModel } from '../models/Plant';
import { SettingModel } from '../models/Setting';
import { lookupScientificName } from '../services/scientificNameService';
import { AppError } from '../middleware/errorHandler';

export const plantController = {
  async list(req: Request, res: Response) {
    const locationId = req.query.location_id ? Number(req.query.location_id) : undefined;
    const limit      = req.query.limit       ? Number(req.query.limit)       : undefined;
    const plant_type    = req.query.plant_type    as string | undefined;
    const health_status = req.query.health_status as string | undefined;
    const search        = req.query.search        as string | undefined;
    const is_favorite   = req.query.is_favorite !== undefined
      ? req.query.is_favorite === 'true'
      : undefined;

    const plants = await PlantModel.findAll({ locationId, limit, plant_type, health_status, is_favorite, search });
    res.json({ success: true, data: plants });
  },

  async getById(req: Request, res: Response) {
    const plant = await PlantModel.findById(Number(req.params.id));
    if (!plant) throw new AppError(404, 'Plant not found');
    res.json({ success: true, data: plant });
  },

  async create(req: Request, res: Response) {
    const plant = await PlantModel.create(req.body);

    let finalPlant = plant;
    if (!plant.scientific_name && plant.name) {
      try {
        const settings = await SettingModel.getFullMap();
        const sciName = await lookupScientificName(plant.name, settings);
        if (sciName) {
          finalPlant = (await PlantModel.update(plant.id, { scientific_name: sciName })) ?? plant;
        }
      } catch {
        // non-fatal — plant was created, scientific name lookup failed
      }
    }

    res.status(201).json({ success: true, data: finalPlant });
  },

  async update(req: Request, res: Response) {
    const plant = await PlantModel.update(Number(req.params.id), req.body);
    if (!plant) throw new AppError(404, 'Plant not found');
    res.json({ success: true, data: plant });
  },

  async delete(req: Request, res: Response) {
    const deleted = await PlantModel.delete(Number(req.params.id));
    if (!deleted) throw new AppError(404, 'Plant not found');
    res.json({ success: true, message: 'Plant deleted' });
  },

  async water(req: Request, res: Response) {
    const plant = await PlantModel.logWatering(Number(req.params.id));
    if (!plant) throw new AppError(404, 'Plant not found');
    res.json({ success: true, data: plant, message: 'Watering logged' });
  },

  async dueSoon(req: Request, res: Response) {
    const days = req.query.days ? Number(req.query.days) : 3;
    const plants = await PlantModel.getDueSoon(days);
    res.json({ success: true, data: plants });
  },
};
