# Brand Pack - Configuration Schema

## Overview

Brand Pack uses a hierarchical configuration system where settings can be defined at multiple levels and are merged at runtime. This allows for:

- **Global defaults** that work out of the box
- **Per-call customization** for fine-tuning specific stages
- **User presets** for quick switching between quality/cost profiles
- **This-run overrides** for one-time experiments

## Configuration Hierarchy

```
Priority (Low → High):

1. Hardcoded Fallbacks
   ↓
2. prompts.json (File)
   ↓
3. User Saved Presets (Database)
   ↓
4. This-Run Overrides (Session)
   ↓
[Effective Config] → Used for execution
```

### Merge Behavior

- **Objects**: Deep merge (child keys override parent)
- **Arrays**: Replace (no merge, higher precedence wins)
- **Primitives**: Replace (higher precedence wins)
- **Null/Undefined**: Treated as "unset", doesn't override

### Example Merge

```typescript
// Layer 1: Hardcoded fallback
{
  provider: "anthropic",
  temperature: 0.7,
  max_tokens: 2000
}

// Layer 2: prompts.json
{
  temperature: 0.5,
  max_tokens: 4000,
  validation: {
    min_length: 100
  }
}

// Layer 3: User preset "fast"
{
  provider: "openai",
  max_tokens: 1000
}

// Layer 4: This-run override
{
  temperature: 0.9
}

// Result: Effective config
{
  provider: "openai",        // From layer 3
  temperature: 0.9,          // From layer 4 (highest)
  max_tokens: 1000,          // From layer 3
  validation: {              // From layer 2 (only layer with this)
    min_length: 100
  }
}
```

---

## Configuration Schema

### Root Structure

```typescript
interface Config {
  // Global settings
  global: GlobalConfig;
  
  // Per-call settings
  calls: {
    scrape_review: CallConfig;
    audience_analysis: CallConfig;
    ideas_generate: CallConfig;
    copy_generate: CallConfig;
    image_brief: CallConfig;
    image_render: ImageCallConfig;
  };
  
  // Scraper settings
  scraper: ScraperConfig;
  
  // Validation rules
  validation: ValidationConfig;
  
  // Budget controls
  budgets: BudgetConfig;
  
  // Presets
  presets: {
    [name: string]: Partial<Config>;
  };
}
```

---

## Global Config

```typescript
interface GlobalConfig {
  // Default provider for all LLM calls
  provider: "anthropic" | "openai" | "google" | "mistral" | string;
  
  // Logging level
  log_level: "error" | "warn" | "info" | "debug";
  
  // Enable caching
  cache_enabled: boolean;           // Default: true
  
  // Cache TTL in seconds
  cache_ttl: {
    scrape: number;                 // Default: 604800 (7 days)
    llm: number;                    // Default: 86400 (1 day)
    image: number;                  // Default: -1 (never expire)
  };
  
  // Redaction patterns (regex)
  redact_patterns: string[];        // Default: credit cards, emails, phones
  
  // Rate limiting
  rate_limit: {
    enabled: boolean;               // Default: true
    requests_per_minute: number;    // Default: 100
  };
}
```

**Example**:
```json
{
  "global": {
    "provider": "anthropic",
    "log_level": "info",
    "cache_enabled": true,
    "cache_ttl": {
      "scrape": 604800,
      "llm": 86400,
      "image": -1
    },
    "redact_patterns": [
      "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b",
      "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b"
    ],
    "rate_limit": {
      "enabled": true,
      "requests_per_minute": 100
    }
  }
}
```

---

## Call Config

Each LLM call (review, ideas, copy, etc.) has this structure:

