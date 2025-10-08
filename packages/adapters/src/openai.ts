import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import type {
  AdapterResponse,
  LLMAdapter,
  LLMSpec,
  TokenUsage,
} from '@brandpack/core';
import {
  AdapterError,
  AdapterErrorCode,
  calculateCost,
} from '@brandpack/core/types/adapter';

const DEFAULT_MODEL = 'gpt-4o-mini';

const OPENAI_PRICING: Record<
  string,
  { input_per_1k: number; output_per_1k: number }
> = {
  'gpt-4o-mini': { input_per_1k: 0.00015, output_per_1k: 0.0006 },
  'gpt-4o': { input_per_1k: 0.0025, output_per_1k: 0.01 },
  'gpt-4o-mini-2024-07-18': { input_per_1k: 0.00015, output_per_1k: 0.0006 },
  'gpt-4o-2024-08-06': { input_per_1k: 0.0025, output_per_1k: 0.01 },
};

interface OpenAIAdapterOptions {
  apiKey?: string;
  defaultModel?: string;
  requestTimeoutMs?: number;
}

export class OpenAILLMAdapter implements LLMAdapter {
  readonly provider = 'openai';
  private readonly client: OpenAI;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAIAdapterOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is required to initialize the OpenAI adapter.',
      );
    }

    this.client = new OpenAI({ apiKey });
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.timeoutMs = options.requestTimeoutMs ?? 45_000;
  }

  getAvailableModels(): string[] {
    return Object.keys(OPENAI_PRICING);
  }

  estimateCost(spec: LLMSpec): number {
    const usage = this.estimateUsage(spec);
    const pricing = this.resolvePricing(this.resolveModel(spec));
    return calculateCost(usage, pricing);
  }

  validateSpec(spec: LLMSpec) {
    const errors: string[] = [];
    if (!spec.system_prompt) errors.push('system_prompt is required');
    if (!spec.user_prompt) errors.push('user_prompt is required');
    const model = this.resolveModel(spec);
    if (!OPENAI_PRICING[model]) {
      errors.push(`Unsupported model "${model}" for OpenAI adapter.`);
    }
    if (
      spec.constraints.temperature !== undefined &&
      (spec.constraints.temperature < 0 || spec.constraints.temperature > 2)
    ) {
      errors.push('temperature must be between 0 and 2 for OpenAI.');
    }
    if (
      spec.constraints.top_p !== undefined &&
      (spec.constraints.top_p < 0 || spec.constraints.top_p > 1)
    ) {
      errors.push('top_p must be between 0 and 1');
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    const validation = this.validateSpec(spec);
    if (!validation.valid) {
      throw new AdapterError(
        `Invalid spec: ${validation.errors.join(', ')}`,
        this.provider,
        AdapterErrorCode.INVALID_REQUEST,
        validation.errors,
      );
    }

    const model = this.resolveModel(spec);
    const params = this.buildRequest(spec, model);
    const start = Date.now();

    try {
      const response = await this.client.chat.completions.create(params, {
        timeout: this.timeoutMs,
      });

      const usage = this.normalizeUsage(response.usage);
      const outputs = (response.choices ?? [])
        .map((choice) => choice.message?.content ?? '')
        .filter(Boolean);

      return {
        outputs: outputs.length > 0 ? outputs : [''],
        usage,
        provider: this.provider,
        model,
        cost_usd: this.computeCost(model, usage),
        duration_ms: Date.now() - start,
        raw_response: response,
        metadata: {
          finish_reason: response.choices?.[0]?.finish_reason ?? 'stop',
          cached: false,
        },
      };
    } catch (error) {
      throw this.normalizeError(error, model);
    }
  }

  private buildRequest(
    spec: LLMSpec,
    model: string,
  ): ChatCompletionCreateParamsNonStreaming {
    const params: ChatCompletionCreateParamsNonStreaming = {
      model,
      messages: [
        { role: 'system', content: spec.system_prompt },
        { role: 'user', content: spec.user_prompt },
      ],
      max_tokens: spec.constraints.max_tokens ?? 1024,
      temperature: spec.constraints.temperature,
      top_p: spec.constraints.top_p,
      stop: spec.constraints.stop_sequences,
    };

    if (spec.response_format === 'json') {
      (params as Record<string, unknown>).response_format = {
        type: 'json_object',
      };
    } else if (spec.response_format === 'structured' && spec.schema) {
      (params as Record<string, unknown>).response_format = {
        type: 'json_schema',
        json_schema: {
          name: spec.task_id ?? 'structured_output',
          schema: spec.schema,
        },
      };
    }

    return params;
  }

  private estimateUsage(spec: LLMSpec): TokenUsage {
    const promptTokens = Math.ceil(
      (spec.system_prompt.length + spec.user_prompt.length) / 4,
    );
    const completionBudget = spec.constraints.max_tokens ?? 1024;
    return {
      prompt_tokens: promptTokens,
      completion_tokens: completionBudget,
      total_tokens: promptTokens + completionBudget,
    };
  }

  private normalizeUsage(
    usage:
      | { prompt_tokens?: number | null; completion_tokens?: number | null; total_tokens?: number | null }
      | null
      | undefined,
  ): TokenUsage {
    if (!usage) {
      return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    }
    return {
      prompt_tokens: usage.prompt_tokens ?? 0,
      completion_tokens: usage.completion_tokens ?? 0,
      total_tokens:
        usage.total_tokens ??
        (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
    };
  }

  private computeCost(model: string, usage: TokenUsage): number {
    const pricing = this.resolvePricing(model);
    return calculateCost(usage, pricing);
  }

  private resolveModel(spec: LLMSpec): string {
    const requested =
      (spec.metadata?.model as string | undefined) ??
      spec.metadata?.provider_model;
    return requested && requested.length > 0 ? requested : this.defaultModel;
  }

  private resolvePricing(model: string) {
    return (
      OPENAI_PRICING[model] ??
      OPENAI_PRICING[this.defaultModel] ?? {
        input_per_1k: 0,
        output_per_1k: 0,
      }
    );
  }

  private normalizeError(error: unknown, model: string): AdapterError {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401 || error.status === 403) {
        return new AdapterError(
          'OpenAI rejected the API key. Verify OPENAI_API_KEY.',
          this.provider,
          AdapterErrorCode.AUTHENTICATION_FAILED,
          error,
        );
      }
      if (error.status === 429) {
        return new AdapterError(
          'OpenAI rate limit exceeded.',
          this.provider,
          AdapterErrorCode.RATE_LIMITED,
          error,
        );
      }
      if (error.status === 400) {
        return new AdapterError(
          error.message,
          this.provider,
          AdapterErrorCode.INVALID_REQUEST,
          error,
        );
      }
      if (error.status === 408 || error.status === 504) {
        return new AdapterError(
          'OpenAI request timed out.',
          this.provider,
          AdapterErrorCode.TIMEOUT,
          error,
        );
      }
    }

    if (error instanceof Error && /abort/i.test(error.name)) {
      return new AdapterError(
        'OpenAI request aborted by timeout controller.',
        this.provider,
        AdapterErrorCode.TIMEOUT,
        error,
      );
    }

    return new AdapterError(
      `OpenAI adapter failed for model "${model}".`,
      this.provider,
      AdapterErrorCode.UNKNOWN_ERROR,
      error,
    );
  }
}
