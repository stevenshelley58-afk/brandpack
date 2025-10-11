/**
 * Runner - Task orchestration and execution
 * 
 * Exports task builders, orchestrator, and validators
 */

export {
  buildScrapeReviewSpec,
  buildIdeasGenerateSpec,
  buildCopyGenerateSpec,
  buildImageBriefSpec,
  getCallConfig,
} from './task-builder';

export {
  runTask,
  runTaskBatch,
  type TaskResult,
  type RunTaskOptions,
  type TaskExecutor,
  type TaskValidator,
} from './orchestrator';

export {
  validateTaskOutput,
  validateIdeas,
  validateCopy,
  validateImageBrief,
  type ValidationResult,
} from './validator';

