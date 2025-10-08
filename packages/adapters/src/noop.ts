import type {
  AdapterResponse,
  ImageAdapter,
  ImageBrief,
  ImageConfig,
  ImageResult,
  LLMAdapter,
  LLMSpec,
  TokenUsage,
} from '@brandpack/core';

function now() {
  return Date.now();
}

function usageFromSpec(spec: LLMSpec): TokenUsage {
  const promptTokens = Math.ceil(
    (spec.system_prompt.length + spec.user_prompt.length) / 4,
  );
  return {
    prompt_tokens: promptTokens,
    completion_tokens: 32,
    total_tokens: promptTokens + 32,
  };
}

export class NoopLLMAdapter implements LLMAdapter {
  readonly provider = 'noop-llm';

  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    const start = now();
    const usage = usageFromSpec(spec);
    const output = [
      `[noop::${spec.task_id}] ${spec.response_format.toUpperCase()} response placeholder`,
    ];

    return {
      outputs: output,
      usage,
      provider: this.provider,
      model: 'noop-llm-v1',
      cost_usd: 0,
      duration_ms: now() - start,
      raw_response: {
        echo: {
          system_prompt: spec.system_prompt,
          user_prompt: spec.user_prompt,
        },
      },
      metadata: {
        finish_reason: 'stop',
        cached: false,
      },
    };
  }

  estimateCost(): number {
    return 0;
  }

  validateSpec(spec: LLMSpec) {
    const errors: string[] = [];
    if (!spec.task_id) errors.push('task_id is required');
    if (!spec.user_prompt) errors.push('user_prompt is required');
    return { valid: errors.length === 0, errors };
  }

  getAvailableModels(): string[] {
    return ['noop-llm-v1'];
  }
}

export class NoopImageAdapter implements ImageAdapter {
  readonly provider = 'noop-image';

  async generate(brief: ImageBrief, config: ImageConfig): Promise<ImageResult> {
    const start = now();
    return {
      url: `https://example.com/noop/${brief.id}.png`,
      provider: this.provider,
      model: 'noop-image-v1',
      cost_usd: 0,
      duration_ms: now() - start,
      metadata: {
        resolution: config.resolution,
        aspect_ratio: config.aspect_ratio,
        file_size_kb: 42,
        format: config.format,
        seed: config.seed,
      },
      raw_response: {
        prompt: brief.prompt,
        negative_prompt: brief.negative_prompt,
      },
    };
  }

  estimateCost(): number {
    return 0;
  }

  getAvailableModels(): string[] {
    return ['noop-image-v1'];
  }
}
