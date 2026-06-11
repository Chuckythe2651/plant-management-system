import { Request, Response } from 'express';
import { SensorModel } from '../models/Sensor';
import { SettingModel } from '../models/Setting';
import { AppError } from '../middleware/errorHandler';
import { fetchHASensorReading } from '../services/homeAssistantService';

export const sensorController = {
  async list(req: Request, res: Response) {
    const locationId = req.query.location_id ? Number(req.query.location_id) : undefined;
    const sensors = await SensorModel.findAll(locationId);
    res.json({ success: true, data: sensors });
  },

  async create(req: Request, res: Response) {
    const sensor = await SensorModel.create(req.body);
    res.status(201).json({ success: true, data: sensor });
  },

  async delete(req: Request, res: Response) {
    const deleted = await SensorModel.delete(Number(req.params.id));
    if (!deleted) throw new AppError(404, 'Sensor not found');
    res.json({ success: true, message: 'Sensor deleted' });
  },

  async sync(req: Request, res: Response) {
    const sensor = await SensorModel.findById(Number(req.params.id));
    if (!sensor) throw new AppError(404, 'Sensor not found');

    const settings = await SettingModel.getFullMap();
    const haUrl = settings['ha.base_url'];
    const haToken = settings['ha.token'];
    if (!haUrl || !haToken) {
      throw new AppError(503, 'Home Assistant not configured. Add ha.base_url and ha.token in Settings.');
    }

    const reading = await fetchHASensorReading(haUrl, haToken, sensor.ha_entity_id);
    const updated = await SensorModel.updateReading(sensor.id, reading.value, reading.unit, reading.recordedAt);
    res.json({ success: true, data: updated });
  },

  async syncAll(_req: Request, res: Response) {
    const settings = await SettingModel.getFullMap();
    const haUrl = settings['ha.base_url'];
    const haToken = settings['ha.token'];
    if (!haUrl || !haToken) {
      throw new AppError(503, 'Home Assistant not configured. Add ha.base_url and ha.token in Settings.');
    }

    const sensors = await SensorModel.findAll();
    const results = await Promise.allSettled(
      sensors.map(async (s) => {
        const reading = await fetchHASensorReading(haUrl, haToken, s.ha_entity_id);
        return SensorModel.updateReading(s.id, reading.value, reading.unit, reading.recordedAt);
      })
    );

    const updated = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    res.json({ success: true, data: { updated, failed, total: sensors.length } });
  },
};
