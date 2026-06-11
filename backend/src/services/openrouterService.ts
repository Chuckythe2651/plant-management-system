import OpenAI from 'openai';
import { PromptType } from '../types';
import { SYSTEM_PROMPTS } from './aiPrompts';

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

export async function callOpenRouter(
  apiKey: string,
  model: string,
  promptType: PromptType,
  userInput: string,
  imageBase64?: string,
  imageMime?: string
): Promise<LLMResult> {
  const client = new OpenAI({ apiKey, baseURL: OPENROUTER_BASE, defaultHeaders: DEFAULT_HEADERS });

  type ContentPart = OpenAI.ChatCompletionContentPartText | OpenAI.ChatCompletionContentPartImage;
  const content: ContentPart[] = [];

  if (imageBase64 && imageMime) {
    const dataUrl = `data:${imageMime};base64,${imageBase64}`;
    content.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } });
  }
  content.push({ type: 'text', text: userInput || 'Please analyze this plant.' });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS[promptType] },
      { role: 'user', content },
    ],
    max_tokens: 2048,
  });

  const response = completion.choices[0]?.message?.content ?? '';
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const costEstimate = (inputTokens * 0.000003) + (outputTokens * 0.000015);

  return { response, model, tokensUsed: inputTokens + outputTokens, costEstimate };
}

export async function isOpenRouterAvailable(apiKey: string): Promise<boolean> {
  return !!apiKey;
}
