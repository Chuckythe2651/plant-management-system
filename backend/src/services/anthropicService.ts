import Anthropic from '@anthropic-ai/sdk';
import { PromptType } from '../types';
import { SYSTEM_PROMPTS } from './aiPrompts';

interface LLMResult {
  response: string;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
}

export async function callAnthropic(
  apiKey: string,
  model: string,
  promptType: PromptType,
  userInput: string,
  imageBase64?: string,
  imageMime?: string
): Promise<LLMResult> {
  const client = new Anthropic({ apiKey });

  type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;
  const content: ContentBlock[] = [];

  if (imageBase64 && imageMime) {
    const validMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(imageMime)
      ? (imageMime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp')
      : 'image/jpeg';
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: validMime, data: imageBase64 },
    });
  }

  content.push({ type: 'text', text: userInput || 'Please analyze this plant.' });

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPTS[promptType],
    messages: [{ role: 'user', content }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const costEstimate = (inputTokens * 0.000003) + (outputTokens * 0.000015);

  return { response: text, model, tokensUsed: inputTokens + outputTokens, costEstimate };
}

export async function isAnthropicAvailable(apiKey: string, model: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return true;
  } catch {
    return false;
  }
}
