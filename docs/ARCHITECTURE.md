# Brand Pack - System Architecture

## Overview

Brand Pack is a creative automation system that transforms business websites into ready-to-run ad content. The system is built on three core principles:

1. **Model Agnostic**: Swap AI providers without touching business logic
2. **Maximum Configurability**: Every parameter adjustable at runtime
3. **Quality First**: High variance outputs that avoid AI slop

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  Progressive Lander → Review → Ideas → Copy → Image → Final     │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ API Routes
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Core Pipeline (packages/core)                │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Scraper    │───▶│    Kernel    │───▶│ Task Runner  │     │
│  │              │    │  Compressor  │    │              │     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
│                                                   │              │
│                                                   ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │    Config    │───▶│  Spec Builder│───▶│   Adapter    │     │
│  │    Engine    │    │              │    │    Router    │     │
│  └──────────────┘    └──────────────┘    └──────┬───────┘     │
└────────────────────────────────────────────────────┼────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Adapters (packages/adapters)         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Anthropic  │  │    OpenAI    │  │    Gemini    │  ...    │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Data Layer (Supabase)                           │
│                                                                  │
│  Postgres: kernels, runs, artifacts, audit, config              │
│  Storage: scraped content, images, export packs                 │
│  Auth: user sessions, RLS policies                              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Scrape & Kernel Generation

```
User enters URL
    │
    ▼
Check scrape_cache (by domain + content_hash)
    │
    ├─ Cache hit → Load kernel
    │
    └─ Cache miss → Scrape website
            │
            ├─ Fetch sitemap.xml (if available)
            ├─ Crawl up to max_pages
            ├─ Extract: meta, h1, products, pricing, tone
            │
            ▼
        Compress to ≤2KB brand kernel
            │
            ▼
        Store in brand_kernels + scrape_cache
```

### 2. Review Stage (Brand Snapshot)

```
Load brand kernel
    │
    ▼
Build LLM spec (neutral format)
    │
    ├─ system_prompt (from prompts.json)
    ├─ user_prompt (kernel interpolated)
    ├─ constraints (temperature, max_tokens, etc.)
    │
    ▼
Route to adapter (based on config.provider)
    │
    ▼
Adapter transforms spec → provider API format
    │
    ▼
LLM returns brand snapshot
    │
    ├─ tone, voice, style
    ├─ proof_points
    ├─ pricing_cues
    ├─ unique_angle
    │
    ▼
Store in artifacts table
    │
    ▼
Log audit (provider, model, tokens, cost)
```

### 3. Audience Analysis (Separate Call)

```
Load brand snapshot
    │
    ▼
Build audience_analysis spec
    │
    ▼
LLM identifies audience segments
    │
    ├─ "small business owners, 10-50 employees"
    ├─ "enterprise IT teams"
    ├─ "e-commerce managers"
    │
    ▼
Store segments with brand snapshot
```

### 4. Ideas Generation (High Variance)

```
Load brand snapshot + audience segments
    │
    ▼
Build ideas_generate spec
    │
    ├─ n_outputs: 20 (configurable)
    ├─ temperature: 0.9 (high variance)
    ├─ dedupe_threshold: 0.7
    │
    ▼
Generate 20 ideas
    │
    ▼
Dedupe (embeddings similarity check)
    │
    ▼
Rank by: clarity, proof alignment, emotion, originality
    │
    ▼
Display top n_displayed (default: 5-6)
    │
    ▼
User selects 3-5 ideas
```

### 5. Copy Generation (Before/After)

```
Load selected ideas
    │
    ▼
For each idea:
    │
    ├─ Generate 2-3 copy variants
    │   ├─ Before (collapsed): headline + short description
    │   └─ After (expanded): headline + full description
    │
    ▼
Apply length validation
    │
    ├─ before.headline_max: 40 chars
    ├─ before.description_max: 90 chars
    ├─ after.headline_max: 40 chars
    ├─ after.description_max: 300 chars
    │
    ▼
Check banned phrases (AI slop detection)
    │
    ▼
Score each variant (0-100)
    │
    ▼
Store ranked variants
```

