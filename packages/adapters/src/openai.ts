/**
 * OpenAI Adapter
 * 
 * Maps neutral LLM specs to OpenAI Chat Completions API.
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5 models
 */

import OpenAI from 'openai';
import type {
  LLMAdapter,
  LLMSpec,
  AdapterResponse,
  ProviderPricing
} from '@brandpack/core';
import { AdapterError, AdapterErrorCode, calculateCost } from '@brandpack/core';

/**
 * OpenAI pricing (as of Jan 2025)
 * Source: https://openai.com/pricing
 */
const OPENAI_PRICING: ProviderPricing = {
  provider: 'openai',
  models: {
    'gpt-4o': {
      input_cost_per_1k_tokens: 0.005,
      output_cost_per_1k_tokens: 0.015
    },
    'gpt-4o-mini': {
      input_cost_per_1k_tokens: 0.00015,
      output_cost_per_1k_tokens: 0.0006
    },
    'gpt-4-turbo': {
      input_cost_per_1k_tokens: 0.01,
      output_cost_per_1k_tokens: 0.03
    },
    'gpt-4': {
      input_cost_per_1k_tokens: 0.03,
      output_cost_per_1k_tokens: 0.06
    },
    'gpt-3.5-turbo': {
      input_cost_per_1k_tokens: 0.0005,
      output_cost_per_1k_tokens: 0.0015
    }
  }
};

/**
 * OpenAI adapter implementation
 */
export class OpenAIAdapter implements LLMAdapter {
  readonly provider = 'openai';
  private client: OpenAI;
  private model: string;
  
  constructor(config: { apiKey: string; model?: string }) {
    if (!config.apiKey) {
      throw new AdapterError(
        'OpenAI API key is required',
        'openai',
        AdapterErrorCode.AUTHENTICATION_FAILED
      );
    }
    
    this.client = new OpenAI({
      apiKey: config.apiKey
    });
    
    this.model = config.model || 'gpt-4o-mini';
  }
  
  /**
   * Execute LLM spec
   */
  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    const startTime = Date.now();
    
    try {
      // Map neutral spec to OpenAI format
      const request = this.mapSpecToOpenAI(spec);
      
      // Call OpenAI API
      const response = await this.client.chat.completions.create(request);
      
      const duration = Date.now() - startTime;
      
      // Extract text from response
      const outputs = this.extractOutputs(response, spec.response_format);
      
      // Calculate cost
      const cost = this.calculateCost(response.usage, this.model);
      
      return {
        outputs,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        provider: 'openai',
        model: response.model,
        cost_usd: cost,
        duration_ms: duration,
        raw_response: response,
        metadata: {
          cached: false,
          finish_reason: response.choices[0]?.finish_reason || 'unknown'
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
    
    const pricing = OPENAI_PRICING.models[this.model];
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
    
    // Check temperature
    if (spec.constraints.temperature !== undefined) {
      if (spec.constraints.temperature < 0 || spec.constraints.temperature > 2) {
        errors.push('OpenAI temperature must be between 0 and 2');
      }
    }
    
    // Check frequency/presence penalties
    if (spec.constraints.frequency_penalty !== undefined) {
      if (spec.constraints.frequency_penalty < -2 || spec.constraints.frequency_penalty > 2) {
        errors.push('frequency_penalty must be between -2 and 2');
      }
    }
    
    if (spec.constraints.presence_penalty !== undefined) {
      if (spec.constraints.presence_penalty < -2 || spec.constraints.presence_penalty > 2) {
        errors.push('presence_penalty must be between -2 and 2');
      }
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
    return Object.keys(OPENAI_PRICING.models);
  }
  
  /**
   * Map neutral spec to OpenAI Chat Completions format
   */
  private mapSpecToOpenAI(spec: LLMSpec): OpenAI.ChatCompletionCreateParams {
    const params: OpenAI.ChatCompletionCreateParams = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: spec.system_prompt
        },
        {
          role: 'user',
          content: spec.user_prompt
        }
      ],
      max_tokens: spec.constraints.max_tokens || 1024
    };
    
    // Add optional parameters
    if (spec.constraints.temperature !== undefined) {
      params.temperature = spec.constraints.temperature;
    }
    
    if (spec.constraints.top_p !== undefined) {
      params.top_p = spec.constraints.top_p;
    }
    
    if (spec.constraints.stop_sequences && spec.constraints.stop_sequences.length > 0) {
      params.stop = spec.constraints.stop_sequences;
    }
    
    if (spec.constraints.frequency_penalty !== undefined) {
      params.frequency_penalty = spec.constraints.frequency_penalty;
    }
    
    if (spec.constraints.presence_penalty !== undefined) {
      params.presence_penalty = spec.constraints.presence_penalty;
    }
    
    // Handle structured outputs
    if (spec.response_format === 'json' || spec.response_format === 'structured') {
      params.response_format = { type: 'json_object' };
      
      // Add JSON instruction to system prompt if not already present
      if (!spec.system_prompt.toLowerCase().includes('json')) {
        params.messages[0].content += '\n\nYou must respond with valid JSON only.';
      }
    }
    
    return params;
  }
  
