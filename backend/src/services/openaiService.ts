import OpenAI from 'openai';
import { PromptType } from '../types';
import { SYSTEM_PROMPTS } from './aiPrompts';

interface LLMResult {
  response: string;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
}

export async function callOpenAI(
  apiKey: string,
  model: string,
  promptType: PromptType,
  userInput: string,
  imageBase64?: string,
  imageMime?: string
): Promise<LLMResult> {
  const client = new OpenAI({ apiKey });

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
  const costEstimate = (inputTokens * 0.0000025) + (outputTokens * 0.00001);

  return { response, model, tokensUsed: inputTokens + outputTokens, costEstimate };
}

export async function isOpenAIAvailable(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
