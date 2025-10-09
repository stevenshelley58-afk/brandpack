import type { LLMAdapter } from '@brandpack/core';
import { llmRegistry, imageRegistry, registerAdapters } from './registry.js';
import { routeSpec, routeImageGeneration } from './router.js';
import { NoopLLMAdapter, NoopImageAdapter } from './noop.js';
import { AnthropicLLMAdapter } from './anthropic.js';
import { OpenAILLMAdapter } from './openai.js';

const builtinLLM: LLMAdapter[] = [new NoopLLMAdapter()];

if (process.env.ANTHROPIC_API_KEY) {
  try {
    builtinLLM.push(new AnthropicLLMAdapter());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[adapters] Failed to initialize Anthropic adapter:',
      (error as Error).message,
    );
  }
}

if (process.env.OPENAI_API_KEY) {
  try {
    builtinLLM.push(new OpenAILLMAdapter());
    // eslint-disable-next-line no-console
    console.log('[adapters] ✅ OpenAI adapter registered successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[adapters] Failed to initialize OpenAI adapter:',
      (error as Error).message,
    );
  }
} else {
  // eslint-disable-next-line no-console
  console.warn('[adapters] ⚠️ OPENAI_API_KEY not found - OpenAI adapter NOT registered');
}

const builtinImages = [new NoopImageAdapter()];

registerAdapters({
  llm: builtinLLM,
  image: builtinImages,
});

export {
  llmRegistry,
  imageRegistry,
  registerAdapters,
  routeSpec,
  routeImageGeneration,
  NoopLLMAdapter,
  NoopImageAdapter,
  AnthropicLLMAdapter,
  OpenAILLMAdapter,
};
