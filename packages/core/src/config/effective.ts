import { loadPromptsConfig, type LoadConfigOptions } from './loader';
import {
  validateConfig,
  type ValidationIssue,
} from './validator';
import {
  resolveEffectiveConfig,
  type EffectiveConfigResult,
  type EffectiveConfigResolveOptions,
} from './effective-core';

export interface EffectiveConfigOptions
  extends LoadConfigOptions,
    EffectiveConfigResolveOptions {}

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
