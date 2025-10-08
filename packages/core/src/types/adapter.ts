/**
 * Adapter Interface
 * 
 * All LLM and image providers must implement these interfaces.
 * This ensures we can swap providers without changing core logic.
 */

import type { LLMSpec } from './spec';

/**
 * Token usage information
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Standardized response from any LLM adapter
 */
export interface AdapterResponse {
  /**
   * Generated outputs (array for multiple completions)
   */
  outputs: string[];
  
  /**
   * Token usage details
   */
  usage: TokenUsage;
  
  /**
   * Provider name (e.g., "anthropic", "openai")
   */
  provider: string;
  
  /**
   * Model name used (e.g., "claude-3-5-sonnet-20241022")
   */
  model: string;
  
  /**
   * Estimated cost in USD
   */
  cost_usd: number;
  
  /**
   * Time taken to complete request in milliseconds
   */
  duration_ms: number;
  
  /**
   * Raw response from provider (for debugging)
   */
  raw_response: unknown;
  
  /**
   * Additional metadata
   */
  metadata?: {
    /**
     * Was this response cached?
     */
    cached?: boolean;
    
    /**
     * Finish reason (e.g., "stop", "length", "content_filter")
     */
    finish_reason?: string;
    
    [key: string]: unknown;
  };
}

/**
 * Base interface for all LLM adapters
 */
export interface LLMAdapter {
  /**
   * Provider identifier
   */
  readonly provider: string;
  
  /**
   * Execute an LLM spec and return standardized response
   */
  execute(spec: LLMSpec): Promise<AdapterResponse>;
  
  /**
   * Estimate cost before execution (useful for budget checks)
   */
  estimateCost(spec: LLMSpec): number;
  
  /**
   * Validate if this adapter can handle the given spec
   */
  validateSpec(spec: LLMSpec): { valid: boolean; errors: string[] };
  
  /**
   * Get list of available models for this provider
   */
  getAvailableModels(): string[];
}

/**
 * Image generation brief
 */
export interface ImageBrief {
  id: string;
  prompt: string;
  negative_prompt?: string;
  style: string;
  mood: string;
  composition: string;
  aspect_ratio: '4:5' | '1:1' | '16:9';
}

/**
 * Image generation configuration
 */
export interface ImageConfig {
  provider: string;
  model: string;
  resolution: string;
  aspect_ratio: '4:5' | '1:1' | '16:9';
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  n_variations?: number;
  seed?: number;
  style_modifiers?: string[];
  negative_modifiers?: string[];
}

/**
 * Standardized response from image generation
 */
export interface ImageResult {
  /**
   * Public URL to generated image
   */
  url: string;
  
  /**
   * Thumbnail URL (smaller version)
   */
  thumbnail_url?: string;
  
  /**
   * Provider name
   */
  provider: string;
  
  /**
   * Model used
   */
  model: string;
  
  /**
   * Cost in USD
   */
  cost_usd: number;
  
  /**
   * Generation time in milliseconds
   */
  duration_ms: number;
  
  /**
   * Image metadata
   */
  metadata: {
    resolution: string;
    aspect_ratio: string;
    file_size_kb: number;
    format: string;
    seed?: number;
  };
  
  /**
   * Raw provider response
   */
  raw_response?: unknown;
}

/**
 * Base interface for image generation adapters
 */
export interface ImageAdapter {
  /**
   * Provider identifier
   */
  readonly provider: string;
  
  /**
   * Generate image from brief
   */
  generate(brief: ImageBrief, config: ImageConfig): Promise<ImageResult>;
  
  /**
   * Estimate cost before generation
   */
  estimateCost(config: ImageConfig): number;
  
  /**
   * Get available models
   */
  getAvailableModels(): string[];
}

/**
 * Adapter error for standardized error handling
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

/**
 * Common error codes
 */
export enum AdapterErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  CONTENT_FILTER = 'CONTENT_FILTER',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Pricing information for a provider
 */
export interface ProviderPricing {
  provider: string;
  models: {
    [modelName: string]: {
      input_cost_per_1k_tokens: number;
      output_cost_per_1k_tokens: number;
      image_cost?: number;
    };
  };
}

/**
 * Calculate cost based on usage and pricing
 */
export function calculateCost(
  usage: TokenUsage,
  pricing: { input_per_1k: number; output_per_1k: number }
): number {
  const inputCost = (usage.prompt_tokens / 1000) * pricing.input_per_1k;
  const outputCost = (usage.completion_tokens / 1000) * pricing.output_per_1k;
  return inputCost + outputCost;
}

