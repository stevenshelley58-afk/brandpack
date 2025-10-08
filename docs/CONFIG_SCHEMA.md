# Brand Pack - Configuration Schema

## Overview
`data/config/prompts.json` is the authoritative configuration file for prompts, validation rules, presets, and operational caps. The schema mirrors `/PROJECT_SPEC.md` so updates must stay in sync with the spec before implementation.

## Root Shape
```typescript
interface BrandPackConfig {
  version: string;
  updated_at: string;
  global: GlobalConfig;
  calls: CallsConfig;
  validation: ValidationConfig;
  budgets: BudgetConfig;
  presets: Record<string, PresetConfig>;
  banned_phrases: string[];
}
```

### Global Config
```typescript
interface GlobalConfig {
  provider: string;
  log_level: "error" | "warn" | "info" | "debug";
  cache_enabled: boolean;
  cache_ttl_seconds: {
    scrape: number;
    llm: number;
    image: number;
  };
}
```

### Calls
The `calls` object includes five entries that map directly to pipeline stages.

```typescript
interface CallsConfig {
  "scrape.review_summarize": ScrapeCall;
  "ideas.generate": IdeasCall;
  "copy.generate": CopyCall;
  "image.brief_generate": ImageBriefCall;
  "image.asset_generate": ImageAssetCall;
}
```

Each call shares a common structure:
```typescript
interface BaseCall {
  model: ModelConfig;
  prompt: PromptConfig;
  runtime: RuntimeGuard;
}
```

#### Scrape Review Summarize
- Enforces crawl caps (6 pages, 300 KB) at the config level.
- Stores review prompt templates and timeout budgets.

#### Ideas Generate
- Requests 20 ideas in a single call.
- `prompt.outputs_expected` must equal 20.
- Includes variance tags list and evidence policy references.

#### Copy Generate
- Produces five ordered blocks. Config contains slot order, min/max length per slot, and continuity flag defaults.

#### Image Brief Generate
- Emits layout guidance. Config stores aspect ratio (4:5), safe zone percentages, and descriptive templates.

#### Image Asset Generate
- Holds rendering parameters such as style presets, allowed providers, and quality sliders. Also references safe zone mask generation.

### Prompt Config
```typescript
interface PromptConfig {
  system: string;
  user_template: string;
  variables: string[];
  outputs_expected?: number;
}
```

### Model Config
```typescript
interface ModelConfig {
  provider: string;
  name: string;
  temperature: number;
  max_tokens: number;
}
```

### Runtime Guards
```typescript
interface RuntimeGuard {
  timeout_ms: number;
  max_retries: number;
  cost_usd_limit: number;
  crawl?: {
    max_pages: number;
    max_total_kb: number;
    max_concurrency: number;
    per_request_timeout_ms: number;
    total_timeout_ms: number;
  };
}
```

## Validation
```typescript
interface ValidationConfig {
  banned_phrases: string[];
  evidence_policy: {
    required_for: ("ideas" | "copy" | "image_brief" | "image_asset")[];
    allow_empty: boolean;
  };
  length_limits: {
    min_chars: number;
    max_chars: number;
    per_slot?: Record<string, { min: number; max: number }>;
  };
  continuity: {
    enabled: boolean;
    thresholds: {
      tone_shift: number;
      fact_drift: number;
    };
  };
}
```

## Budgets
```typescript
interface BudgetConfig {
  max_cost_per_run: number;
  max_tokens_per_run: number;
  alert_threshold_usd: number;
  per_stage: Record<string, {
    max_cost: number;
    max_tokens: number;
  }>;
}
```

## Presets
Three built-in presets map to the acceptance criteria:

- **fast**: Cheapest providers, strict token ceilings, minimal retries. Applies the strictest crawl caps and reduces idea length targets.
- **balanced**: Default experience. Uses quality mid-tier models across all stages while honoring global caps.
- **full**: Upgrades only the copy stage model and token budget for premium narratives; other stages inherit balanced settings to control spend.

```typescript
interface PresetConfig {
  description: string;
  overrides: Partial<BrandPackConfig>;
}
```

## Change Control
- Update `/PROJECT_SPEC.md` first when modifying caps or flows.
- Validate `prompts.json` against this schema in CI.
- Keep banned phrases, length limits, and continuity thresholds synchronized between this document and the config file.