```typescript
interface CallConfig {
  // A) Prompt
  prompt: {
    system: string;                 // System instruction
    user_template: string;          // User message with {variables}
    variables: string[];            // Required variables: ["domain", "kernel"]
  };
  
  // B) Model
  model: {
    provider?: string;              // Override global provider
    name: string;                   // Model name (provider-specific)
    temperature: number;            // 0-1, creativity/randomness
    top_p?: number;                 // Nucleus sampling (0-1)
    max_tokens: number;             // Max completion tokens
    stop_sequences?: string[];      // Stop generation at these
  };
  
  // C) Validation
  validation: {
    response_format: "text" | "json" | "structured";
    schema?: object;                // For structured outputs
    min_length?: number;            // Minimum response length
    max_length?: number;            // Maximum response length
    required_fields?: string[];     // For JSON responses
    banned_phrases?: string[];      // AI slop detection
  };
  
  // D) Budgets
  budgets: {
    max_tokens_per_call: number;    // Hard limit
    max_cost_per_call: number;      // USD
    timeout_ms: number;             // Request timeout
    max_retries: number;            // On failure
  };
  
  // E) Logging
  logging: {
    level: "error" | "warn" | "info" | "debug";
    include_prompts: boolean;       // Log full prompts (admin only)
    include_outputs: boolean;       // Log outputs
    redact: boolean;                // Apply redaction patterns
  };
  
  // F) Advanced (per-call specific)
  advanced?: {
    n_outputs?: number;             // Generate multiple outputs
    n_displayed?: number;           // Show top N
    dedupe_threshold?: number;      // Similarity threshold (0-1)
    regen_strategy?: "fresh" | "use_remaining";
  };
}
```

**Example - Ideas Generate**:
```json
{
  "calls": {
    "ideas_generate": {
      "prompt": {
        "system": "You are a creative marketing strategist...",
        "user_template": "Brand: {domain}\nSnapshot: {snapshot}\nSegments: {segments}\n\nGenerate {n_outputs} completely different marketing angles...",
        "variables": ["domain", "snapshot", "segments", "n_outputs"]
      },
      "model": {
        "provider": "anthropic",
        "name": "claude-3-5-sonnet-20241022",
        "temperature": 0.9,
        "top_p": 0.95,
        "max_tokens": 4000
      },
      "validation": {
        "response_format": "json",
        "schema": {
          "type": "object",
          "properties": {
            "ideas": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["angle", "hook", "target_emotion", "proof_point"]
              }
            }
          }
        },
        "min_length": 500,
        "banned_phrases": ["game-changer", "revolutionize", "unlock"]
      },
      "budgets": {
        "max_tokens_per_call": 6000,
        "max_cost_per_call": 0.50,
        "timeout_ms": 120000,
        "max_retries": 2
      },
      "logging": {
        "level": "info",
        "include_prompts": false,
        "include_outputs": true,
        "redact": false
      },
      "advanced": {
        "n_outputs": 20,
        "n_displayed": 6,
        "dedupe_threshold": 0.7,
        "regen_strategy": "fresh"
      }
    }
  }
}
```

---

## Scraper Config

```typescript
interface ScraperConfig {
  // Crawl constraints
  max_pages: number;                // Default: 20
  max_bytes_per_page: number;       // Default: 524288 (500KB)
  timeout_ms: number;               // Per-page timeout, default: 10000
  concurrency: number;              // Parallel fetches, default: 3
  
  // Behavior
  respect_robots_txt: boolean;      // Default: true
  follow_redirects: boolean;        // Default: true
  max_redirects: number;            // Default: 3
  
  // Selectors (priority order for content extraction)
  priority_pages: string[];         // Default: ["/", "/about", "/products"]
  
  // Content extraction
  selectors: {
    product_name: string[];         // CSS selectors
    price: string[];
    description: string[];
    testimonial: string[];
  };
  
  // Compression
  kernel: {
    max_kb: number;                 // Default: 2
    compression_strategy: "aggressive" | "balanced" | "minimal";
  };
  
  // Fallback
  allow_manual_input: boolean;      // Default: true
  allow_csv_import: boolean;        // Default: false (admin only)
}
```

