# Runner - Task Orchestration

The runner package provides the core orchestration layer that connects configuration, adapters, and validation into a complete task execution flow.

## Architecture

```
Config (prompts.json)
    ↓
Task Builder → LLMSpec
    ↓
Orchestrator → Adapter → LLM Provider
    ↓
Validator → ValidationResult
    ↓
TaskResult (with audit trail)
```

## Components

### 1. Task Builder (`task-builder.ts`)

Converts configuration into provider-agnostic LLMSpecs.

#### Functions

##### `buildIdeasGenerateSpec(config, kernel, runId?)`

Creates a spec for generating 20 campaign ideas from a brand kernel.

**Parameters:**
- `config: PromptsConfig` - Configuration from prompts.json
- `kernel: KernelPayload` - Compressed brand kernel
- `runId?: string` - Optional run identifier for tracking

**Returns:** `LLMSpec` - Provider-agnostic specification

**Example:**
```typescript
import { buildIdeasGenerateSpec } from '@brandpack/core/runner';
import { loadPromptsConfig } from '@brandpack/core/config';

const config = await loadPromptsConfig();
const kernel = await compressKernel({...});

const spec = buildIdeasGenerateSpec(config, kernel, 'run_123');
// spec.task_id === 'ideas.generate'
// spec.user_prompt includes kernel JSON
// spec.constraints.temperature === 0.9
```

##### `buildCopyGenerateSpec(config, kernel, idea, runId?)`

Creates a spec for generating 5 copy blocks from a selected idea.

**Parameters:**
- `config: PromptsConfig` - Configuration
- `kernel: KernelPayload` - Brand kernel
- `idea: Record<string, unknown>` - Selected idea object
- `runId?: string` - Optional run identifier

**Returns:** `LLMSpec`

**Example:**
```typescript
const idea = {
  headline: 'Transform Your Workflow',
  angle: 'benefit-focused',
  audience: 'marketers',
  format: 'social',
  supporting_evidence_keys: ['proof.metrics']
};

const spec = buildCopyGenerateSpec(config, kernel, idea, 'run_124');
// Returns spec with both kernel and idea interpolated into prompt
```

##### `buildImageBriefSpec(config, kernel, idea, runId?)`

Creates a spec for generating a 4:5 image brief with safe zones.

**Parameters:**
- `config: PromptsConfig` - Configuration
- `kernel: KernelPayload` - Brand kernel
- `idea: Record<string, unknown>` - Selected idea
- `runId?: string` - Optional run identifier

**Returns:** `LLMSpec`

##### `getCallConfig(config, callId)`

Extracts provider, model, and runtime config for a specific call.

**Parameters:**
- `config: PromptsConfig` - Configuration
- `callId: string` - Call identifier (e.g., 'ideas.generate')

**Returns:** `{ provider: string, model: string, runtime: RuntimeConfig }`

**Example:**
```typescript
const callConfig = getCallConfig(config, 'ideas.generate');
// callConfig.provider === 'anthropic'
// callConfig.model === 'claude-3-5-sonnet-20241022'
// callConfig.runtime.timeout_ms === 30000
```

---

### 2. Orchestrator (`orchestrator.ts`)

Executes specs through adapters with validation and audit logging.

#### Functions

##### `runTask(spec, config, executor, validator?, options?)`

Main controller that orchestrates a complete task execution.

**Parameters:**
- `spec: LLMSpec` - The specification to execute
- `config: PromptsConfig` - Configuration
- `executor: TaskExecutor` - Function that routes to adapter
- `validator?: TaskValidator` - Optional validation function
- `options?: RunTaskOptions` - Execution options

**Returns:** `Promise<TaskResult>`

**Example:**
```typescript
import { runTask } from '@brandpack/core/runner';
import { routeSpec } from '@brandpack/adapters';
import { validateTaskOutput } from '@brandpack/core/runner';

const result = await runTask(
  spec,
  config,
  async (spec, provider) => routeSpec(spec, provider),
  (taskId, outputs, config) => validateTaskOutput(taskId, outputs, config),
  { runId: 'run_125' }
);

if (result.success) {
  console.log('Outputs:', result.outputs);
  console.log('Audit:', result.audit);
} else {
  console.error('Validation errors:', result.validation.errors);
}
```

**TaskResult Structure:**
```typescript
{
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
```

##### `runTaskBatch(tasks, config, executor)`

Executes multiple tasks sequentially.

**Parameters:**
- `tasks: Array<{spec, validator?, options?}>` - Array of task configurations
- `config: PromptsConfig` - Configuration
- `executor: TaskExecutor` - Routing function

