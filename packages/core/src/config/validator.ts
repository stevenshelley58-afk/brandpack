export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface CacheTtlSeconds {
  scrape: number;
  llm: number;
  image: number;
}

export interface GlobalConfig {
  provider: string;
  log_level: LogLevel;
  cache_enabled: boolean;
  cache_ttl_seconds: CacheTtlSeconds;
}

export interface PromptConfig {
  system: string;
  user_template: string;
  variables: string[];
  outputs_expected?: number;
}

export interface ModelConfig {
  provider?: string;
  name: string;
  temperature: number;
  max_tokens: number;
}

export interface CrawlGuard {
  max_pages: number;
  max_total_kb: number;
  max_concurrency: number;
  per_request_timeout_ms: number;
  total_timeout_ms: number;
}

export interface RuntimeGuard {
  timeout_ms: number;
  max_retries: number;
  cost_usd_limit: number;
  crawl?: CrawlGuard;
}

export interface CallConfig {
  model: ModelConfig;
  prompt: PromptConfig;
  runtime: RuntimeGuard;
}

export interface LengthValidation {
  min_chars: number;
  max_chars: number;
  per_slot?: Record<string, { min: number; max: number }>;
}

export interface ContinuityValidation {
  enabled: boolean;
  thresholds: {
    tone_shift: number;
    fact_drift: number;
  };
}

export interface EvidencePolicyValidation {
  required_for: string[];
  allow_empty: boolean;
}

export interface ValidationConfig {
  length: LengthValidation;
  continuity: ContinuityValidation;
  evidence_policy: EvidencePolicyValidation;
}

export interface StageBudgetLimits {
  max_cost: number;
  max_tokens: number;
}

export interface BudgetConfig {
  max_cost_per_run: number;
  max_tokens_per_run: number;
  alert_threshold_usd: number;
  per_stage: Record<string, StageBudgetLimits>;
}

export interface PresetConfig {
  description: string;
  overrides: PartialConfig;
}

export interface BrandPackConfig {
  $schema?: string;
  version: string;
  updated_at: string;
  global: GlobalConfig;
  calls: Record<string, CallConfig>;
  validation: ValidationConfig;
  budgets: BudgetConfig;
  presets: Record<string, PresetConfig>;
  banned_phrases: string[];
}

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export type PartialDeep<T> = T extends Primitive
  ? T | null
  : T extends Array<infer U>
    ? Array<PartialDeep<U>> | null
    : { [K in keyof T]?: PartialDeep<T[K]> } | null;

export type PartialConfig = PartialDeep<BrandPackConfig>;

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  config?: BrandPackConfig;
}

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

export function validateConfig(raw: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];

  if (!isRecord(raw)) {
    return invalid('root', 'Configuration must be an object');
  }

  if (typeof raw.version !== 'string') {
    errors.push(issue('version', 'version must be a string'));
  }

  if (typeof raw.updated_at !== 'string') {
    errors.push(issue('updated_at', 'updated_at must be an ISO date string'));
  }

  validateGlobal(raw.global, errors);
  validateCalls(raw.calls, errors);
  validateValidation(raw.validation, errors);
  validateBudgets(raw.budgets, errors);
  validateBanned(raw.banned_phrases, errors);
  validatePresets(raw.presets, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], config: raw as BrandPackConfig };

  function invalid(path: string, message: string): ValidationResult {
    return { valid: false, errors: [issue(path, message)] };
  }
}