**Example**:
```json
{
  "scraper": {
    "max_pages": 20,
    "max_bytes_per_page": 524288,
    "timeout_ms": 10000,
    "concurrency": 3,
    "respect_robots_txt": true,
    "follow_redirects": true,
    "max_redirects": 3,
    "priority_pages": ["/", "/about", "/products", "/pricing", "/contact"],
    "selectors": {
      "product_name": [".product-title", "h1", "[itemprop='name']"],
      "price": [".price", "[itemprop='price']", ".product-price"],
      "description": [".description", "[itemprop='description']", "meta[name='description']"],
      "testimonial": [".testimonial", ".review", "[itemprop='review']"]
    },
    "kernel": {
      "max_kb": 2,
      "compression_strategy": "balanced"
    },
    "allow_manual_input": true,
    "allow_csv_import": false
  }
}
```

---

## Validation Config

Global validation rules that apply across all calls:

```typescript
interface ValidationConfig {
  // Banned phrases (AI slop detection)
  banned_phrases: string[];
  
  // Length rules for copy
  copy: {
    before: {
      headline_max: number;         // Default: 40
      description_max: number;      // Default: 90
    };
    after: {
      headline_max: number;         // Default: 40
      description_max: number;      // Default: 300
    };
  };
  
  // Dedupe settings
  dedupe: {
    enabled: boolean;               // Default: true
    threshold: number;              // 0-1, default: 0.7
    method: "embeddings" | "ngrams";
  };
  
  // Proof point validation
  proof_validation: {
    enabled: boolean;               // Default: true
    require_citation: boolean;      // Must reference kernel facts
  };
}
```

**Example**:
```json
{
  "validation": {
    "banned_phrases": [
      "game-changer",
      "revolutionize",
      "unlock the power",
      "leverage",
      "seamless",
      "synergy",
      "cutting-edge",
      "take your X to the next level",
      "boost your Y",
      "in today's fast-paced world"
    ],
    "copy": {
      "before": {
        "headline_max": 40,
        "description_max": 90
      },
      "after": {
        "headline_max": 40,
        "description_max": 300
      }
    },
    "dedupe": {
      "enabled": true,
      "threshold": 0.7,
      "method": "embeddings"
    },
    "proof_validation": {
      "enabled": true,
      "require_citation": true
    }
  }
}
```

---

## Budget Config

Cost and resource limits:

```typescript
interface BudgetConfig {
  // Per-run limits
  max_cost_per_run: number;         // USD, default: 5.00
  max_tokens_per_run: number;       // Default: 50000
  max_duration_per_run_ms: number;  // Default: 300000 (5 min)
  
  // Alerts
  alert_threshold: number;          // USD, trigger alert, default: 50.00
  alert_email?: string;             // Where to send alerts
  
  // Provider-specific quotas
  provider_quotas: {
    [provider: string]: {
      requests_per_minute: number;
      tokens_per_minute: number;
      daily_spend_limit: number;    // USD
    };
  };
}
```

**Example**:
```json
{
  "budgets": {
    "max_cost_per_run": 5.00,
    "max_tokens_per_run": 50000,
    "max_duration_per_run_ms": 300000,
    "alert_threshold": 50.00,
    "alert_email": "admin@example.com",
    "provider_quotas": {
      "anthropic": {
        "requests_per_minute": 50,
        "tokens_per_minute": 100000,
        "daily_spend_limit": 100.00
      },
      "openai": {
        "requests_per_minute": 100,
        "tokens_per_minute": 150000,
        "daily_spend_limit": 100.00
      }
    }
  }
}
```

---

## Image Config

Special config for image generation calls:

