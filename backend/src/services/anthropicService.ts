import Anthropic from '@anthropic-ai/sdk';
import { PromptType } from '../types';

interface LLMResult {
  response: string;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
}

function buildSystemPrompt(promptType: PromptType): string {
  const base = 'You are an expert botanist and plant care specialist. Provide practical, actionable advice.';
  const prompts: Record<PromptType, string> = {
    diagnosis: `${base} Diagnose plant health issues based on descriptions or images. Structure your response with: 1) Observed issues, 2) Likely causes, 3) Immediate actions, 4) Long-term prevention.`,
    identification: `${base} Identify plants from descriptions or images. Provide: common name, scientific name, family, native region, and basic care requirements.`,
    care_advice: `${base} Provide detailed care advice. Cover: watering frequency, sunlight needs, soil type, fertilizing schedule, seasonal considerations, and common problems to watch for.`,
    general: `${base} Answer plant-related questions helpfully and concisely.`,
  };
  return prompts[promptType];
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
    max_tokens: 1024,
    system: buildSystemPrompt(promptType),
    messages: [{ role: 'user', content }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  // Rough cost estimate: claude-sonnet-4-6 pricing
  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const costEstimate = (inputTokens * 0.000003) + (outputTokens * 0.000015);

  return {
    response: text,
    model,
    tokensUsed: inputTokens + outputTokens,
    costEstimate,
  };
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
