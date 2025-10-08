# Brand Pack - API Contract

All API endpoints return JSON and follow this error format:

```typescript
{
  "error": {
    "code": string;        // "SCRAPE_TIMEOUT", "INVALID_INPUT", etc.
    "message": string;     // User-friendly error message
    "details"?: object;    // Optional debug info
  }
}
```

## Base Response Wrapper

Successful responses follow this pattern:

```typescript
{
  "data": T;               // Actual response data
  "meta": {
    "run_id": string;      // UUID for this run
    "stage": string;       // Current pipeline stage
    "duration_ms": number; // Request processing time
    "cached": boolean;     // Was result from cache?
  }
}
```

---

## POST /api/scrape

**Description**: Scrape a website and generate brand kernel

**Request**:
```typescript
{
  "domain": string;                    // "acme.com" or "https://acme.com"
  "options"?: {
    "force_refresh"?: boolean;         // Bypass cache (default: false)
    "max_pages"?: number;              // Override default (default: 20)
    "timeout_ms"?: number;             // Per-page timeout (default: 10000)
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "kernel": {
      "domain": string;
      "products": string[];            // ["Widget Pro ($99)", ...]
      "tone": string[];                // ["professional", "technical", ...]
      "audience": string;              // "B2B teams, 10-500 employees"
      "proof_points": string[];        // ["10k customers", "SOC2 certified"]
      "pricing_cues": string[];        // ["Starts at $99/mo"]
      "competitors_implied": string[]; // ["CompetitorA", "LegacyTool"]
      "unique_angle": string;          // "Only tool with real-time sync"
      "compressed_kb": number;         // Actual size in KB
      "citations": {                   // Where info was found
        [key: string]: string;         // "products": "homepage, /products"
      }
    },
    "scrape_metadata": {
      "pages_crawled": number;
      "cache_hit": boolean;
      "etag"?: string;
      "content_hash": string;
    }
  },
  "meta": {
    "run_id": string;
    "stage": "scrape",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

**Errors**:
- 400: `INVALID_DOMAIN` - Domain format invalid
- 408: `SCRAPE_TIMEOUT` - Scraper timed out
- 429: `RATE_LIMITED` - Too many requests
- 500: `SCRAPE_FAILED` - Scraper error

---

## POST /api/review

**Description**: Generate brand snapshot from kernel

**Request**:
```typescript
{
  "run_id": string;                    // From /api/scrape response
  "config_overrides"?: {
    "provider"?: string;               // "anthropic", "openai", etc.
    "model"?: string;                  // Provider-specific model name
    "temperature"?: number;            // 0-1
    "max_tokens"?: number;
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "snapshot": {
      "tone": string[];                // ["professional", "data-driven", "urgent"]
      "voice": string[];               // ["confident", "technical", "concise"]
      "style": string[];               // ["benefit-driven", "proof-heavy"]
      "proof_points": {
        "customers": string[];         // ["10k users", "Fortune 500 clients"]
        "metrics": string[];           // ["99.9% uptime", "2x faster"]
        "certifications": string[];    // ["SOC2", "ISO 27001"]
      },
      "pricing_cues": {
        "tiers": string[];             // ["Starter $99/mo", "Pro $299/mo"]
        "positioning": string;         // "Mid-market premium"
      },
      "target_audience": string;       // Primary audience description
      "competitors": string[];         // Identified or implied competitors
      "unique_angle": string;          // Key differentiator
      "messaging_themes": string[];    // Common messaging patterns
    },
    "audit": {
      "provider": string;
      "model": string;
      "tokens_used": number;
      "cost_usd": number;
      "duration_ms": number;
    }
  },
  "meta": {
    "run_id": string;
    "stage": "review",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

**Errors**:
- 400: `INVALID_RUN_ID` - Run not found
- 402: `COST_CAP_EXCEEDED` - Budget limit hit
- 429: `RATE_LIMITED` - Provider rate limit
- 500: `LLM_ERROR` - Provider API error

---

## POST /api/audience

**Description**: Analyze brand snapshot to identify audience segments

**Request**:
```typescript
{
  "run_id": string;
  "config_overrides"?: {
    "provider"?: string;
    "model"?: string;
    "n_segments"?: number;             // Max segments (default: 5)
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "segments": [
      {
        "id": string;                  // "segment-1"
        "name": string;                // "Small Business Owners"
        "description": string;         // "10-50 employees, limited IT"
        "pain_points": string[];       // Primary challenges
        "messaging_angle": string;     // How to speak to them
        "priority": number;            // 1-5, based on fit
      }
    ],
    "audit": {
      "provider": string;
      "model": string;
      "tokens_used": number;
      "cost_usd": number;
      "duration_ms": number;
    }
  },
  "meta": {
    "run_id": string;
    "stage": "audience",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

---

## POST /api/ideas

**Description**: Generate marketing ideas with high variance

**Request**:
```typescript
{
  "run_id": string;
  "config_overrides"?: {
    "provider"?: string;
    "model"?: string;
    "n_outputs"?: number;              // Total to generate (default: 20)
    "n_displayed"?: number;            // How many to show (default: 6)
    "temperature"?: number;            // Variance control (default: 0.9)
    "dedupe_threshold"?: number;       // Similarity cutoff (default: 0.7)
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "ideas": [
      {
        "id": string;                  // "idea-1"
        "rank": number;                // 1-20 based on score
        "angle": string;               // "Fear of data loss"
        "hook": string;                // "What if your CRM crashed right now?"
        "target_emotion": string;      // "urgency"
        "target_segment"?: string;     // Which audience segment
        "proof_point": string;         // Brand fact to use
        "format": string;              // "question", "statement", "story"
        "score": {
          "total": number;             // 0-100
          "clarity": number;           // 0-100
          "proof_alignment": number;   // 0-100
          "emotion": number;           // 0-100
          "originality": number;       // 0-100
        },
        "displayed": boolean;          // Is it in top n_displayed?
      }
    ],
    "metadata": {
      "total_generated": number;
      "displayed": number;
      "dedupe_removed": number;
      "avg_similarity": number;        // Across all pairs
    },
    "audit": {
      "provider": string;
      "model": string;
      "tokens_used": number;
      "cost_usd": number;
      "duration_ms": number;
    }
  },
  "meta": {
    "run_id": string;
    "stage": "ideas",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

**Errors**:
- 400: `NO_SNAPSHOT` - Must run /api/review first
- 402: `COST_CAP_EXCEEDED`
- 422: `LOW_VARIANCE` - Ideas too similar, regenerate

---

## POST /api/ideas/regenerate

**Description**: Regenerate ideas (fresh or use remaining)

**Request**:
```typescript
{
  "run_id": string;
  "strategy": "fresh" | "use_remaining"; // Fresh batch or show hidden ideas
  "config_overrides"?: {
    "n_outputs"?: number;
  }
}
```

**Response**: Same as `/api/ideas`

---

## POST /api/copy

**Description**: Generate ad copy for selected ideas

**Request**:
```typescript
{
  "run_id": string;
  "idea_ids": string[];                // ["idea-1", "idea-3", "idea-5"]
  "config_overrides"?: {
    "provider"?: string;
    "model"?: string;
    "variants_per_idea"?: number;      // Default: 3
    "before": {
      "headline_max"?: number;         // Default: 40 chars
      "description_max"?: number;      // Default: 90 chars
    },
    "after": {
      "headline_max"?: number;         // Default: 40 chars
      "description_max"?: number;      // Default: 300 chars
    }
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "copy_sets": [
      {
        "idea_id": string;
        "variants": [
          {
            "id": string;              // "copy-1a"
            "before": {
              "headline": string;
              "description": string;
              "char_count": {
                "headline": number;
                "description": number;
              }
            },
            "after": {
              "headline": string;      // Same as before
              "description": string;   // Extended version
              "char_count": {
                "headline": number;
                "description": number;
              }
            },
            "score": {
              "total": number;
              "clarity": number;
              "proof": number;
              "emotion": number;
              "originality": number;
            },
            "flags": {
              "has_banned_phrases": boolean;
              "over_length": boolean;
              "missing_proof": boolean;
            }
          }
        ]
      }
    ],
    "audit": {
      "provider": string;
      "model": string;
      "tokens_used": number;
      "cost_usd": number;
      "duration_ms": number;
    }
  },
  "meta": {
    "run_id": string;
    "stage": "copy",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

**Errors**:
- 400: `INVALID_IDEA_IDS` - Ideas not found
- 422: `VALIDATION_FAILED` - Copy doesn't meet validation rules

---

## POST /api/image/brief

**Description**: Generate image briefs for selected copy

**Request**:
```typescript
{
  "run_id": string;
  "copy_ids": string[];                // ["copy-1a", "copy-3b"]
  "config_overrides"?: {
    "provider"?: string;
    "model"?: string;
    "briefs_per_copy"?: number;        // Default: 2-3
    "styles"?: string[];               // ["product", "lifestyle", "abstract"]
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "brief_sets": [
      {
        "copy_id": string;
        "briefs": [
          {
            "id": string;              // "brief-1"
            "prompt": string;          // Full image prompt
            "negative_prompt": string; // What to avoid
            "style": string;           // "product_photography"
            "mood": string;            // "confident", "urgent", etc.
            "composition": string;     // "centered", "rule-of-thirds"
            "aspect_ratio": "4:5";
            "estimated_cost": number;  // Per image
          }
        ]
      }
    ],
    "audit": {
      "provider": string;
      "model": string;
      "tokens_used": number;
      "cost_usd": number;
      "duration_ms": number;
    }
  },
  "meta": {
    "run_id": string;
    "stage": "image_brief",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

---

## POST /api/image/render

**Description**: Generate actual images from briefs

**Request**:
```typescript
{
  "run_id": string;
  "brief_ids": string[];               // ["brief-1", "brief-2"]
  "config_overrides"?: {
    "provider"?: string;               // "openai", "replicate", etc.
    "model"?: string;                  // "dall-e-3", "flux-1-pro"
    "resolution"?: string;             // "1024x1280" (4:5)
  }
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "images": [
      {
        "brief_id": string;
        "image_id": string;
        "url": string;                 // Public Supabase Storage URL
        "thumbnail_url": string;       // Smaller preview
        "metadata": {
          "provider": string;
          "model": string;
          "resolution": string;
          "aspect_ratio": "4:5";
          "file_size_kb": number;
          "format": "png" | "jpg";
        },
        "cost_usd": number;
        "duration_ms": number;
      }
    ],
    "total_cost": number;
    "failed": [                        // Any that failed
      {
        "brief_id": string;
        "error": string;
      }
    ]
  },
  "meta": {
    "run_id": string;
    "stage": "image_render",
    "duration_ms": number;
    "cached": boolean;
  }
}
```

**Errors**:
- 400: `INVALID_BRIEF_IDS`
- 402: `COST_CAP_EXCEEDED`
- 429: `RATE_LIMITED`
- 500: `IMAGE_GENERATION_FAILED`

---

## POST /api/export

**Description**: Package selected copy + images into downloadable ZIP

**Request**:
```typescript
{
  "run_id": string;
  "selections": {
    "copy_ids": string[];
    "image_ids": string[];
  },
  "format"?: "zip" | "json";           // Default: "zip"
  "include_metadata"?: boolean;        // Include scores, config (default: true)
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "export_id": string;
    "download_url": string;            // Pre-signed URL (expires in 1 hour)
    "filename": string;                // "brandpack-acme-com-2025-01-10.zip"
    "file_size_kb": number;
    "contents": {
      "copy_files": number;
      "image_files": number;
      "manifest": boolean;
    },
    "expires_at": string;              // ISO timestamp
  },
  "meta": {
    "run_id": string;
    "stage": "export",
    "duration_ms": number;
    "cached": false;
  }
}
```

---

## GET /api/runs/:run_id

**Description**: Get full details of a run

**Response** (200 OK):
```typescript
{
  "data": {
    "run": {
      "id": string;
      "user_id": string;
      "domain": string;
      "status": "in_progress" | "completed" | "failed";
      "current_stage": string;
      "created_at": string;
      "updated_at": string;
      "completed_at"?: string;
      "config_snapshot": object;       // Config used for this run
      "artifacts": {
        "kernel"?: object;
        "snapshot"?: object;
        "audience"?: object;
        "ideas"?: object[];
        "copy"?: object[];
        "images"?: object[];
      },
      "audit_log": [
        {
          "call_type": string;
          "provider": string;
          "model": string;
          "tokens_used": number;
          "cost_usd": number;
          "duration_ms": number;
          "timestamp": string;
        }
      ],
      "total_cost": number;
      "total_duration_ms": number;
    }
  }
}
```

---

## GET /api/runs

**Description**: List all runs for current user

**Query Params**:
- `status?: "in_progress" | "completed" | "failed"`
- `limit?: number` (default: 20)
- `offset?: number` (default: 0)
- `sort?: "created_at" | "cost" | "domain"` (default: "created_at")
- `order?: "asc" | "desc"` (default: "desc")

**Response** (200 OK):
```typescript
{
  "data": {
    "runs": [
      {
        "id": string;
        "domain": string;
        "status": string;
        "current_stage": string;
        "created_at": string;
        "total_cost": number;
        "artifacts_count": number;
      }
    ],
    "pagination": {
      "total": number;
      "limit": number;
      "offset": number;
      "has_more": boolean;
    }
  }
}
```

---

## GET /api/settings

**Description**: Get effective config for current user

**Response** (200 OK):
```typescript
{
  "data": {
    "effective_config": object;       // Full merged config
    "layers": {
      "hardcoded": object;
      "prompts_json": object;
      "user_preset": object | null;
      "this_run": object | null;
    },
    "presets": [
      {
        "name": "fast";
        "description": "Cheaper models, <2 min";
        "config": object;
      },
      {
        "name": "balanced";
        "description": "Default quality/speed";
        "config": object;
      },
      {
        "name": "full";
        "description": "Best models, ~5 min";
        "config": object;
      }
    ]
  }
}
```

---

## POST /api/settings

**Description**: Update user config override

**Request**:
```typescript
{
  "scope": "global" | "call" | "this_run";
  "key_path": string;                  // Dot notation: "calls.ideas.temperature"
  "value": any;
  "save_as_preset"?: string;           // Save as named preset
}
```

**Response** (200 OK):
```typescript
{
  "data": {
    "updated": true;
    "effective_config": object;        // New merged config
  }
}
```

---

## DELETE /api/settings/override/:override_id

**Description**: Remove a config override

**Response** (200 OK):
```typescript
{
  "data": {
    "deleted": true;
    "effective_config": object;
  }
}
```

---

## Admin-Only Endpoints

These are only accessible via `/console` and require admin role.

### GET /api/admin/audit

**Description**: Full audit log across all users

**Query Params**:
- `user_id?: string`
- `provider?: string`
- `start_date?: string`
- `end_date?: string`
- `min_cost?: number`

**Response**: Array of audit entries with user context

### POST /api/admin/config/reload

**Description**: Reload prompts.json from file (for live editing)

**Response**:
```typescript
{
  "data": {
    "reloaded": true;
    "config": object;
  }
}
```

### POST /api/admin/cache/clear

**Description**: Clear all caches

**Request**:
```typescript
{
  "scope": "all" | "scrape" | "llm" | "image";
  "domain"?: string;                   // Optional: clear for specific domain
}
```

**Response**:
```typescript
{
  "data": {
    "cleared": number;                 // Number of cache entries deleted
  }
}
```

---

## Webhooks (Future)

### POST /api/webhooks/stripe

**Description**: Handle Stripe payment events

**Request**: Standard Stripe webhook payload

**Events**:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## Rate Limiting

All endpoints are rate-limited:

- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute
- **Admin**: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1704988800
```

Rate limit error (429):
```typescript
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds.",
    "details": {
      "retry_after": 60
    }
  }
}
```

---

## Timeouts

- Scrape: 60s
- LLM calls: 120s
- Image generation: 180s

Timeout error (504):
```typescript
{
  "error": {
    "code": "TIMEOUT",
    "message": "Request timed out after 120s",
    "details": {
      "stage": "ideas_generate",
      "timeout_ms": 120000
    }
  }
}
```

---

## Versioning

API version in header:
```
X-API-Version: 1.0
```

Breaking changes will increment major version. Clients should send:
```
Accept: application/json; version=1.0
```

