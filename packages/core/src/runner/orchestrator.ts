/**
 * Orchestrator - Core runTask controller
 * 
 * Connects all pieces:
 * - Loads config
 * - Builds LLMSpecs
 * - Routes through adapters
 * - Validates outputs
 * - Logs audit trail
 */

import type { LLMSpec } from '../types/spec.js';
import type { AdapterResponse } from '../types/adapter.js';
import type { PromptsConfig } from '../types/config.js';
import { getCallConfig } from './task-builder.js';

/**
 * Task execution result
 */
export interface TaskResult {
  success: boolean;
  outputs: unknown[];
  validation: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  audit: {
    task_id: string;
    run_id?: string;
    provider: string;
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    cost_usd: number;
    duration_ms: number;
    cached?: boolean;
    timestamp: string;
  };
  raw_response?: AdapterResponse;
}

/**
 * Options for running a task
 */
export interface RunTaskOptions {
  /** Unique run ID for tracking */
  runId?: string;
  
  /** Override provider from config */
  providerOverride?: string;
  
  /** Override model from config */
  modelOverride?: string;
  
  /** Skip validation gates */
  skipValidation?: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Task executor type - executes a spec through an adapter
 */
export type TaskExecutor = (spec: LLMSpec, provider: string) => Promise<AdapterResponse>;

/**
 * Validation function type
 */
export type TaskValidator = (
  taskId: string,
  outputs: unknown[],
  config: PromptsConfig
) => { passed: boolean; errors: string[]; warnings: string[] };

/**
 * Run a task with full orchestration
 * 
 * This is the main controller that:
 * 1. Gets task config
 * 2. Executes through adapter
 * 3. Validates outputs
 * 4. Returns structured result with audit
 * 
 * @param spec - The LLM spec to execute
 * @param config - Prompts configuration
 * @param executor - Function that executes the spec (routes to adapter)
 * @param validator - Function that validates outputs
 * @param options - Additional options
 */
export async function runTask(
  spec: LLMSpec,
  config: PromptsConfig,
  executor: TaskExecutor,
  validator?: TaskValidator,
  options: RunTaskOptions = {}
): Promise<TaskResult> {
  const startTime = Date.now();
  const runId = options.runId || `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  try {
    // Get task configuration
    const callConfig = getCallConfig(config, spec.task_id);
    const provider = options.providerOverride || callConfig.provider;
    
    // Execute through adapter
    const response = await executor(spec, provider);
    
    // Parse outputs
    let outputs: unknown[] = [];
    try {
      if (spec.response_format === 'json') {
        outputs = response.outputs.map(out => JSON.parse(out));
        
        // If we expect multiple outputs and got 1 output that's an array, unwrap it
        // This handles LLMs that return a single JSON array of multiple items
        if (outputs.length === 1 && Array.isArray(outputs[0])) {
          const callConfig = config.calls[spec.task_id];
          const expectedCount = callConfig?.prompt.outputs_expected || 1;
          if (expectedCount > 1) {
            outputs = outputs[0] as unknown[];
          }
        }
      } else {
        outputs = response.outputs;
      }
    } catch (error) {
      return {
        success: false,
        outputs: [],
        validation: {
          passed: false,
          errors: [`Failed to parse outputs: ${(error as Error).message}`],
          warnings: [],
        },
        audit: buildAudit(spec, response, runId, startTime),
      };
    }
    
    // Validate outputs
    let validation = {
      passed: true,
      errors: [] as string[],
      warnings: [] as string[],
    };
    
    if (!options.skipValidation && validator) {
      validation = validator(spec.task_id, outputs, config);
    }
    
    return {
      success: validation.passed,
      outputs,
      validation,
      audit: buildAudit(spec, response, runId, startTime),
      raw_response: response,
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      outputs: [],
      validation: {
        passed: false,
        errors: [`Task execution failed: ${(error as Error).message}`],
        warnings: [],
      },
      audit: {
        task_id: spec.task_id,
        run_id: runId,
        provider: 'unknown',
        model: 'unknown',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
        cost_usd: 0,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Build audit record from response
 */
function buildAudit(
  spec: LLMSpec,
  response: AdapterResponse,
  runId: string,
  startTime: number
): TaskResult['audit'] {
  return {
    task_id: spec.task_id,
    run_id: runId,
    provider: response.provider,
    model: response.model,
    usage: response.usage,
    cost_usd: response.cost_usd,
    duration_ms: Date.now() - startTime,
    cached: response.metadata?.cached,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch run multiple tasks sequentially
 */
export async function runTaskBatch(
  tasks: Array<{
    spec: LLMSpec;
    validator?: TaskValidator;
    options?: RunTaskOptions;
  }>,
  config: PromptsConfig,
  executor: TaskExecutor
): Promise<TaskResult[]> {
  const results: TaskResult[] = [];
  
  for (const task of tasks) {
    const result = await runTask(
      task.spec,
      config,
      executor,
      task.validator,
      task.options
    );
    results.push(result);
    
    // Stop if a critical task fails
    if (!result.success && task.options?.metadata?.critical) {
      break;
    }
  }
  
  return results;
}

