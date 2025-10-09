import type {
  AdapterResponse,
  ImageBrief,
  ImageConfig,
  AdapterImageResult as ImageResult,
  LLMSpec,
} from '@brandpack/core';
import { AdapterError, AdapterErrorCode } from '@brandpack/core';
import { llmRegistry, imageRegistry } from './registry.js';

function normalizeProvider(
  requested: string | undefined,
  fallback: string,
): string {
  return requested && requested.trim().length > 0 ? requested : fallback;
}

export async function routeSpec(
  spec: LLMSpec,
  provider?: string,
): Promise<AdapterResponse> {
  const desired = normalizeProvider(provider, 'noop-llm');
  
  // Debug logging
  console.log(`[ROUTER] Task: ${spec.task_id} | Requested provider: ${provider} | Using: ${desired}`);
  console.log(`[ROUTER] Available adapters: ${Array.from(llmRegistry.list()).join(', ')}`);
  
  const adapter = llmRegistry.get(desired);

  if (!adapter) {
    throw new AdapterError(
      `No LLM adapter registered for provider "${desired}".`,
      desired,
      AdapterErrorCode.MODEL_NOT_FOUND,
    );
  }

  const validation = adapter.validateSpec(spec);
  if (!validation.valid) {
    throw new AdapterError(
      `Invalid spec: ${validation.errors.join(', ')}`,
      adapter.provider,
      AdapterErrorCode.INVALID_REQUEST,
      validation.errors,
    );
  }

  return adapter.execute(spec);
}

export async function routeImageGeneration(
  brief: ImageBrief,
  config: ImageConfig,
  provider?: string,
): Promise<ImageResult> {
  const desired = normalizeProvider(provider ?? config.provider, 'noop-image');
  const adapter = imageRegistry.get(desired);

  if (!adapter) {
    throw new AdapterError(
      `No image adapter registered for provider "${desired}".`,
      desired,
      AdapterErrorCode.MODEL_NOT_FOUND,
    );
  }

  return adapter.generate(brief, config);
}