### 6. Image Pipeline

```
Load selected copy variants
    │
    ▼
Generate image briefs
    │
    ├─ 2-3 briefs per copy
    ├─ Vary style: product, lifestyle, abstract
    ├─ Match mood to copy emotion
    ├─ Specify 4:5 aspect ratio
    │
    ▼
Route to image adapter
    │
    ├─ DALL-E 3
    ├─ Stable Diffusion (Replicate)
    └─ Flux / Ideogram
    │
    ▼
Generate images
    │
    ▼
Store in Supabase storage
    │
    ▼
Return public URLs
```

### 7. Export Pack

```
User selects final copy + images
    │
    ▼
Package into ZIP:
    │
    ├─ copy/ (JSON files)
    ├─ images/ (PNG files)
    └─ manifest.json (metadata, config, scores)
    │
    ▼
Store in export-packs bucket
    │
    ▼
Download link
```

## Adapter Pattern

### Why Adapters?

1. **Provider Independence**: Change LLM/image providers without rewriting core logic
2. **Future-Proof**: Add new models as they're released
3. **A/B Testing**: Run same spec through multiple providers, compare results
4. **Cost Optimization**: Route to cheapest/fastest provider based on task

### Adapter Interface

All adapters implement a standard interface:

```typescript
interface LLMAdapter {
  provider: string;
  
  execute(spec: LLMSpec): Promise<AdapterResponse>;
  
  estimateCost(spec: LLMSpec): number;
  
  validateSpec(spec: LLMSpec): boolean;
}
```

### Neutral Spec Format

The core system works with a **neutral spec** that's provider-agnostic:

```typescript
interface LLMSpec {
  task_id: string;              // "ideas_generate", "copy_generate", etc.
  system_prompt: string;        // System instruction
  user_prompt: string;          // User message (with interpolated variables)
  response_format: 'text' | 'json' | 'structured';
  schema?: object;              // For structured outputs
  constraints: {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop_sequences?: string[];
  };
}
```

### Adapter Transformation

Each adapter transforms the neutral spec into the provider's API format:

```typescript
// Anthropic adapter
class AnthropicAdapter implements LLMAdapter {
  async execute(spec: LLMSpec): Promise<AdapterResponse> {
    // Transform neutral spec → Anthropic Messages API
    const anthropicRequest = {
      model: this.config.model,
      max_tokens: spec.constraints.max_tokens,
      temperature: spec.constraints.temperature,
      messages: [
        { role: 'user', content: spec.user_prompt }
      ],
      system: spec.system_prompt
    };
    
    const response = await anthropic.messages.create(anthropicRequest);
    
    // Transform response → standard format
    return {
      outputs: [response.content[0].text],
      usage: response.usage,
      provider: 'anthropic',
      model: response.model,
      cost_usd: calculateCost(response.usage, response.model),
      duration_ms: Date.now() - startTime,
      raw_response: response
    };
  }
}
```

## Configuration System

### Config Hierarchy (Precedence: Low → High)

```
1. Hardcoded Fallbacks (in code)
    ↓
2. prompts.json (defaults)
    ↓
3. User Saved Presets
    ↓
4. This-Run Overrides (session-based)
    ↓
[Effective Config] → Used for execution
```

### Config Scope

- **Global**: Applies to all calls (e.g., default provider, logging level)
- **Per-Call**: Specific to one task (e.g., ideas_generate.temperature)
- **This-Run**: Temporary overrides for current session

### Config Storage

```
prompts.json (file)
    ↓
config_overrides table (user presets)
    ↓
Session storage (this-run overrides)
    ↓
Merged at runtime → Effective config
```

## Caching Strategy

### 1. Scrape Cache

