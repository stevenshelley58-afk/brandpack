/**
 * Neutral LLM Specification
 * 
 * Provider-agnostic format that can be transformed into any LLM provider's API format.
 * This abstraction allows switching providers without changing business logic.
 */

export type ResponseFormat = 'text' | 'json' | 'structured';

export interface LLMSpec {
  /**
   * Unique identifier for this task type
   * Examples: "scrape_review", "ideas_generate", "copy_generate"
   */
  task_id: string;
  
  /**
   * System-level instruction that sets the LLM's role and behavior
   */
  system_prompt: string;
  
  /**
   * User message, typically with interpolated variables
   */
  user_prompt: string;
  
  /**
   * Expected response format
   * - text: Plain text response
   * - json: JSON object
   * - structured: Structured output with schema validation
   */
  response_format: ResponseFormat;
  
  /**
   * JSON schema for structured outputs (when response_format is 'json' or 'structured')
   */
  schema?: Record<string, unknown>;
  
  /**
   * Model constraints and sampling parameters
   */
  constraints: {
    /**
     * Maximum tokens to generate in the completion
     */
    max_tokens?: number;
    
    /**
     * Temperature (0-1): Controls randomness
     * - 0: Deterministic, focused
     * - 1: Creative, varied
     */
    temperature?: number;
    
    /**
     * Top-p / nucleus sampling (0-1)
     * Alternative to temperature for controlling randomness
     */
    top_p?: number;
    
    /**
     * Stop sequences: Generation stops when these strings are encountered
     */
    stop_sequences?: string[];
    
    /**
     * Frequency penalty: Reduce repetition of tokens based on frequency
     */
    frequency_penalty?: number;
    
    /**
     * Presence penalty: Reduce repetition of tokens based on presence
     */
    presence_penalty?: number;
  };
  
  /**
   * Metadata for logging and debugging
   */
  metadata?: {
    /**
     * Run ID this spec belongs to
     */
    run_id?: string;
    
    /**
     * User ID making the request
     */
    user_id?: string;
    
    /**
     * Additional context
     */
    [key: string]: unknown;
  };
}

/**
 * Builder for creating LLM specs with type safety
 */
export class SpecBuilder {
  private spec: Partial<LLMSpec> = {};
  
  taskId(id: string): this {
    this.spec.task_id = id;
    return this;
  }
  
  systemPrompt(prompt: string): this {
    this.spec.system_prompt = prompt;
    return this;
  }
  
  userPrompt(prompt: string): this {
    this.spec.user_prompt = prompt;
    return this;
  }
  
  responseFormat(format: ResponseFormat): this {
    this.spec.response_format = format;
    return this;
  }
  
  schema(schema: Record<string, unknown>): this {
    this.spec.schema = schema;
    return this;
  }
  
  maxTokens(tokens: number): this {
    if (!this.spec.constraints) this.spec.constraints = {};
    this.spec.constraints.max_tokens = tokens;
    return this;
  }
  
  temperature(temp: number): this {
    if (!this.spec.constraints) this.spec.constraints = {};
    this.spec.constraints.temperature = temp;
    return this;
  }
  
  topP(p: number): this {
    if (!this.spec.constraints) this.spec.constraints = {};
    this.spec.constraints.top_p = p;
    return this;
  }
  
  stopSequences(sequences: string[]): this {
    if (!this.spec.constraints) this.spec.constraints = {};
    this.spec.constraints.stop_sequences = sequences;
    return this;
  }
  
  metadata(meta: Record<string, unknown>): this {
    this.spec.metadata = { ...this.spec.metadata, ...meta };
    return this;
  }
  
  build(): LLMSpec {
    if (!this.spec.task_id) throw new Error('task_id is required');
    if (!this.spec.system_prompt) throw new Error('system_prompt is required');
    if (!this.spec.user_prompt) throw new Error('user_prompt is required');
    if (!this.spec.response_format) this.spec.response_format = 'text';
    if (!this.spec.constraints) this.spec.constraints = {};
    
    return this.spec as LLMSpec;
  }
}

/**
 * Validate a spec before execution
 */
export function validateSpec(spec: LLMSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!spec.task_id) errors.push('task_id is required');
  if (!spec.system_prompt) errors.push('system_prompt is required');
  if (!spec.user_prompt) errors.push('user_prompt is required');
  
  if (spec.constraints.temperature !== undefined) {
    if (spec.constraints.temperature < 0 || spec.constraints.temperature > 1) {
      errors.push('temperature must be between 0 and 1');
    }
  }
  
  if (spec.constraints.top_p !== undefined) {
    if (spec.constraints.top_p < 0 || spec.constraints.top_p > 1) {
      errors.push('top_p must be between 0 and 1');
    }
  }
  
  if (spec.constraints.max_tokens !== undefined) {
    if (spec.constraints.max_tokens <= 0) {
      errors.push('max_tokens must be positive');
    }
  }
  
  if (spec.response_format === 'structured' && !spec.schema) {
    errors.push('schema is required when response_format is "structured"');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

