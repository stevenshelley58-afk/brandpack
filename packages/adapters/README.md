# Brand Pack Adapters

Utility adapters that translate the neutral `LLMSpec` and image briefs into provider-specific calls.  
This package exposes a lightweight registry + router and ships with a no-op implementation for rapid prototyping.

## Quick Start

```ts
import {
  routeSpec,
  routeImageGeneration,
  llmRegistry,
  NoopLLMAdapter,
} from '@brandpack/adapters';

// No-op adapters are registered automatically, so this works out of the box:
const response = await routeSpec(spec); // provider defaults to "noop-llm"

// Register custom providers when ready:
llmRegistry.register(new MyAnthropicAdapter());
```

## Concepts

- **Registry** – Keeps track of LLM and image adapters by provider id.  
  Use `llmRegistry.list()` or `imageRegistry.list()` to discover what is available.
- **Router** – `routeSpec` and `routeImageGeneration` look up the requested provider and return a normalized response (`AdapterResponse` / `ImageResult`).
- **No-op adapters** – Deterministic placeholders that echo metadata without calling an external API. Useful for tests and UI development.

See `/PROJECT_SPEC.md` and `/docs/ARCHITECTURE.md` for how these fit into the pipeline.