```sql
-- scrape_cache table
domain          | content_hash | etag | last_modified | expires_at | raw_html_url
----------------|--------------|------|---------------|------------|-------------
acme.com        | abc123...    | "w/..." | 2025-01-10 | 2025-01-17 | s3://...
```

- Cache key: `domain + content_hash` or `domain + etag`
- TTL: 7 days (configurable)
- Invalidation: Manual or on ETag change

### 2. LLM Output Cache

```sql
-- Cache key: hash(task_id + inputs + config)
cache_key       | task_id | outputs | created_at | expires_at
----------------|---------|---------|------------|------------
def456...       | ideas   | [...]   | 2025-01-10 | 2025-01-11
```

- Cache key: `hash(task_id + kernel + config)`
- TTL: 24 hours (configurable)
- Skipped if config changes

### 3. Image Cache

- Images stored permanently in Supabase storage
- Keyed by brief content hash
- Never expires (unless manually deleted)

## User Roles & Access

### 1. Admin (Hidden Access)

- URL: `/console` (not linked in UI)
- Full backend control:
  - Edit prompts.json live
  - Adjust all settings
  - View audit logs
  - Manage costs
  - Re-run/debug any job

### 2. Power User

- Regular app interface with "Advanced" toggle
- Can adjust:
  - Number of ideas generated/displayed
  - Regeneration strategy (fresh vs. use remaining)
  - Model provider per stage
  - Basic prompt tweaks

### 3. Simple User (Default)

- Clean progressive interface
- Just: URL → Review → Ideas → Copy → Image → Download
- No exposed settings
- Settings gear icon for minimal controls (presets: Fast/Balanced/Full)

## Progressive Interface Design

### Homepage (Pre-Login)

```
Clean landing page
    │
    ├─ Hero: "Turn your website into ready-to-run ads"
    ├─ Demo showcase (3-5 examples)
    ├─ CTA: "Try with your website"
    │
    └─ No sidebar, no complex navigation
```

### In-App Flow (Post-Login)

```
Stage 1: URL Input
    │
    ├─ Simple input field
    ├─ Optional: Upload/paste content
    │
    ▼
Stage 2: Review (Brand Snapshot)
    │
    ├─ Displays snapshot
    ├─ Interface grows: breadcrumbs appear
    ├─ Sidebar appears (minimal: Home, History, Settings)
    │
    ▼
Stage 3: Ideas
    │
    ├─ Grid of top 5-6 ideas
    ├─ "Show more" to see all 20
    ├─ "Regenerate" button
    │
    ▼
Stage 4: Copy
    │
    ├─ Two-pane cards (before/after)
    ├─ Character counts
    │
    ▼
Stage 5: Images
    │
    ├─ Generated images grid
    ├─ Select best per copy
    │
    ▼
Stage 6: Final
    │
    ├─ Combined preview
    ├─ Download ZIP
    └─ "Start new campaign"
```

## Security & Privacy

### Row-Level Security (RLS)

```sql
-- Users can only see their own data
CREATE POLICY user_isolation ON runs
  USING (user_id = auth.uid());

CREATE POLICY user_isolation ON artifacts
  USING (run_id IN (SELECT id FROM runs WHERE user_id = auth.uid()));
```

### Secrets Management

- API keys stored in Vercel environment variables
- Never exposed in client bundle
- Rotatable without code changes

### Data Redaction

- Scraper redacts: credit card numbers, emails, phone numbers
- Audit logs redact sensitive content via `redact_patterns` config

## Performance Targets

| Stage | Target | Strategy |
|-------|--------|----------|
| Scrape + Kernel | <30s | Parallel fetching, smart selectors, cache |
| Review | <20s | Fast model (Haiku/GPT-4o-mini) |
| Ideas (20) | <30s | Batch or parallel generation |
| Copy (per idea) | <15s | Streaming response |
| Images (per brief) | <45s | Async generation, progress updates |
| **Total Pipeline** | **<5 min** | Aggressive caching |

## Cost Management

### Budget Controls