  /**
   * Extract outputs from OpenAI response
   */
  private extractOutputs(
    response: OpenAI.ChatCompletion,
    format: 'text' | 'json' | 'structured'
  ): string[] {
    if (!response.choices || response.choices.length === 0) {
      throw new AdapterError(
        'No choices returned from OpenAI',
        'openai',
        AdapterErrorCode.INVALID_REQUEST
      );
    }
    
    const outputs = response.choices.map(choice => {
      return choice.message.content || '';
    });
    
    // Validate JSON format if required
    if (format === 'json' || format === 'structured') {
      for (const output of outputs) {
        try {
          JSON.parse(output);
        } catch (error) {
          throw new AdapterError(
            'Response is not valid JSON',
            'openai',
            AdapterErrorCode.INVALID_REQUEST,
            { response: output }
          );
        }
      }
    }
    
    return outputs;
  }
  
  /**
   * Calculate actual cost from usage
   */
  private calculateCost(
    usage: OpenAI.CompletionUsage | undefined,
    model: string
  ): number {
    if (!usage) return 0;
    
    const pricing = OPENAI_PRICING.models[model];
    if (!pricing) {
      console.warn(`Unknown OpenAI model pricing: ${model}`);
      return 0;
    }
    
    return calculateCost(
      {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens
      },
      {
        input_per_1k: pricing.input_cost_per_1k_tokens,
        output_per_1k: pricing.output_cost_per_1k_tokens
      }
    );
  }
  
  /**
   * Handle and standardize OpenAI errors
   */
  private handleError(error: any): AdapterError {
    // OpenAI SDK error
    if (error instanceof OpenAI.APIError) {
      let code = AdapterErrorCode.UNKNOWN_ERROR;
      
      if (error.status === 401) {
        code = AdapterErrorCode.AUTHENTICATION_FAILED;
      } else if (error.status === 429) {
        code = AdapterErrorCode.RATE_LIMITED;
      } else if (error.status === 400) {
        code = AdapterErrorCode.INVALID_REQUEST;
      } else if (error.status === 408 || error.status === 504) {
        code = AdapterErrorCode.TIMEOUT;
      } else if (error.status === 402) {
        code = AdapterErrorCode.INSUFFICIENT_QUOTA;
      }
      
      // Check for content filter
      if (error.message?.includes('content_filter') || error.message?.includes('content_policy')) {
        code = AdapterErrorCode.CONTENT_FILTER;
      }
      
      return new AdapterError(
        error.message || 'OpenAI API error',
        'openai',
        code,
        {
          status: error.status,
          type: error.type,
          code: error.code
        }
      );
    }
    
    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new AdapterError(
        'Network error connecting to OpenAI',
        'openai',
        AdapterErrorCode.NETWORK_ERROR,
        { originalError: error.message }
      );
    }
    
    // Unknown error
    return new AdapterError(
      error.message || 'Unknown error',
      'openai',
      AdapterErrorCode.UNKNOWN_ERROR,
      { originalError: error }
    );
  }
}

/**
 * Create OpenAI adapter from environment
 */
export function createOpenAIAdapter(model?: string): OpenAIAdapter {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required. ' +
      'Get your API key at https://platform.openai.com/api-keys'
    );
  }
  
  return new OpenAIAdapter({ apiKey, model });
}

