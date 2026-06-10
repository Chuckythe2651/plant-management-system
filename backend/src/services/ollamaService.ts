import axios from 'axios';
import { PromptType } from '../types';

interface LLMResult {
  response: string;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
}

function buildPrompt(promptType: PromptType, userInput: string): string {
  const prefixes: Record<PromptType, string> = {
    diagnosis: 'As an expert botanist, diagnose the plant health issue described below. Provide: observed issues, likely causes, immediate actions, and prevention.\n\n',
    identification: 'As an expert botanist, identify this plant. Provide: common name, scientific name, family, native region, and basic care requirements.\n\n',
    care_advice: 'As an expert botanist, provide detailed care advice for this plant: watering, sunlight, soil, fertilizing, seasonal tips, and common problems.\n\n',
    general: 'As an expert botanist, answer this plant-related question:\n\n',
  };
  return prefixes[promptType] + userInput;
}

export async function callOllama(
  baseUrl: string,
  model: string,
  promptType: PromptType,
  userInput: string,
  imageBase64?: string
): Promise<LLMResult> {
  const body: Record<string, unknown> = {
    model,
    prompt: buildPrompt(promptType, userInput || 'Describe what you see.'),
    stream: false,
  };

  if (imageBase64) {
    body.images = [imageBase64];
  }

  const res = await axios.post(`${baseUrl}/api/generate`, body, {
    timeout: 120000,
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    response: res.data.response ?? '',
    model,
    tokensUsed: (res.data.prompt_eval_count ?? 0) + (res.data.eval_count ?? 0),
    costEstimate: 0, // local — no cost
  };
}

export async function isOllamaAvailable(baseUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(`${baseUrl}/api/tags`, { timeout: 3000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function getOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const res = await axios.get(`${baseUrl}/api/tags`, { timeout: 3000 });
    return (res.data.models ?? []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
