/**
 * Configuration Types
 * 
 * Hierarchical configuration system with multiple layers:
 * 1. Hardcoded fallbacks
 * 2. prompts.json defaults
 * 3. User presets
 * 4. This-run overrides
 */

import type { ResponseFormat } from './spec';

/**
 * Global configuration applies to all tasks
 */
export interface GlobalConfig {
  provider: string;
  log_level: 'error' | 'warn' | 'info' | 'debug';
  cache_enabled: boolean;
  cache_ttl: {
    scrape: number;
    llm: number;
    image: number;
  };
  redact_patterns: string[];
  rate_limit: {
    enabled: boolean;
    requests_per_minute: number;
  };
}

/**
 * Prompt configuration for a task
 */
export interface PromptConfig {
  system: string;
  user_template: string;
  variables: string[];
}

/**
 * Model configuration
 */
export interface ModelConfig {
  provider?: string;
  name: string;
  temperature: number;
  top_p?: number;
  max_tokens: number;
  stop_sequences?: string[];
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * Validation rules
 */
export interface ValidationConfig {
  response_format: ResponseFormat;
  schema?: Record<string, unknown>;
  min_length?: number;
  max_length?: number;
  required_fields?: string[];
  banned_phrases?: string[];
}

/**
 * Budget constraints
 */
export interface BudgetConfig {
  max_tokens_per_call: number;
  max_cost_per_call: number;
  timeout_ms: number;
  max_retries: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  include_prompts: boolean;
  include_outputs: boolean;
  redact: boolean;
}

/**
 * Advanced options (task-specific)
 */
export interface AdvancedConfig {
  n_outputs?: number;
  n_displayed?: number;
  dedupe_threshold?: number;
  regen_strategy?: 'fresh' | 'use_remaining';
  variants_per_idea?: number;
  briefs_per_copy?: number;
  [key: string]: unknown;
}

/**
 * Complete configuration for a single LLM call
 */
export interface CallConfig {
  prompt: PromptConfig;
  model: ModelConfig;
  validation: ValidationConfig;
  budgets: BudgetConfig;
  logging: LoggingConfig;
  advanced?: AdvancedConfig;
}

/**
 * Image-specific configuration
 */
export interface ImageCallConfig extends Omit<CallConfig, 'model'> {
  model: ModelConfig;
  image: {
    provider: string;
    model: string;
    resolution: string;
    aspect_ratio: '4:5' | '1:1' | '16:9';
    format: 'png' | 'jpg' | 'webp';
    quality: number;
    n_variations?: number;
    seed?: number;
    style_modifiers: string[];
    negative_modifiers: string[];
  };
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  max_pages: number;
  max_bytes_per_page: number;
  timeout_ms: number;
  concurrency: number;
  respect_robots_txt: boolean;
  follow_redirects: boolean;
  max_redirects: number;
  priority_pages: string[];
  selectors: {
    product_name: string[];
    price: string[];
    description: string[];
    testimonial: string[];
  };
  kernel: {
    max_kb: number;
    compression_strategy: 'aggressive' | 'balanced' | 'minimal';
  };
  allow_manual_input: boolean;
  allow_csv_import: boolean;
}

/**
 * Global validation settings
 */
export interface GlobalValidationConfig {
  banned_phrases: string[];
  copy: {
    before: {
      headline_max: number;
      description_max: number;
    };
    after: {
      headline_max: number;
      description_max: number;
    };
  };
  dedupe: {
    enabled: boolean;
    threshold: number;
    method: 'embeddings' | 'ngrams';
  };
  proof_validation: {
    enabled: boolean;
    require_citation: boolean;
  };
}

/**
 * Budget configuration
 */
export interface GlobalBudgetConfig {
  max_cost_per_run: number;
  max_tokens_per_run: number;
  max_duration_per_run_ms: number;
  alert_threshold: number;
  alert_email?: string;
  provider_quotas: {
    [provider: string]: {
      requests_per_minute: number;
      tokens_per_minute: number;
      daily_spend_limit: number;
    };
  };
}

/**
 * Root configuration structure
 */
export interface Config {
  version: string;
  updated_at: string;
  global: GlobalConfig;
  calls: {
    scrape_review: CallConfig;
    audience_analysis: CallConfig;
    ideas_generate: CallConfig;
    copy_generate: CallConfig;
    image_brief: CallConfig;
    image_render: ImageCallConfig;
  };
  scraper: ScraperConfig;
  validation: GlobalValidationConfig;
  budgets: GlobalBudgetConfig;
  presets: {
    [name: string]: Preset;
  };
}

/**
 * Preset (partial config override)
 */
export interface Preset {
  description: string;
  config: DeepPartial<Config>;
}

/**
 * Config override stored in database
 */
export interface ConfigOverride {
  id: string;
  user_id: string;
  scope: 'global' | 'call' | 'preset' | 'this_run';
  name?: string;
  description?: string;
  key_path?: string;
  value: unknown;
  applied_at: string;
  created_at: string;
}

/**
 * Effective config (result of merging all layers)
 */
export interface EffectiveConfig {
  task_id: string;
  config: CallConfig | ImageCallConfig;
  layers: {
    hardcoded: DeepPartial<Config>;
    prompts_json: DeepPartial<Config>;
    user_preset: DeepPartial<Config> | null;
    this_run: DeepPartial<Config> | null;
  };
  overrides_applied: number;
  estimated_cost: number;
}

/**
 * Config validation error
 */
export interface ConfigValidationError {
  field: string;
  error: string;
  value: unknown;
}

/**
 * Deep partial type helper
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Config merge options
 */
export interface MergeOptions {
  /**
   * How to handle arrays: 'replace' or 'concat'
   */
  arrayStrategy: 'replace' | 'concat';
  
  /**
   * Skip null/undefined values
   */
  skipNullish: boolean;
}

/**
 * Default merge options
 */
export const DEFAULT_MERGE_OPTIONS: MergeOptions = {
  arrayStrategy: 'replace',
  skipNullish: true
};