```typescript
interface ImageCallConfig extends CallConfig {
  // Image-specific settings
  image: {
    provider: "openai" | "replicate" | "ideogram" | string;
    model: string;                  // Provider-specific
    
    // Output settings
    resolution: string;             // "1024x1280" for 4:5
    aspect_ratio: "4:5" | "1:1" | "16:9";
    format: "png" | "jpg" | "webp";
    quality: number;                // 1-100
    
    // Generation settings
    n_variations?: number;          // Generate multiple from same brief
    seed?: number;                  // For reproducibility
    
    // Style controls (prompt engineering)
    style_modifiers: string[];      // Appended to prompt
    negative_modifiers: string[];   // Common things to avoid
  };
}
```

**Example**:
```json
{
  "calls": {
    "image_render": {
      "model": {
        "provider": "openai",
        "name": "dall-e-3",
        "temperature": 0.7
      },
      "image": {
        "provider": "openai",
        "model": "dall-e-3",
        "resolution": "1024x1280",
        "aspect_ratio": "4:5",
        "format": "png",
        "quality": 90,
        "n_variations": 1,
        "style_modifiers": [
          "high quality",
          "professional photography",
          "clean composition"
        ],
        "negative_modifiers": [
          "cluttered",
          "low quality",
          "blurry",
          "stock photo smile",
          "text overlay"
        ]
      },
      "budgets": {
        "max_cost_per_call": 0.15,
        "timeout_ms": 180000
      }
    }
  }
}
```

---

## Presets

Presets are named partial configs that override defaults:

```typescript
interface Presets {
  [name: string]: {
    description: string;
    config: Partial<Config>;
  };
}
```

### Built-in Presets

#### 1. Fast (Cheap & Quick)

```json
{
  "presets": {
    "fast": {
      "description": "Cheaper models, lower quality, <2 min total",
      "config": {
        "calls": {
          "scrape_review": {
            "model": {
              "provider": "anthropic",
              "name": "claude-3-haiku-20240307",
              "temperature": 0.3
            }
          },
          "ideas_generate": {
            "model": {
              "provider": "openai",
              "name": "gpt-4o-mini",
              "temperature": 0.8
            },
            "advanced": {
              "n_outputs": 10,
              "n_displayed": 5
            }
          },
          "copy_generate": {
            "model": {
              "provider": "openai",
              "name": "gpt-4o-mini"
            }
          }
        },
        "budgets": {
          "max_cost_per_run": 1.00
        }
      }
    }
  }
}
```

#### 2. Balanced (Default)

```json
{
  "presets": {
    "balanced": {
      "description": "Good quality/speed tradeoff, default choice",
      "config": {
        "calls": {
          "scrape_review": {
            "model": {
              "provider": "anthropic",
              "name": "claude-3-5-sonnet-20241022"
            }
          },
          "ideas_generate": {
            "model": {
              "provider": "anthropic",
              "name": "claude-3-5-sonnet-20241022",
              "temperature": 0.9
            },
            "advanced": {
              "n_outputs": 20,
              "n_displayed": 6
            }
          }
        },
        "budgets": {
          "max_cost_per_run": 3.00
        }
      }
    }
  }
}
```

#### 3. Full (Best Quality)

```json
{
  "presets": {
    "full": {
      "description": "Best models, highest quality, ~5 min total",
      "config": {
        "calls": {
          "scrape_review": {
            "model": {
              "provider": "anthropic",
              "name": "claude-3-opus-20240229",
              "temperature": 0.3,
              "max_tokens": 8000
            }
          },
          "ideas_generate": {
            "model": {
              "provider": "anthropic",
              "name": "claude-3-opus-20240229",
              "temperature": 0.95
            },
            "advanced": {
              "n_outputs": 30,
              "n_displayed": 8
            }
          },
          "copy_generate": {
            "model": {
              "provider": "anthropic",
              "name": "claude-3-opus-20240229"
            }
          },
          "image_render": {
            "image": {
              "provider": "replicate",
              "model": "flux-1-pro",
              "quality": 95
            }
          }
        },
        "budgets": {
          "max_cost_per_run": 10.00
        }
      }
    }
  }
}
```

---

## User Presets

Users can save custom presets:

```typescript
interface UserPreset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  config: Partial<Config>;
  created_at: string;
  updated_at: string;
}
```