function validateGlobal(
  value: unknown,
  errors: ValidationIssue[],
): asserts value is GlobalConfig {
  if (!isRecord(value)) {
    errors.push(issue('global', 'global must be an object'));
    return;
  }

  if (typeof value.provider !== 'string' || value.provider.length === 0) {
    errors.push(issue('global.provider', 'provider must be a non-empty string'));
  }

  if (!LOG_LEVELS.includes(value.log_level as LogLevel)) {
    errors.push(issue('global.log_level', 'log_level must be one of error|warn|info|debug'));
  }

  if (typeof value.cache_enabled !== 'boolean') {
    errors.push(issue('global.cache_enabled', 'cache_enabled must be boolean'));
  }

  if (!isRecord(value.cache_ttl_seconds)) {
    errors.push(issue('global.cache_ttl_seconds', 'cache_ttl_seconds must be an object'));
  } else {
    ['scrape', 'llm', 'image'].forEach((key) => {
      const ttl = value.cache_ttl_seconds[key as keyof CacheTtlSeconds];
      if (!isNumber(ttl)) {
        errors.push(issue(`global.cache_ttl_seconds.${key}`, 'must be a number'));
      }
    });
  }
}

function validateCalls(value: unknown, errors: ValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push(issue('calls', 'calls must be an object'));
    return;
  }

  if (Object.keys(value).length === 0) {
    errors.push(issue('calls', 'at least one call definition is required'));
  }

  for (const [callId, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      errors.push(issue(`calls.${callId}`, 'call config must be an object'));
      continue;
    }

    if (!isRecord(entry.model)) {
      errors.push(issue(`calls.${callId}.model`, 'model must be an object'));
    } else {
      if (entry.model.provider !== undefined && typeof entry.model.provider !== 'string') {
        errors.push(issue(`calls.${callId}.model.provider`, 'provider must be a string when present'));
      }
      if (typeof entry.model.name !== 'string') {
        errors.push(issue(`calls.${callId}.model.name`, 'name must be a string'));
      }
      if (!isNumber(entry.model.temperature)) {
        errors.push(issue(`calls.${callId}.model.temperature`, 'temperature must be a number'));
      }
      if (!isNumber(entry.model.max_tokens)) {
        errors.push(issue(`calls.${callId}.model.max_tokens`, 'max_tokens must be a number'));
      }
    }

    if (!isRecord(entry.prompt)) {
      errors.push(issue(`calls.${callId}.prompt`, 'prompt must be an object'));
    } else {
      if (typeof entry.prompt.system !== 'string') {
        errors.push(issue(`calls.${callId}.prompt.system`, 'system must be a string'));
      }
      if (typeof entry.prompt.user_template !== 'string') {
        errors.push(issue(`calls.${callId}.prompt.user_template`, 'user_template must be a string'));
      }
      if (!Array.isArray(entry.prompt.variables) || !entry.prompt.variables.every((v) => typeof v === 'string')) {
        errors.push(issue(`calls.${callId}.prompt.variables`, 'variables must be an array of strings'));
      }
      if (entry.prompt.outputs_expected !== undefined && !isNumber(entry.prompt.outputs_expected)) {
        errors.push(issue(`calls.${callId}.prompt.outputs_expected`, 'outputs_expected must be a number when present'));
      }
    }

    if (!isRecord(entry.runtime)) {
      errors.push(issue(`calls.${callId}.runtime`, 'runtime must be an object'));
    } else {
      ['timeout_ms', 'max_retries', 'cost_usd_limit'].forEach((key) => {
        const val = entry.runtime[key as keyof RuntimeGuard];
        if (!isNumber(val)) {
          errors.push(issue(`calls.${callId}.runtime.${key}`, 'must be a number'));
        }
      });
      if (entry.runtime.crawl !== undefined) {
        if (!isRecord(entry.runtime.crawl)) {
          errors.push(issue(`calls.${callId}.runtime.crawl`, 'crawl must be an object when provided'));
        } else {
          const crawl = entry.runtime.crawl;
          ['max_pages', 'max_total_kb', 'max_concurrency', 'per_request_timeout_ms', 'total_timeout_ms'].forEach((key) => {
            if (!isNumber(crawl[key as keyof CrawlGuard])) {
              errors.push(issue(`calls.${callId}.runtime.crawl.${key}`, 'must be a number'));
            }
          });
        }
      }
    }
  }
}

