import {
  mergeConfigLayers,
  DEFAULT_FALLBACK_CONFIG,
} from './merger';
import type {
  BrandPackConfig,
  PartialConfig,
} from './validator';

export interface EffectiveConfigResolveOptions {
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

export function resolveEffectiveConfig(
  config: BrandPackConfig,
  callId: string,
  options: EffectiveConfigResolveOptions = {},
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
