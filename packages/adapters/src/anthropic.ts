import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParams } from '@anthropic-ai/sdk/resources/messages';
import type {
  AdapterResponse,
  LLMAdapter,
  LLMSpec,
  TokenUsage,
  ResponseFormat,
} from '@brandpack/core';
import {
  AdapterError,
  AdapterErrorCode,
  calculateCost,
} from '@brandpack/core';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

const ANTHROPIC_PRICING: Record<
  string,
  { input_per_1k: number; output_per_1k: number }
> = {
  'claude-3-5-sonnet-20241022': { input_per_1k: 0.003, output_per_1k: 0.015 },
  'claude-3-5-haiku-20241022': { input_per_1k: 0.0008, output_per_1k: 0.004 },
  'claude-3-opus-20240229': { input_per_1k: 0.015, output_per_1k: 0.075 },
};

interface AnthropicAdapterOptions {
  apiKey?: string;
  defaultModel?: string;
  requestTimeoutMs?: number;
}

export class AnthropicLLMAdapter implements LLMAdapter {
  readonly provider = 'anthropic';
  private readonly client: Anthropic;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(options: AnthropicAdapterOptions = {}) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required to initialize the Anthropic adapter.',
      );
    }

    this.client = new Anthropic({ apiKey });
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.timeoutMs = options.requestTimeoutMs ?? 45_000;
  }

  getAvailableModels(): string[] {
    return Object.keys(ANTHROPIC_PRICING);
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
    if (!ANTHROPIC_PRICING[model]) {
      errors.push(`Unsupported model "${model}" for Anthropic adapter.`);
    }
    if (
      spec.constraints.temperature !== undefined &&
      (spec.constraints.temperature < 0 || spec.constraints.temperature > 1)
    ) {
      errors.push('temperature must be between 0 and 1');
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
    const start = Date.now();

    try {
      const params = this.mapSpecToAnthropic(spec, model);

      // Non-streaming request - cast to Message type
      const response = await this.client.messages.create(
        params as MessageCreateParams,
        { timeout: this.timeoutMs },
      ) as Anthropic.Message;

      const usage = this.normalizeUsage(response.usage);
      const outputs = this.extractOutputs(response, spec.response_format);

      return {
        outputs: outputs.length > 0 ? outputs : [''],
        usage,
        provider: this.provider,
        model,
        cost_usd: this.computeCost(model, usage),
        duration_ms: Date.now() - start,
        raw_response: response,
        metadata: {
          finish_reason: response.stop_reason ?? 'stop',
          cached: false,
        },
      };
    } catch (error) {
      throw this.normalizeError(error, model);
    }
  }

  private mapSpecToAnthropic(
    spec: LLMSpec,
    model: string,
  ): MessageCreateParams {
    const params: MessageCreateParams = {
      model,
      max_tokens: spec.constraints.max_tokens ?? 1024,
      system: spec.system_prompt,
      messages: [
        {
          role: 'user',
          content: spec.user_prompt,
        },
      ],
      temperature: spec.constraints.temperature,
      top_p: spec.constraints.top_p,
      stop_sequences: spec.constraints.stop_sequences,
    };

    const responseFormat = this.resolveResponseFormat(spec);
    if (responseFormat) {
      (params as any).response_format = responseFormat;
    }

    return params;
  }

  private resolveResponseFormat(
    spec: LLMSpec,
  ): Record<string, unknown> | undefined {
    if (spec.response_format === 'json') {
      return { type: 'json' };
    }

    if (spec.response_format === 'structured' && spec.schema) {
      return {
        type: 'json_schema',
        json_schema: {
          name: spec.task_id ?? 'structured_output',
          schema: spec.schema,
        },
      };
    }

    return undefined;
  }

  private extractOutputs(
    response: Anthropic.Message,
    format: ResponseFormat,
  ): string[] {
    const blocks = Array.isArray(response.content) ? response.content : [];

    if (format === 'structured') {
      const toolBlocks = blocks.filter(
        (block: any) => block?.type === 'tool_use',
      );

      if (toolBlocks.length === 0) {
        throw new AdapterError(
          'Anthropic structured response missing tool output blocks.',
          this.provider,
          AdapterErrorCode.INVALID_REQUEST,
          response,
        );
      }

      return toolBlocks.map((block: any) => {
        const payload =
          block?.input ?? block?.output ?? block?.json ?? block?.content;

        if (!payload || typeof payload !== 'object') {
          throw new AdapterError(
            'Anthropic structured response payload malformed.',
            this.provider,
            AdapterErrorCode.INVALID_REQUEST,
            block,
          );
        }

        try {
          return JSON.stringify(payload);
        } catch (error) {
          throw new AdapterError(
            'Failed to serialize Anthropic structured payload.',
            this.provider,
            AdapterErrorCode.INVALID_REQUEST,
            error,
          );
        }
      });
    }

    const parts: string[] = [];

    for (const block of blocks as any[]) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        parts.push(block.text);
      } else if (
        block?.type === 'json' &&
        block.json !== null &&
        typeof block.json === 'object'
      ) {
        parts.push(JSON.stringify(block.json));
      }
    }

    const content = parts.join('\n').trim();
    return content ? [content] : [];
  }

  private normalizeUsage(
    usage: { input_tokens?: number; output_tokens?: number } | undefined,
  ): TokenUsage {
    if (!usage) {
      return {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
    }
    return {
      prompt_tokens: usage.input_tokens ?? 0,
      completion_tokens: usage.output_tokens ?? 0,
      total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    };
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

  private computeCost(model: string, usage: TokenUsage): number {
    const pricing = this.resolvePricing(model);
    return calculateCost(usage, pricing);
  }

  private resolveModel(spec: LLMSpec): string {
    const requested =
      (spec.metadata?.model as string | undefined) ??
      (spec.metadata?.provider_model as string | undefined);
    return requested && typeof requested === 'string' && requested.length > 0
      ? requested
      : this.defaultModel;
  }

  private resolvePricing(model: string) {
    return (
      ANTHROPIC_PRICING[model] ??
      ANTHROPIC_PRICING[this.defaultModel] ?? {
        input_per_1k: 0,
        output_per_1k: 0,
      }
    );
  }

  private normalizeError(error: unknown, model: string): AdapterError {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401 || error.status === 403) {
        return new AdapterError(
          'Anthropic rejected the API key. Verify ANTHROPIC_API_KEY.',
          this.provider,
          AdapterErrorCode.AUTHENTICATION_FAILED,
          error,
        );
      }
      if (error.status === 429) {
        return new AdapterError(
          'Anthropic rate limit exceeded.',
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
          'Anthropic request timed out.',
          this.provider,
          AdapterErrorCode.TIMEOUT,
          error,
        );
      }
    }

    if (error instanceof Error && /abort/i.test(error.name)) {
      return new AdapterError(
        'Anthropic request aborted by timeout controller.',
        this.provider,
        AdapterErrorCode.TIMEOUT,
        error,
      );
    }

    return new AdapterError(
      `Anthropic adapter failed for model "${model}".`,
      this.provider,
      AdapterErrorCode.UNKNOWN_ERROR,
      error,
    );
  }
}
