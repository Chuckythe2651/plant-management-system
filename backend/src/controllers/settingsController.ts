import { Request, Response } from 'express';
import { SettingModel } from '../models/Setting';
import { isOllamaAvailable } from '../services/ollamaService';
import { isOpenAIAvailable } from '../services/openaiService';
import { isAnthropicAvailable } from '../services/anthropicService';
import { getCurrentWeather } from '../services/weatherService';
import { pool } from '../config/database';

export const settingsController = {
  async list(_req: Request, res: Response) {
    const settings = await SettingModel.findAll();
    // Mask secret values
    const masked = settings.map((s) => ({
      ...s,
      value: s.is_secret && s.value ? (s.value.length > 0 ? '***configured***' : '') : s.value,
    }));
    res.json({ success: true, data: masked });
  },

  async update(req: Request, res: Response) {
    const updates = req.body as Record<string, string>;
    const existing = await SettingModel.findAll();
    const knownKeys = new Set(existing.map((s) => s.key));
    const unknown = Object.keys(updates).filter((k) => !knownKeys.has(k));
    if (unknown.length) {
      res.status(400).json({ success: false, error: `Unknown setting key(s): ${unknown.join(', ')}` });
      return;
    }
    await SettingModel.bulkUpsert(updates);
    res.json({ success: true, message: 'Settings updated' });
  },

  async healthCheck(_req: Request, res: Response) {
    const settings = await SettingModel.getFullMap();
    const ollamaUrl = settings['llm.ollama_base_url'] || 'http://host.docker.internal:11434';

    let dbOk = false;
    try {
      await pool.query('SELECT 1');
      dbOk = true;
    } catch { /* ignore */ }

    const [ollamaOk, openaiOk, anthropicOk, weather] = await Promise.all([
      isOllamaAvailable(ollamaUrl),
      isOpenAIAvailable(settings['api.openai_key']),
      isAnthropicAvailable(
        settings['api.anthropic_key'],
        settings['llm.anthropic_model'] || 'claude-sonnet-4-6'
      ),
      getCurrentWeather(
        settings['api.openweather_key'],
        parseFloat(settings['location.latitude'] || '33.3062'),
        parseFloat(settings['location.longitude'] || '-111.8413')
      ),
    ]);

    const allOk = dbOk && (ollamaOk || openaiOk || anthropicOk);

    res.json({
      success: true,
      data: {
        status: allOk ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbOk,
          ollama: ollamaOk,
          openai: openaiOk,
          anthropic: anthropicOk,
          weather: weather !== null,
        },
        weather,
      },
    });
  },
};
