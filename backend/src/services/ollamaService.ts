import axios from 'axios';
import { PromptType } from '../types';
import { SYSTEM_PROMPTS } from './aiPrompts';

interface LLMResult {
  response: string;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
}

export async function callOllama(
  baseUrl: string,
  model: string,
  promptType: PromptType,
  userInput: string,
  imageBase64?: string
): Promise<LLMResult> {
  const systemPrompt = SYSTEM_PROMPTS[promptType];
  const body: Record<string, unknown> = {
    model,
    system: systemPrompt,
    prompt: userInput || 'Please analyze this plant.',
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
    costEstimate: 0,
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
