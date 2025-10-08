import type {
  LLMAdapter,
  ImageAdapter,
} from '@brandpack/core';

type AdapterMap<T> = Map<string, T>;

function assertUnique<T extends { provider: string }>(
  registry: AdapterMap<T>,
  adapter: T,
) {
  const existing = registry.get(adapter.provider);
  if (existing && existing !== adapter) {
    throw new Error(
      `Adapter for provider "${adapter.provider}" is already registered.`,
    );
  }
}

function register<T extends { provider: string }>(
  registry: AdapterMap<T>,
  adapter: T,
) {
  assertUnique(registry, adapter);
  registry.set(adapter.provider, adapter);
}

function get<T>(registry: AdapterMap<T>, provider: string) {
  return registry.get(provider);
}

function list(registry: AdapterMap<unknown>): string[] {
  return Array.from(registry.keys()).sort();
}

const llmAdapters: AdapterMap<LLMAdapter> = new Map();
const imageAdapters: AdapterMap<ImageAdapter> = new Map();

export const llmRegistry = {
  register: (adapter: LLMAdapter) => register(llmAdapters, adapter),
  get: (provider: string) => get(llmAdapters, provider),
  list: () => list(llmAdapters),
  clear: () => llmAdapters.clear(),
};

export const imageRegistry = {
  register: (adapter: ImageAdapter) => register(imageAdapters, adapter),
  get: (provider: string) => get(imageAdapters, provider),
  list: () => list(imageAdapters),
  clear: () => imageAdapters.clear(),
};

export function registerAdapters({
  llm = [],
  image = [],
}: {
  llm?: LLMAdapter[];
  image?: ImageAdapter[];
}) {
  llm.forEach((adapter) => llmRegistry.register(adapter));
  image.forEach((adapter) => imageRegistry.register(adapter));
}

export function getAdapterStats() {
  return {
    llm: llmRegistry.list(),
    image: imageRegistry.list(),
  };
}
