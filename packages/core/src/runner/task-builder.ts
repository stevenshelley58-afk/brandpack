/**
 * Task Builder - Creates LLMSpecs from config for each task
 * 
 * Reads prompts.json and builds provider-agnostic LLMSpecs
 * that can be executed through any adapter.
 */

import type { LLMSpec } from '../types/spec';
import type { PromptsConfig } from '../types/config';
import type { KernelPayload } from '../kernel/compressor';

/**
 * Build a spec for scrape.review_summarize
 * This task scrapes a domain and generates a brand review summary
 */
export function buildScrapeReviewSpec(
  config: PromptsConfig,
  kernel: KernelPayload,
  runId?: string
): LLMSpec {
  const call = config.calls['scrape.review_summarize'];
  if (!call) {
    throw new Error('scrape.review_summarize not found in config');
  }

  const kernelJson = JSON.stringify(kernel, null, 2);
  const userPrompt = call.prompt.user_template.replace('{kernel}', kernelJson);

  return {
    task_id: 'scrape.review_summarize',
    system_prompt: call.prompt.system,
    user_prompt: userPrompt,
    response_format: 'json',
    constraints: {
      max_tokens: call.model.max_tokens,
      temperature: call.model.temperature,
      top_p: call.model.top_p,
    },
    metadata: {
      run_id: runId,
      task: 'scrape.review_summarize',
      domain: kernel.domain,
      kernel_hash: kernel.content_hash,
    },
  };
}

/**
 * Build a spec for ideas.generate
 * Generates 20 campaign ideas from brand kernel
 */
export function buildIdeasGenerateSpec(
  config: PromptsConfig,
  kernel: KernelPayload,
  runId?: string
): LLMSpec {
  const call = config.calls['ideas.generate'];
  if (!call) {
    throw new Error('ideas.generate not found in config');
  }

  const kernelJson = JSON.stringify(kernel, null, 2);
  const userPrompt = call.prompt.user_template.replace('{kernel}', kernelJson);

  return {
    task_id: 'ideas.generate',
    system_prompt: call.prompt.system,
    user_prompt: userPrompt,
    response_format: 'json',
    constraints: {
      max_tokens: call.model.max_tokens,
      temperature: call.model.temperature,
      top_p: call.model.top_p,
    },
    metadata: {
      run_id: runId,
      task: 'ideas.generate',
      domain: kernel.domain,
      kernel_hash: kernel.content_hash,
    },
  };
}

/**
 * Build a spec for copy.generate
 * Generates 5 copy blocks from a selected idea
 */
export function buildCopyGenerateSpec(
  config: PromptsConfig,
  kernel: KernelPayload,
  idea: Record<string, unknown>,
  runId?: string
): LLMSpec {
  const call = config.calls['copy.generate'];
  if (!call) {
    throw new Error('copy.generate not found in config');
  }

  const kernelJson = JSON.stringify(kernel, null, 2);
  const ideaJson = JSON.stringify(idea, null, 2);
  
  let userPrompt = call.prompt.user_template;
  userPrompt = userPrompt.replace('{kernel}', kernelJson);
  userPrompt = userPrompt.replace('{idea}', ideaJson);

  return {
    task_id: 'copy.generate',
    system_prompt: call.prompt.system,
    user_prompt: userPrompt,
    response_format: 'json',
    constraints: {
      max_tokens: call.model.max_tokens,
      temperature: call.model.temperature,
      top_p: call.model.top_p,
    },
    metadata: {
      run_id: runId,
      task: 'copy.generate',
      domain: kernel.domain,
      kernel_hash: kernel.content_hash,
    },
  };
}

/**
 * Build a spec for image.brief_generate
 * Creates an image brief from kernel and idea
 */
export function buildImageBriefSpec(
  config: PromptsConfig,
  kernel: KernelPayload,
  idea: Record<string, unknown>,
  runId?: string
): LLMSpec {
  const call = config.calls['image.brief_generate'];
  if (!call) {
    throw new Error('image.brief_generate not found in config');
  }

  const kernelJson = JSON.stringify(kernel, null, 2);
  const ideaJson = JSON.stringify(idea, null, 2);
  
  let userPrompt = call.prompt.user_template;
  userPrompt = userPrompt.replace('{kernel}', kernelJson);
  userPrompt = userPrompt.replace('{idea}', ideaJson);

  return {
    task_id: 'image.brief_generate',
    system_prompt: call.prompt.system,
    user_prompt: userPrompt,
    response_format: 'json',
    constraints: {
      max_tokens: call.model.max_tokens,
      temperature: call.model.temperature,
      top_p: call.model.top_p,
    },
    metadata: {
      run_id: runId,
      task: 'image.brief_generate',
      domain: kernel.domain,
      kernel_hash: kernel.content_hash,
    },
  };
}

/**
 * Get provider and model from config for a specific call
 */
export function getCallConfig(config: PromptsConfig, callId: string) {
  const call = config.calls[callId];
  if (!call) {
    throw new Error(`Call ${callId} not found in config`);
  }

  return {
    provider: call.model.provider,
    model: call.model.name,
    runtime: call.runtime,
  };
}

