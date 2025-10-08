/**
 * Adapter Router
 * 
 * Routes LLM specs and image requests to the appropriate adapter.
 * Handles validation, error handling, and fallback logic.
 */

import type {
  LLMSpec,
  AdapterResponse,
  ImageBrief,
  ImageConfig,
  ImageResult
} from '@brandpack/core';
import { AdapterError, AdapterErrorCode } from '@brandpack/core';
import { llmRegistry, imageRegistry } from './registry';

/**
 * Route options
 */
export interface RouteOptions {
  /**
   * Override provider from spec
   */
  provider?: string;
  
  /**
   * Fallback provider if primary fails
   */
  fallback?: string;
  
  /**
   * Enable retry on failure
   */
  retry?: boolean;
  
  /**
   * Max retry attempts
   */
  maxRetries?: number;
}

/**
 * Route an LLM spec to the appropriate adapter
 */
export async function routeSpec(
  spec: LLMSpec,
  provider: string,
  options: RouteOptions = {}
): Promise<AdapterResponse> {
  const targetProvider = options.provider || provider;
  
  // Get adapter from registry
  const adapter = llmRegistry.get(targetProvider);
  
  if (!adapter) {
    throw new AdapterError(
      `No adapter registered for provider: ${targetProvider}`,
      targetProvider,
      AdapterErrorCode.INVALID_REQUEST,
      {
        available_providers: llmRegistry.getProviders(),
        requested_provider: targetProvider
      }
    );
  }
  
  // Validate spec against adapter
  const validation = adapter.validateSpec(spec);
  if (!validation.valid) {
    throw new AdapterError(
      `Spec validation failed: ${validation.errors.join(', ')}`,
      targetProvider,
      AdapterErrorCode.INVALID_REQUEST,
      { errors: validation.errors }
    );
  }
  
  // Execute with retry logic
  const maxRetries = options.maxRetries ?? (options.retry ? 2 : 0);
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await adapter.execute(spec);
      
      // Add attempt info to metadata
      if (response.metadata) {
        response.metadata.attempt = attempt + 1;
        response.metadata.retried = attempt > 0;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof AdapterError) {
        if (
          error.code === AdapterErrorCode.AUTHENTICATION_FAILED ||
          error.code === AdapterErrorCode.INVALID_REQUEST ||
          error.code === AdapterErrorCode.CONTENT_FILTER
        ) {
          throw error;
        }
      }
      
      // If we have retries left, wait and try again
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // If we get here, all retries failed
  if (options.fallback && options.fallback !== targetProvider) {
    console.warn(
      `Primary provider ${targetProvider} failed, trying fallback ${options.fallback}`
    );
    return routeSpec(spec, options.fallback, { ...options, fallback: undefined });
  }
  
  // No fallback, throw last error
  throw lastError;
}

/**
 * Route multiple specs in parallel
 */
export async function routeSpecBatch(
  specs: LLMSpec[],
  provider: string,
  options: RouteOptions = {}
): Promise<AdapterResponse[]> {
  return Promise.all(
    specs.map(spec => routeSpec(spec, provider, options))
  );
}

/**
 * Route an image generation request
 */
export async function routeImageGeneration(
  brief: ImageBrief,
  config: ImageConfig,
  options: RouteOptions = {}
): Promise<ImageResult> {
  const targetProvider = options.provider || config.provider;
  
  // Get adapter from registry
  const adapter = imageRegistry.get(targetProvider);
  
  if (!adapter) {
    throw new AdapterError(
      `No image adapter registered for provider: ${targetProvider}`,
      targetProvider,
      AdapterErrorCode.INVALID_REQUEST,
      {
        available_providers: imageRegistry.getProviders(),
        requested_provider: targetProvider
      }
    );
  }
  
  // Execute with retry logic
  const maxRetries = options.maxRetries ?? (options.retry ? 1 : 0);
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await adapter.generate(brief, config);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof AdapterError) {
        if (
          error.code === AdapterErrorCode.AUTHENTICATION_FAILED ||
          error.code === AdapterErrorCode.CONTENT_FILTER
        ) {
          throw error;
        }
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // Try fallback
  if (options.fallback && options.fallback !== targetProvider) {
    console.warn(
      `Primary image provider ${targetProvider} failed, trying fallback ${options.fallback}`
    );
    return routeImageGeneration(
      brief,
      { ...config, provider: options.fallback },
      { ...options, fallback: undefined }
    );
  }
  
  throw lastError;
}

/**
 * Route multiple image generations in parallel
 */
export async function routeImageBatch(
  briefs: ImageBrief[],
  config: ImageConfig,
  options: RouteOptions = {}
): Promise<ImageResult[]> {
  return Promise.all(
    briefs.map(brief => routeImageGeneration(brief, config, options))
  );
}

/**
 * Estimate cost before routing
 */
export function estimateSpecCost(spec: LLMSpec, provider: string): number {
  const adapter = llmRegistry.get(provider);
  
  if (!adapter) {
    throw new AdapterError(
      `No adapter registered for provider: ${provider}`,
      provider,
      AdapterErrorCode.INVALID_REQUEST
    );
  }
  
  return adapter.estimateCost(spec);
}

/**
 * Estimate image generation cost
 */
export function estimateImageCost(config: ImageConfig): number {
  const adapter = imageRegistry.get(config.provider);
  
  if (!adapter) {
    throw new AdapterError(
      `No image adapter registered for provider: ${config.provider}`,
      config.provider,
      AdapterErrorCode.INVALID_REQUEST
    );
  }
  
  return adapter.estimateCost(config);
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: string, type: 'llm' | 'image' = 'llm'): string[] {
  if (type === 'llm') {
    const adapter = llmRegistry.get(provider);
    return adapter ? adapter.getAvailableModels() : [];
  } else {
    const adapter = imageRegistry.get(provider);
    return adapter ? adapter.getAvailableModels() : [];
  }
}

