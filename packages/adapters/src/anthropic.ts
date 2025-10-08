/**
 * Anthropic Adapter
 * 
 * Maps neutral LLM specs to Anthropic Messages API.
 * Supports Claude models: Haiku, Sonnet, Opus
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMAdapter,
  LLMSpec,
  AdapterResponse,
  ProviderPricing
} from '@brandpack/core';
import { AdapterError, AdapterErrorCode, calculateCost } from '@brandpack/core';

/**
 * Anthropic pricing (as of Jan 2025)
 * Source: https://www.anthropic.com/pricing
 */
const ANTHROPIC_PRICING: ProviderPricing = {
  provider: 'anthropic',
  models: {
    'claude-3-opus-20240229': {
      input_cost_per_1k_tokens: 0.015,
      output_cost_per_1k_tokens: 0.075
    },
    'claude-3-5-sonnet-20241022': {
      input_cost_per_1k_tokens: 0.003,
      output_cost_per_1k_tokens: 0.015
    },
    'claude-3-haiku-20240307': {
      input_cost_per_1k_tokens: 0.00025,
      output_cost_per_1k_tokens: 0.00125
    }
  }
};

/**
 * Anthropic adapter implementation
 */
export class AnthropicAdapter implements LLMAdapter {
  readonly provider = 'anthropic';
  private client: Anthropic;
  private model: string;
  
  constructor(config: { apiKey: string; model?: string }) {
    if (!config.apiKey) {
      throw new AdapterError(
        'Anthropic API key is required',
        'anthropic',
        AdapterErrorCode.AUTHENTICATION_FAILED
      );
    }
    
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
    
    this.model = config.model || 'claude-3-5-sonnet-20241022';
  }
  
  /**
   * Execute LLM spec
   */
  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    const startTime = Date.now();
    
