import {
  type BrandPackConfig,
  type PartialConfig,
  type PartialDeep,
} from './validator';

export const DEFAULT_FALLBACK_CONFIG: BrandPackConfig = {
  version: 'fallback',
  updated_at: '1970-01-01T00:00:00.000Z',
  global: {
    provider: 'anthropic',
    log_level: 'info',
    cache_enabled: true,
    cache_ttl_seconds: {
      scrape: 604800,
      llm: 86400,
      image: 86400,
    },
  },
  calls: {},
  validation: {
    length: {
      min_chars: 0,
      max_chars: 1000,
    },
    continuity: {
      enabled: true,
      thresholds: {
        tone_shift: 1,
        fact_drift: 1,
      },
    },
    evidence_policy: {
      required_for: [],
      allow_empty: false,
    },
  },
  budgets: {
    max_cost_per_run: 0,
    max_tokens_per_run: 0,
    alert_threshold_usd: 0,
    per_stage: {},
  },
  presets: {},
  banned_phrases: [],
};

export interface MergeLayers {
  fallback: BrandPackConfig;
  base: BrandPackConfig;
  preset?: PartialConfig | null;
  override?: PartialConfig | null;
}

export function mergeConfigLayers(layers: MergeLayers): BrandPackConfig {
  let merged = clone(layers.fallback);

  merged = mergeLayer(merged, layers.base) as BrandPackConfig;
  merged = mergeLayer(merged, layers.preset ?? null) as BrandPackConfig;
  merged = mergeLayer(merged, layers.override ?? null) as BrandPackConfig;

  return merged;
}

function mergeLayer<T>(
  target: T,
  layer: PartialDeep<T> | T | null,
): T {
  if (layer === null || layer === undefined) {
    return target;
  }

  return deepMerge(target, layer as PartialDeep<T>);
}

function deepMerge<T>(
  target: T,
  source: PartialDeep<T> | null | undefined,
): T {
  if (source === null || source === undefined) {
    return target;
  }

  if (Array.isArray(source)) {
    return source.slice() as unknown as T;
  }

  if (typeof source !== 'object') {
    return source as T;
  }

  const base =
    typeof target === 'object' && target !== null && !Array.isArray(target)
      ? { ...(target as Record<string, unknown>) }
      : {};

  for (const [key, value] of Object.entries(source)) {
    if (value === null || value === undefined) {
      continue;
    }

    const current = (base as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      (base as Record<string, unknown>)[key] = value.slice();
      continue;
    }

    if (isObject(value)) {
      (base as Record<string, unknown>)[key] = deepMerge(
        isObject(current) ? current : {},
        value as PartialDeep<unknown>,
      );
      continue;
    }

    (base as Record<string, unknown>)[key] = value;
  }

  return base as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
