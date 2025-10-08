import { llmRegistry, imageRegistry, registerAdapters } from './registry.js';
import { routeSpec, routeImageGeneration } from './router.js';
import { NoopLLMAdapter, NoopImageAdapter } from './noop.js';

const builtin = {
  llm: new NoopLLMAdapter(),
  image: new NoopImageAdapter(),
};

registerAdapters({
  llm: [builtin.llm],
  image: [builtin.image],
});

export {
  llmRegistry,
  imageRegistry,
  registerAdapters,
  routeSpec,
  routeImageGeneration,
  NoopLLMAdapter,
  NoopImageAdapter,
};