Stored in `config_overrides` table with scope = "preset".

---

## This-Run Overrides

Temporary overrides for current session:

```typescript
interface ThisRunOverride {
  key_path: string;                 // "calls.ideas_generate.temperature"
  value: any;
  timestamp: string;
}
```

Stored in session (not persisted to DB). Cleared on new run or explicit reset.

---

## Config Merge Algorithm

```typescript
function mergeConfig(
  taskId: string,
  userPreset?: string,
  thisRunOverrides?: ThisRunOverride[]
): Config {
  // 1. Start with hardcoded fallbacks
  let config = HARDCODED_FALLBACKS;
  
  // 2. Merge prompts.json
  config = deepMerge(config, PROMPTS_JSON);
  
  // 3. If user preset specified, merge it
  if (userPreset) {
    const preset = loadUserPreset(userPreset);
    config = deepMerge(config, preset.config);
  }
  
  // 4. Apply this-run overrides
  if (thisRunOverrides) {
    for (const override of thisRunOverrides) {
      config = setByPath(config, override.key_path, override.value);
    }
  }
  
  // 5. Extract task-specific config
  const taskConfig = config.calls[taskId];
  
  // 6. Merge with global settings
  const effectiveConfig = {
    ...taskConfig,
    provider: taskConfig.model.provider || config.global.provider,
    logging: {
      ...config.global.logging,
      ...taskConfig.logging
    },
    budgets: {
      ...config.budgets,
      ...taskConfig.budgets
    }
  };
  
  return effectiveConfig;
}
```

---

## Config Validation

Before using a config, validate it:

```typescript
interface ConfigValidationError {
  field: string;
  error: string;
  value: any;
}

function validateConfig(config: Config): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  
  // Temperature must be 0-1
  if (config.model.temperature < 0 || config.model.temperature > 1) {
    errors.push({
      field: "model.temperature",
      error: "Must be between 0 and 1",
      value: config.model.temperature
    });
  }
  
  // Max tokens must be positive
  if (config.model.max_tokens <= 0) {
    errors.push({
      field: "model.max_tokens",
      error: "Must be positive",
      value: config.model.max_tokens
    });
  }
  
  // Provider must be registered
  if (!isProviderRegistered(config.model.provider)) {
    errors.push({
      field: "model.provider",
      error: "Provider not registered",
      value: config.model.provider
    });
  }
  
  // Required variables must be present
  const requiredVars = config.prompt.variables;
  // (check against available inputs)
  
  return errors;
}
```

---

## Effective Config Preview

Users can see the final merged config before execution:

```typescript
interface EffectiveConfigPreview {
  task_id: string;
  layers: {
    hardcoded: Partial<Config>;
    prompts_json: Partial<Config>;
    user_preset: Partial<Config> | null;
    this_run: Partial<Config> | null;
  };
  merged: Config;
  overrides_applied: number;
  validation_errors: ConfigValidationError[];
  estimated_cost: number;
}
```

Displayed in Control Console UI before running a task.

---

## Best Practices

1. **Start with presets**: Use Fast/Balanced/Full for common scenarios
2. **Override sparingly**: Only change what you need
3. **Test in isolation**: Use This-Run overrides to experiment
4. **Save working configs**: Create custom presets once tuned
5. **Monitor costs**: Check effective config's estimated cost before running
6. **Version control prompts.json**: Track changes over time
7. **Use validation**: Always validate before execution

---

## Summary

The config system provides:

- **4-layer hierarchy**: Fallbacks → prompts.json → Presets → This-Run
- **Deep merging**: Objects merge, arrays/primitives replace
- **Validation**: Type checking, constraint enforcement
- **Transparency**: Preview effective config before execution
- **Flexibility**: Override anything at any level
- **Safety**: Budget limits, validation rules, cost estimation

This architecture ensures maximum configurability while maintaining sane defaults and preventing costly mistakes.

