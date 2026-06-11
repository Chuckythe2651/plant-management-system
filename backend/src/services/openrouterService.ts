import OpenAI from 'openai';
import { PromptType } from '../types';

interface LLMResult {
  response: string;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_HEADERS = {
  'HTTP-Referer': 'https://plant-management-system',
  'X-Title': 'Plant Management System',
};

function buildSystemPrompt(promptType: PromptType): string {
  const base = 'You are an expert botanist and plant care specialist. Provide practical, actionable advice.';
  const prompts: Record<PromptType, string> = {
    diagnosis: `${base} Diagnose plant health issues. Structure: 1) Observed issues, 2) Likely causes, 3) Immediate actions, 4) Prevention.`,
    identification: `${base} Identify plants. Provide: common name, scientific name, family, native region, basic care requirements.`,
    care_advice: `${base} Give detailed care advice: watering, sunlight, soil, fertilizing, seasonal tips, common problems.`,
    general: `${base} Answer plant questions helpfully and concisely.`,
  };
  return prompts[promptType];
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  promptType: PromptType,
  userInput: string,
  imageUrl?: string
): Promise<LLMResult> {
  const client = new OpenAI({ apiKey, baseURL: OPENROUTER_BASE, defaultHeaders: DEFAULT_HEADERS });

  type ContentPart = OpenAI.ChatCompletionContentPartText | OpenAI.ChatCompletionContentPartImage;
  const content: ContentPart[] = [];
  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } });
  }
  content.push({ type: 'text', text: userInput || 'Please analyze this plant.' });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(promptType) },
      { role: 'user', content },
    ],
    max_tokens: 1024,
  });

  const response = completion.choices[0]?.message?.content ?? '';
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const costEstimate = (inputTokens * 0.000003) + (outputTokens * 0.000015);

  return { response, model, tokensUsed: inputTokens + outputTokens, costEstimate };
}

export async function isOpenRouterAvailable(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const client = new OpenAI({ apiKey, baseURL: OPENROUTER_BASE, defaultHeaders: DEFAULT_HEADERS });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
