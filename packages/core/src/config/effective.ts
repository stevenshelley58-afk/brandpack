import { loadPromptsConfig, type LoadConfigOptions } from './loader.js';
import {
  validateConfig,
  type BrandPackConfig,
  type PartialConfig,
  type ValidationIssue,
} from './validator.js';
import {
  mergeConfigLayers,
  DEFAULT_FALLBACK_CONFIG,
} from './merger.js';

export interface EffectiveConfigOptions extends LoadConfigOptions {
  preset?: string;
  overrides?: PartialConfig | null;
  fallback?: BrandPackConfig;
}

export interface EffectiveConfigResult {
  callId: string;
  merged: BrandPackConfig;
  call: BrandPackConfig['calls'][string];
  global: BrandPackConfig['global'];
  layers: {
    fallback: BrandPackConfig;
    prompts: BrandPackConfig;
    preset?: PartialConfig;
    override?: PartialConfig | null;
  };
}

export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationIssue[],
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export async function getEffectiveConfig(
  callId: string,
  options: EffectiveConfigOptions = {},
): Promise<EffectiveConfigResult> {
  const raw = await loadPromptsConfig(options);
  const validation = validateConfig(raw);

  if (!validation.valid || !validation.config) {
    const details = validation.errors
      .map((err) => `${err.path}: ${err.message}`)
      .join('; ');
    throw new ConfigValidationError(
      `Invalid configuration: ${details}`,
      validation.errors,
    );
  }

  return resolveEffectiveConfig(validation.config, callId, options);
}

export function resolveEffectiveConfig(
  config: BrandPackConfig,
  callId: string,
  options: Omit<EffectiveConfigOptions, 'configPath' | 'forceReload'> = {},
): EffectiveConfigResult {
  const fallback = options.fallback ?? DEFAULT_FALLBACK_CONFIG;
  const presetOverrides =
    options.preset && config.presets[options.preset]
      ? config.presets[options.preset].overrides
      : null;

  const merged = mergeConfigLayers({
    fallback,
    base: config,
    preset: presetOverrides,
    override: options.overrides ?? null,
  });

  const callConfig = merged.calls[callId];

  if (!callConfig) {
    throw new Error(`Unknown call id: ${callId}`);
  }

  return {
    callId,
    merged,
    call: callConfig,
    global: merged.global,
    layers: {
      fallback,
      prompts: config,
      preset: presetOverrides ?? undefined,
      override: options.overrides ?? undefined,
    },
  };
}
