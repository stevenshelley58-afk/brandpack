import { llmRegistry, imageRegistry, registerAdapters } from './registry.js';
import { routeSpec, routeImageGeneration } from './router.js';
import { NoopLLMAdapter, NoopImageAdapter } from './noop.js';
import { AnthropicLLMAdapter } from './anthropic.js';

const builtinLLM: Array<NoopLLMAdapter | AnthropicLLMAdapter> = [
  new NoopLLMAdapter(),
];

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
};