function validateValidation(value: unknown, errors: ValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push(issue('validation', 'validation must be an object'));
    return;
  }

  if (!isRecord(value.length)) {
    errors.push(issue('validation.length', 'length must be an object'));
  } else {
    ['min_chars', 'max_chars'].forEach((key) => {
      if (!isNumber(value.length[key as keyof LengthValidation])) {
        errors.push(issue(`validation.length.${key}`, 'must be a number'));
      }
    });
    if (value.length.per_slot !== undefined) {
      if (!isRecord(value.length.per_slot)) {
        errors.push(issue('validation.length.per_slot', 'per_slot must be an object'));
      } else {
        Object.entries(value.length.per_slot).forEach(([slot, limits]) => {
          if (!isRecord(limits)) {
            errors.push(issue(`validation.length.per_slot.${slot}`, 'limits must be an object'));
            return;
          }
          if (!isNumber(limits.min) || !isNumber(limits.max)) {
            errors.push(issue(`validation.length.per_slot.${slot}`, 'min and max must be numbers'));
          }
        });
      }
    }
  }

  if (!isRecord(value.continuity)) {
    errors.push(issue('validation.continuity', 'continuity must be an object'));
  } else {
    if (typeof value.continuity.enabled !== 'boolean') {
      errors.push(issue('validation.continuity.enabled', 'enabled must be boolean'));
    }
    if (!isRecord(value.continuity.thresholds)) {
      errors.push(issue('validation.continuity.thresholds', 'thresholds must be an object'));
    } else {
      ['tone_shift', 'fact_drift'].forEach((key) => {
        if (!isNumber(value.continuity.thresholds[key as keyof ContinuityValidation['thresholds']])) {
          errors.push(issue(`validation.continuity.thresholds.${key}`, 'must be a number'));
        }
      });
    }
  }

  if (!isRecord(value.evidence_policy)) {
    errors.push(issue('validation.evidence_policy', 'evidence_policy must be an object'));
  } else {
    if (!Array.isArray(value.evidence_policy.required_for) ||
      !value.evidence_policy.required_for.every((entry: unknown) => typeof entry === 'string')) {
      errors.push(issue('validation.evidence_policy.required_for', 'required_for must be an array of strings'));
    }
    if (typeof value.evidence_policy.allow_empty !== 'boolean') {
      errors.push(issue('validation.evidence_policy.allow_empty', 'allow_empty must be boolean'));
    }
  }
}

function validateBudgets(value: unknown, errors: ValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push(issue('budgets', 'budgets must be an object'));
    return;
  }

  ['max_cost_per_run', 'max_tokens_per_run', 'alert_threshold_usd'].forEach((key) => {
    if (!isNumber(value[key as keyof BudgetConfig])) {
      errors.push(issue(`budgets.${key}`, 'must be a number'));
    }
  });

  if (!isRecord(value.per_stage)) {
    errors.push(issue('budgets.per_stage', 'per_stage must be an object'));
  } else {
    Object.entries(value.per_stage).forEach(([stage, limits]) => {
      if (!isRecord(limits)) {
        errors.push(issue(`budgets.per_stage.${stage}`, 'limits must be an object'));
        return;
      }
      if (!isNumber(limits.max_cost) || !isNumber(limits.max_tokens)) {
        errors.push(issue(`budgets.per_stage.${stage}`, 'max_cost and max_tokens must be numbers'));
      }
    });
  }
}

function validateBanned(value: unknown, errors: ValidationIssue[]): void {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    errors.push(issue('banned_phrases', 'banned_phrases must be an array of strings'));
  }
}

function validatePresets(value: unknown, errors: ValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push(issue('presets', 'presets must be an object'));
    return;
  }

  Object.entries(value).forEach(([presetName, preset]) => {
    if (!isRecord(preset)) {
      errors.push(issue(`presets.${presetName}`, 'preset must be an object'));
      return;
    }
    if (typeof preset.description !== 'string') {
      errors.push(issue(`presets.${presetName}.description`, 'description must be a string'));
    }
    if (preset.overrides !== undefined && !isRecord(preset.overrides)) {
      errors.push(issue(`presets.${presetName}.overrides`, 'overrides must be an object when provided'));
    }
  });
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}