```json
{
  "budgets": {
    "max_tokens_per_call": 4000,
    "max_cost_per_run": 5.00,
    "alert_threshold": 50.00
  }
}
```

### Cost Tracking

```sql
-- audit_log table
run_id | call_type | provider | model | tokens_used | cost_usd | duration_ms
-------|-----------|----------|-------|-------------|----------|------------
123    | ideas     | anthropic| sonnet| 3500        | 0.035    | 2400
```

### Alerts

- Trigger if run cost > $5
- Alert if hourly cost > $50
- Dashboard shows cost trends

## Monitoring & Observability

### Metrics

- API response times (p50, p95, p99)
- Error rates by endpoint
- Cache hit rates
- Provider latency comparison
- Cost per run

### Logging Levels

1. **ERROR**: Failures, exceptions
2. **WARN**: Rate limits, fallbacks
3. **INFO**: Task start/end, cache hits
4. **DEBUG**: Full specs, responses (admin only)

### Audit Trail

Every LLM/image call logged with:
- Timestamp
- Task ID
- Provider + model
- Input hash (for cache key)
- Output summary
- Tokens + cost
- Duration

## Extensibility

### Adding a New LLM Provider

1. Create adapter: `packages/adapters/src/newprovider.ts`
2. Implement `LLMAdapter` interface
3. Register in `registry.ts`
4. Add provider option to config UI
5. No changes to core logic required

### Adding a New Pipeline Stage

1. Define task spec in `prompts.json`
2. Add endpoint: `apps/web/src/app/api/newstage/route.ts`
3. Create UI page: `apps/web/src/app/newstage/page.tsx`
4. Update navigation breadcrumbs
5. Core runner handles it automatically

## Anti-Slop Mechanisms

### 1. High Variance Prompts

```
"Generate 20 COMPLETELY DIFFERENT angles.
No two should target the same pain point.
Mix: emotional, logical, aspirational, fear-based, humor, urgency.
Vary format: question, statement, challenge, story.
BE SPECIFIC. Use the brand's actual proof points."
```

### 2. Banned Phrases Filter

```json
{
  "banned_phrases": [
    "game-changer", "revolutionize", "unlock",
    "leverage", "seamless", "synergy",
    "take your X to the next level"
  ]
}
```

### 3. Dedupe System

- Calculate embeddings for all outputs
- Compare pairwise similarity
- Flag if >70% similar
- Regenerate or exclude from final set

### 4. Proof Point Validation

- Extract proof points from kernel
- Check if copy uses actual brand facts
- Score higher if specific vs. generic

### 5. Human-in-Loop Scoring

- Manual rating on 5 test domains
- Target: Authenticity ≥4.0, Variance ≥4.2, Quality ≥3.8
- Iterate prompts until targets met

## Deployment Architecture

```
GitHub (main branch)
    │
    ├─ Push triggers Vercel build
    │
    ▼
Vercel (Next.js app)
    │
    ├─ Serverless functions (API routes)
    ├─ Edge caching
    ├─ Environment secrets
    │
    ▼
Supabase (Database + Storage)
    │
    ├─ Postgres (data)
    ├─ Storage (files)
    ├─ Edge Functions (optional)
    └─ Auth (sessions)
```

### Environment Variables

```
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ... (server-only)

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Image Providers
REPLICATE_API_TOKEN=r8_...

# App Config
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://brandpack.vercel.app
```

## Summary

Brand Pack's architecture is designed for:

1. **Flexibility**: Swap any component without breaking others
2. **Quality**: Multiple anti-slop mechanisms at every stage
3. **Transparency**: Full audit trail, cost tracking, config visibility
4. **Scalability**: Caching, async processing, efficient pipelines
5. **Maintainability**: Clean separation of concerns, comprehensive docs

The adapter pattern ensures we're never locked into a single AI provider, and the configuration system means every parameter is tunable without code changes. This foundation supports rapid iteration and experimentation to achieve the highest quality outputs.

