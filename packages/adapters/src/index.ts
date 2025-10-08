/**
 * Brand Pack Adapters Package
 * 
 * Provider-agnostic adapters for LLM and image generation
 */

// Registry
export {
  llmRegistry,
  imageRegistry,
  registerAdapters,
  getAdapterStats
} from './registry';

// Router
export {
  routeSpec,
  routeSpecBatch,
  routeImageGeneration,
  routeImageBatch,
  estimateSpecCost,
  estimateImageCost,
  getAvailableModels
} from './router';
export type { RouteOptions } from './router';

// No-op adapter (for testing)
export {
  NoopLLMAdapter,
  NoopImageAdapter,
  noopLLMAdapter,
  noopImageAdapter
} from './noop';

// LLM Provider Adapters
export {
  AnthropicAdapter,
  createAnthropicAdapter
} from './anthropic';

export {
  OpenAIAdapter,
  createOpenAIAdapter
} from './openai';

