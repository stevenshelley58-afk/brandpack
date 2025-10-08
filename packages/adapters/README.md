# Brand Pack Adapters

Utility adapters that translate the neutral `LLMSpec` and image briefs into provider-specific calls.  
This package exposes a lightweight registry + router, ships with a no-op implementation for prototyping, and auto-registers an Anthropic adapter when `ANTHROPIC_API_KEY` is present.

## Quick Start

```ts
import {
  routeSpec,
  routeImageGeneration,
  llmRegistry,
  NoopLLMAdapter,
  AnthropicLLMAdapter,
} from '@brandpack/adapters';

// No-op adapters are registered automatically, so this works out of the box:
const noopResponse = await routeSpec(spec); // provider defaults to "noop-llm"

// Register custom providers when ready:
llmRegistry.register(new MyCustomAdapter());

// Anthropic adapter is auto-registered when ANTHROPIC_API_KEY is set:
const anthropicResponse = await routeSpec(spec, 'anthropic');
```

## Concepts

- **Registry** – Keeps track of LLM and image adapters by provider id. Use `llmRegistry.list()` or `imageRegistry.list()` to discover what is available.
- **Router** – `routeSpec` and `routeImageGeneration` look up the requested provider and return a normalized response (`AdapterResponse` / `ImageResult`).
- **No-op adapters** – Deterministic placeholders that echo metadata without calling an external API. Useful for tests and UI development.
- **Anthropic adapter** – Real provider integration that maps `LLMSpec` to the Messages API, estimates cost, and normalizes common errors/timeouts.

See `/PROJECT_SPEC.md` and `/docs/ARCHITECTURE.md` for how these fit into the pipeline.