    try {
      // Map neutral spec to Anthropic format
      const request = this.mapSpecToAnthropic(spec);
      
      // Call Anthropic API
      const response = await this.client.messages.create(request);
      
      const duration = Date.now() - startTime;
      
      // Extract text from response
      const outputs = this.extractOutputs(response, spec.response_format);
      
      // Calculate cost
      const cost = this.calculateCost(response.usage, this.model);
      
      return {
        outputs,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        provider: 'anthropic',
        model: response.model,
        cost_usd: cost,
        duration_ms: duration,
        raw_response: response,
        metadata: {
          cached: false,
          finish_reason: response.stop_reason || 'unknown'
        }
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
  
  /**
   * Estimate cost before execution
   */
  estimateCost(spec: LLMSpec): number {
    // Rough estimate: 4 chars per token
    const estimatedInputTokens = (spec.system_prompt.length + spec.user_prompt.length) / 4;
    const estimatedOutputTokens = spec.constraints.max_tokens || 1000;
    
    const pricing = ANTHROPIC_PRICING.models[this.model];
    if (!pricing) {
      return 0; // Unknown model
    }
    
    return calculateCost(
      {
        prompt_tokens: estimatedInputTokens,
        completion_tokens: estimatedOutputTokens,
        total_tokens: estimatedInputTokens + estimatedOutputTokens
      },
      {
        input_per_1k: pricing.input_cost_per_1k_tokens,
        output_per_1k: pricing.output_cost_per_1k_tokens
      }
    );
  }
  
  /**
   * Validate spec compatibility
   */
  validateSpec(spec: LLMSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check max tokens
    if (spec.constraints.max_tokens && spec.constraints.max_tokens > 4096) {
      errors.push('Anthropic max_tokens limit is 4096');
    }
    
    // Check temperature
    if (spec.constraints.temperature !== undefined) {
      if (spec.constraints.temperature < 0 || spec.constraints.temperature > 1) {
        errors.push('Temperature must be between 0 and 1');
      }
    }
    
    // Anthropic doesn't support frequency/presence penalties
    if (spec.constraints.frequency_penalty || spec.constraints.presence_penalty) {
      errors.push('Anthropic does not support frequency_penalty or presence_penalty');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return Object.keys(ANTHROPIC_PRICING.models);
  }
  
  /**
   * Map neutral spec to Anthropic Messages API format
   */
  private mapSpecToAnthropic(spec: LLMSpec): Anthropic.MessageCreateParams {
    const params: Anthropic.MessageCreateParams = {
      model: this.model,
      max_tokens: spec.constraints.max_tokens || 1024,
      messages: [
        {
          role: 'user',
          content: spec.user_prompt
        }
      ],
      system: spec.system_prompt
    };

    if (spec.response_format === 'json') {
      (params as any).response_format = { type: 'json' };
    } else if (spec.response_format === 'structured' && spec.schema) {
      (params as any).response_format = {
        type: 'json_schema',
        json_schema: {
          name: spec.task_id,
          schema: spec.schema
        }
      };
    }

    // Add optional parameters
    if (spec.constraints.temperature !== undefined) {
      params.temperature = spec.constraints.temperature;
    }
    
    if (spec.constraints.top_p !== undefined) {
      params.top_p = spec.constraints.top_p;
    }
    
    if (spec.constraints.stop_sequences && spec.constraints.stop_sequences.length > 0) {
      params.stop_sequences = spec.constraints.stop_sequences;
    }
    
    return params;
  }
  
  /**
   * Extract outputs from Anthropic response
   */
  private extractOutputs(
    response: Anthropic.Message,
    format: 'text' | 'json' | 'structured'
  ): string[] {
    const contentBlocks = Array.isArray(response.content) ? response.content : [];
    const textBlocks = contentBlocks
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text);

    const aggregatedText = ((response as any).output_text as string | undefined) ?? textBlocks.join('\n');

    if (format === 'text') {
      return [aggregatedText];
    }

    if (format === 'json' || format === 'structured') {
      const candidatePayloads: string[] = [];

      const responseJson = (response as any).output_json;
      if (responseJson !== undefined && responseJson !== null) {
        candidatePayloads.push(
          typeof responseJson === 'string' ? responseJson : JSON.stringify(responseJson)
        );
      }

      const toolBlocks = contentBlocks.filter(
        block => block.type === 'tool_use'
      ) as Anthropic.ToolUseBlock[];

      for (const tool of toolBlocks) {
        const payload = (tool as any).input ?? (tool as any).output_json ?? null;
        if (payload !== null && payload !== undefined) {
          candidatePayloads.push(
            typeof payload === 'string' ? payload : JSON.stringify(payload)
          );
        }
      }

      if (aggregatedText) {
        candidatePayloads.push(aggregatedText);
      }

      const validOutputs: string[] = [];

      for (const candidate of candidatePayloads) {
        const cleaned = this.cleanJsonPayload(candidate);
        try {
          JSON.parse(cleaned);
          validOutputs.push(cleaned);
        } catch {
          continue;
        }
      }

      if (validOutputs.length > 0) {
        return validOutputs;
      }

      throw new AdapterError(
        'Response is not valid JSON',
        'anthropic',
        AdapterErrorCode.INVALID_REQUEST,
        { response: aggregatedText }
      );
    }

    return [aggregatedText];
  }

  private cleanJsonPayload(payload: string): string {
    return payload
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();
  }
  
  /**
   * Calculate actual cost from usage
   */
  private calculateCost(usage: { input_tokens: number; output_tokens: number }, model: string): number {
    const pricing = ANTHROPIC_PRICING.models[model];
    if (!pricing) {
      console.warn(`Unknown Anthropic model pricing: ${model}`);
      return 0;
    }
    
    return calculateCost(
      {
        prompt_tokens: usage.input_tokens,
        completion_tokens: usage.output_tokens,
        total_tokens: usage.input_tokens + usage.output_tokens
      },
      {
        input_per_1k: pricing.input_cost_per_1k_tokens,
        output_per_1k: pricing.output_cost_per_1k_tokens
      }
    );
  }
  
  /**
   * Handle and standardize Anthropic errors
   */
  private handleError(error: any): AdapterError {
    // Anthropic SDK error
    if (error instanceof Anthropic.APIError) {
      let code = AdapterErrorCode.UNKNOWN_ERROR;
      
      if (error.status === 401) {
        code = AdapterErrorCode.AUTHENTICATION_FAILED;
      } else if (error.status === 429) {
        code = AdapterErrorCode.RATE_LIMITED;
      } else if (error.status === 400) {
        code = AdapterErrorCode.INVALID_REQUEST;
      } else if (error.status === 408 || error.status === 504) {
        code = AdapterErrorCode.TIMEOUT;
      }
      
      return new AdapterError(
        error.message || 'Anthropic API error',
        'anthropic',
        code,
        {
          status: error.status,
          type: error.type,
          error: error.error
        }
      );
    }
    
    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new AdapterError(
        'Network error connecting to Anthropic',
        'anthropic',
        AdapterErrorCode.NETWORK_ERROR,
        { originalError: error.message }
      );
    }
    
    // Unknown error
    return new AdapterError(
      error.message || 'Unknown error',
      'anthropic',
      AdapterErrorCode.UNKNOWN_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Create Anthropic adapter from environment
 */
export function createAnthropicAdapter(model?: string): AnthropicAdapter {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is required. ' +
      'Get your API key at https://console.anthropic.com/'
    );
  }
  
  return new AnthropicAdapter({ apiKey, model });
}

