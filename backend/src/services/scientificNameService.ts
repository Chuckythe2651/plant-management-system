import { callAnthropic } from './anthropicService';
import { callOpenAI } from './openaiService';
import { callOpenRouter } from './openrouterService';
import { callOllama, isOllamaAvailable } from './ollamaService';

const PROMPT = (name: string) =>
  `What is the scientific (Latin binomial) name for the plant commonly known as "${name}"? ` +
  `Reply with ONLY the scientific name — no explanation, no punctuation, just the two-word name.`;

// Basic validation: must look like "Genus species" (two capitalized words)
function looksLikeSciName(s: string): boolean {
  const trimmed = s.trim();
  return /^[A-Z][a-z]+\s+[a-z]{2,}/.test(trimmed) && trimmed.length < 80;
}

export async function lookupScientificName(
  plantName: string,
  settings: Record<string, string>
): Promise<string | null> {
  const prompt = PROMPT(plantName);

  try {
    if (settings['api.anthropic_key']) {
      const r = await callAnthropic(
        settings['api.anthropic_key'],
        settings['llm.anthropic_model'] || 'claude-sonnet-4-6',
        'general', prompt
      );
      const name = r.response.trim().split('\n')[0].trim();
      if (looksLikeSciName(name)) return name;
    }

    if (settings['api.openai_key']) {
      const r = await callOpenAI(
        settings['api.openai_key'],
        settings['llm.openai_model'] || 'gpt-4o',
        'general', prompt
      );
      const name = r.response.trim().split('\n')[0].trim();
      if (looksLikeSciName(name)) return name;
    }

    if (settings['api.openrouter_key']) {
      const r = await callOpenRouter(
        settings['api.openrouter_key'],
        settings['llm.openrouter_model'] || 'anthropic/claude-sonnet-4-5:beta',
        'general', prompt
      );
      const name = r.response.trim().split('\n')[0].trim();
      if (looksLikeSciName(name)) return name;
    }

    const ollamaUrl = settings['llm.ollama_base_url'] || 'http://host.docker.internal:11434';
    if (await isOllamaAvailable(ollamaUrl)) {
      const r = await callOllama(
        ollamaUrl,
        settings['llm.ollama_model'] || 'llama3',
        'general', prompt
      );
      const name = r.response.trim().split('\n')[0].trim();
      if (looksLikeSciName(name)) return name;
    }
  } catch (err) {
    console.warn('[scientificName] lookup failed:', (err as Error).message);
  }

  return null;
}
