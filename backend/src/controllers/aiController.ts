import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { SettingModel } from '../models/Setting';
import { LlmInteractionModel } from '../models/LlmInteraction';
import { callAnthropic } from '../services/anthropicService';
import { callOpenAI } from '../services/openaiService';
import { callOllama, isOllamaAvailable, getOllamaModels } from '../services/ollamaService';
import { isAnthropicAvailable } from '../services/anthropicService';
import { isOpenAIAvailable } from '../services/openaiService';
import { AppError } from '../middleware/errorHandler';
import { AIDiagnoseDto, LLMProvider, PromptType } from '../types';
import { config } from '../config';

export const aiController = {
  async diagnose(req: Request, res: Response) {
    const body = req.body as AIDiagnoseDto;
    const { plant_id, prompt_type, user_input, provider = 'auto' } = body;

    // Resolve image — either from body URL or from uploaded file
    let imageUrl: string | undefined = body.image_url;
    let imageBase64: string | undefined;
    let imageMime: string | undefined;

    if (req.file) {
      const filename = req.file.filename;
      imageUrl = `/uploads/${filename}`;
      const filePath = path.join(config.uploads.dir, filename);
      imageBase64 = fs.readFileSync(filePath).toString('base64');
      imageMime = req.file.mimetype;
    }

    const settings = await SettingModel.getFullMap();

    const resolvedProvider = await resolveProvider(
      provider as LLMProvider | 'auto',
      settings,
      !!imageBase64
    );

    const start = Date.now();
    let response = '';
    let model = '';
    let tokensUsed: number | undefined;
    let costEstimate: number | undefined;

    try {
      if (resolvedProvider === 'anthropic') {
        if (!settings['api.anthropic_key']) {
          throw new AppError(503, 'Anthropic API key not configured. Add api.anthropic_key in Settings.');
        }
        const result = await callAnthropic(
          settings['api.anthropic_key'],
          settings['llm.anthropic_model'] || 'claude-sonnet-4-6',
          prompt_type as PromptType,
          user_input ?? '',
          imageBase64,
          imageMime
        );
        response = result.response;
        model = result.model;
        tokensUsed = result.tokensUsed;
        costEstimate = result.costEstimate;
      } else if (resolvedProvider === 'openai') {
        if (!settings['api.openai_key']) {
          throw new AppError(503, 'OpenAI API key not configured. Add api.openai_key in Settings.');
        }
        const result = await callOpenAI(
          settings['api.openai_key'],
          settings['llm.openai_model'] || 'gpt-4o',
          prompt_type as PromptType,
          user_input ?? '',
          imageUrl
        );
        response = result.response;
        model = result.model;
        tokensUsed = result.tokensUsed;
        costEstimate = result.costEstimate;
      } else if (resolvedProvider === 'ollama') {
        const result = await callOllama(
          settings['llm.ollama_base_url'] || 'http://host.docker.internal:11434',
          settings['llm.ollama_model'] || 'llava',
          prompt_type as PromptType,
          user_input ?? '',
          imageBase64
        );
        response = result.response;
        model = result.model;
        tokensUsed = result.tokensUsed;
        costEstimate = 0;
      } else {
        throw new AppError(400, `No LLM provider available. Configure API keys in Settings.`);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, `LLM request failed: ${(err as Error).message}`);
    }

    const duration_ms = Date.now() - start;

    const interaction = await LlmInteractionModel.create({
      plant_id: plant_id ?? undefined,
      llm_provider: resolvedProvider,
      llm_model: model,
      prompt_type: prompt_type as PromptType,
      user_input,
      image_url: imageUrl,
      response,
      tokens_used: tokensUsed,
      cost_estimate: costEstimate,
      duration_ms,
    });

    res.json({ success: true, data: interaction });
  },

  async history(req: Request, res: Response) {
    const plantId = req.query.plant_id ? Number(req.query.plant_id) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const interactions = await LlmInteractionModel.findAll(plantId, limit);
    res.json({ success: true, data: interactions });
  },

  async providers(req: Request, res: Response) {
    const settings = await SettingModel.getFullMap();
    const ollamaUrl = settings['llm.ollama_base_url'] || 'http://host.docker.internal:11434';

    const [ollamaOk, openaiOk, anthropicOk, ollamaModels] = await Promise.all([
      isOllamaAvailable(ollamaUrl),
      isOpenAIAvailable(settings['api.openai_key']),
      isAnthropicAvailable(
        settings['api.anthropic_key'],
        settings['llm.anthropic_model'] || 'claude-sonnet-4-6'
      ),
      getOllamaModels(ollamaUrl),
    ]);

    res.json({
      success: true,
      data: {
        ollama: { available: ollamaOk, models: ollamaModels, url: ollamaUrl },
        openai: { available: openaiOk, model: settings['llm.openai_model'] || 'gpt-4o' },
        anthropic: { available: anthropicOk, model: settings['llm.anthropic_model'] || 'claude-sonnet-4-6' },
        preferred: settings['llm.preferred_provider'] || 'anthropic',
      },
    });
  },
};

async function resolveProvider(
  requested: LLMProvider | 'auto',
  settings: Record<string, string>,
  hasImage: boolean
): Promise<LLMProvider> {
  if (requested !== 'auto') return requested as LLMProvider;

  const preferred = (settings['llm.preferred_provider'] as LLMProvider) || 'anthropic';
  const ollamaUrl = settings['llm.ollama_base_url'] || 'http://host.docker.internal:11434';

  // Try Ollama first for privacy if available and has vision model when image present
  const ollamaOk = await isOllamaAvailable(ollamaUrl);
  if (ollamaOk) {
    const models = await getOllamaModels(ollamaUrl);
    const hasVision = models.some((m) => m.includes('llava') || m.includes('vision'));
    if (!hasImage || hasVision) return 'ollama';
  }

  // Fall back to preferred cloud provider
  return preferred !== 'ollama' ? preferred : 'anthropic';
}
