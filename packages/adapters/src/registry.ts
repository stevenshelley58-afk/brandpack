/**
 * Adapter Registry
 * 
 * Central registry for all LLM and image adapters.
 * Allows runtime registration and lookup of adapters by provider name.
 */

import type { LLMAdapter, ImageAdapter } from '@brandpack/core';

/**
 * Global registry for LLM adapters
 */
class LLMAdapterRegistry {
  private adapters: Map<string, LLMAdapter> = new Map();
  
  /**
   * Register an LLM adapter
   */
  register(adapter: LLMAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      console.warn(`Adapter for provider "${adapter.provider}" already registered, overwriting`);
    }
    this.adapters.set(adapter.provider, adapter);
  }
  
  /**
   * Get an adapter by provider name
   */
  get(provider: string): LLMAdapter | undefined {
    return this.adapters.get(provider);
  }
  
  /**
   * Check if a provider is registered
   */
  has(provider: string): boolean {
    return this.adapters.has(provider);
  }
  
  /**
   * Get all registered provider names
   */
  getProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Unregister an adapter
   */
  unregister(provider: string): boolean {
    return this.adapters.delete(provider);
  }
  
  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
  }
}

/**
 * Global registry for image adapters
 */
class ImageAdapterRegistry {
  private adapters: Map<string, ImageAdapter> = new Map();
  
  /**
   * Register an image adapter
   */
  register(adapter: ImageAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      console.warn(`Image adapter for provider "${adapter.provider}" already registered, overwriting`);
    }
    this.adapters.set(adapter.provider, adapter);
  }
  
  /**
   * Get an adapter by provider name
   */
  get(provider: string): ImageAdapter | undefined {
    return this.adapters.get(provider);
  }
  
  /**
   * Check if a provider is registered
   */
  has(provider: string): boolean {
    return this.adapters.has(provider);
  }
  
  /**
   * Get all registered provider names
   */
  getProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * Unregister an adapter
   */
  unregister(provider: string): boolean {
    return this.adapters.delete(provider);
  }
  
  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
  }
}

// Singleton instances
export const llmRegistry = new LLMAdapterRegistry();
export const imageRegistry = new ImageAdapterRegistry();

/**
 * Convenience function to register both LLM and image adapters
 */
export function registerAdapters(config: {
  llm?: LLMAdapter[];
  image?: ImageAdapter[];
}): void {
  if (config.llm) {
    for (const adapter of config.llm) {
      llmRegistry.register(adapter);
    }
  }
  
  if (config.image) {
    for (const adapter of config.image) {
      imageRegistry.register(adapter);
    }
  }
}

/**
 * Get adapter counts
 */
export function getAdapterStats(): {
  llm: number;
  image: number;
  total: number;
} {
  const llmCount = llmRegistry.getProviders().length;
  const imageCount = imageRegistry.getProviders().length;
  
  return {
    llm: llmCount,
    image: imageCount,
    total: llmCount + imageCount
  };
}