**Returns:** `Promise<TaskResult[]>`

**Example:**
```typescript
const results = await runTaskBatch(
  [
    { spec: ideasSpec, validator: validateIdeas },
    { spec: copySpec, validator: validateCopy },
  ],
  config,
  executor
);

// Process results sequentially
results.forEach((result, i) => {
  console.log(`Task ${i + 1}:`, result.success ? 'PASS' : 'FAIL');
});
```

---

### 3. Validator (`validator.ts`)

Validates outputs according to PROJECT_SPEC.md requirements.

#### Functions

##### `validateIdeas(outputs, config)`

Validates ideas.generate outputs.

**Requirements:**
- Exactly 20 ideas
- Each has: `headline`, `angle`, `audience`, `format`, `supporting_evidence_keys`
- No banned phrases (warnings)
- Has evidence keys (warnings if empty)

**Returns:** `ValidationResult`

**Example:**
```typescript
const result = validateIdeas(outputs, config);

if (!result.passed) {
  console.error('Validation failed:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

##### `validateCopy(outputs, config)`

Validates copy.generate outputs.

**Requirements:**
- Single object with 5 blocks: `hook`, `context`, `proof`, `objection`, `cta`
- Each block has `text`, `character_count`, `evidence_keys`
- Character lengths within acceptable ranges
- No banned phrases
- Evidence keys present

**Returns:** `ValidationResult`

##### `validateImageBrief(outputs, config)`

Validates image.brief_generate outputs.

**Requirements:**
- Single object
- `aspect_ratio === '4:5'`
- `safe_zone_top >= 0.15`
- `safe_zone_bottom >= 0.15`
- Required fields: `visual_direction`, `focal_point`, `copy_overlay_guidance`
- Evidence keys present

**Returns:** `ValidationResult`

##### `validateTaskOutput(taskId, outputs, config)`

Router that selects the appropriate validator based on task_id.

**Example:**
```typescript
const result = validateTaskOutput('ideas.generate', outputs, config);
// Automatically routes to validateIdeas()
```

---

## Complete Example: End-to-End Flow

```typescript
import {
  buildIdeasGenerateSpec,
  runTask,
  validateTaskOutput,
} from '@brandpack/core/runner';
import { loadPromptsConfig } from '@brandpack/core/config';
import { compressKernel, crawlSite } from '@brandpack/core';
import { routeSpec } from '@brandpack/adapters';

// 1. Scrape and compress
const crawlResult = await crawlSite({ url: 'https://example.com' });
const kernel = compressKernel({
  domain: 'example.com',
  sources: crawlResult.pages.map(p => ({ url: p.url, content: p.content })),
});

// 2. Load config
const config = await loadPromptsConfig();

// 3. Build spec
const spec = buildIdeasGenerateSpec(config, kernel, 'run_001');

// 4. Execute with validation
const result = await runTask(
  spec,
  config,
  async (spec, provider) => routeSpec(spec, provider),
  (taskId, outputs, config) => validateTaskOutput(taskId, outputs, config)
);

// 5. Handle results
if (result.success) {
  console.log(`Generated ${result.outputs.length} ideas`);
  console.log(`Cost: $${result.audit.cost_usd.toFixed(4)}`);
  console.log(`Duration: ${result.audit.duration_ms}ms`);
  
  // Use outputs
  result.outputs.forEach((idea, i) => {
    console.log(`${i + 1}. ${idea.headline}`);
  });
} else {
  console.error('Validation failed:');
  result.validation.errors.forEach(err => console.error(`  - ${err}`));
}
```

---

## Error Handling

All functions throw errors for configuration issues:

```typescript
try {
  const spec = buildIdeasGenerateSpec(config, kernel);
} catch (error) {
  if (error.message.includes('not found in config')) {
    // Call ID missing from prompts.json
  }
}
```

`runTask()` returns errors in the result:

```typescript
const result = await runTask(spec, config, executor);

if (!result.success) {
  // Check validation errors
  console.error(result.validation.errors);
  
  // Check if execution failed
  if (result.audit.provider === 'unknown') {
    console.error('Task execution failed');
  }
}
```

---

## Testing

See `__tests__/` for comprehensive unit tests:

```bash
cd packages/core
npm run build
node --test dist/runner/__tests__/task-builder.test.js
node --test dist/runner/__tests__/validator.test.js
```

---

## Type Safety

All functions are fully typed. Import types as needed:

```typescript
import type {
  TaskResult,
  RunTaskOptions,
  TaskExecutor,
  TaskValidator,
  ValidationResult,
} from '@brandpack/core/runner';
```

