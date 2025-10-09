# Phase C Plan: Build API Routes

**Goal:** Build and test ALL API routes one at a time, methodically and thoroughly

**Philosophy:** Quality over speed. Test every route with Noop adapters first. Write tests. Document.

---

## Route Overview (from API_CONTRACT.md)

We need to build **6 API routes** total:

1. **POST /api/scrape** - Scrape domain → brand kernel
2. **POST /api/review** - Generate review brief from kernel
3. **POST /api/ideas** - Generate 20 campaign ideas
4. **POST /api/copy** - Generate 5-block copy sequence
5. **POST /api/image/brief** - Generate 4:5 image brief
6. **POST /api/image/asset** - Render final image

Plus:
7. **GET /api/audit/:run_id** - Return audit trail and artifacts

---

## Build Order & Strategy

We'll build **ONE route at a time** in pipeline order:

### Route 1: POST /api/scrape ⏳
**Dependencies:** None - just uses core scraper + kernel compressor  
**Test Strategy:** Use real domains (no API keys needed)  
**Output:** Brand kernel stored in Supabase

### Route 2: POST /api/review ⏳
**Dependencies:** /api/scrape must work  
**Test Strategy:** Use Noop LLM adapter first  
**Output:** Review brief with tone, voice, proof points

### Route 3: POST /api/ideas ⏳
**Dependencies:** /api/review must work  
**Test Strategy:** Use Noop LLM adapter, verify 20 ideas  
**Output:** 20 campaign ideas with validation

### Route 4: POST /api/copy ⏳
**Dependencies:** /api/ideas must work  
**Test Strategy:** Use Noop LLM adapter, verify 5 blocks  
**Output:** 5-block copy sequence with continuity check

### Route 5: POST /api/image/brief ⏳
**Dependencies:** /api/ideas must work  
**Test Strategy:** Use Noop LLM adapter  
**Output:** 4:5 image brief with safe zones

### Route 6: POST /api/image/asset ⏳
**Dependencies:** /api/image/brief must work  
**Test Strategy:** Use Noop image adapter (returns placeholder URL)  
**Output:** Asset URLs

### Route 7: GET /api/audit/:run_id ⏳
**Dependencies:** All previous routes  
**Test Strategy:** Query Supabase for audit trail  
**Output:** Full audit trail JSON

---

## Shared Response Envelope

All routes use this envelope (from API_CONTRACT.md):

```typescript
interface APIResponse<T> {
  data: T;
  meta: {
    run_id: string;
    stage: string; // e.g., "ideas.generate"
    duration_ms: number;
    provider: string;
    model: string;
    cost_usd: number;
    validation_flags: string[]; // e.g., ["length_ok", "evidence_present"]
    evidence_hashes: string[]; // SHA256 hashes for citation tracking
    cached: boolean;
  };
}

interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

## Detailed Plan for Each Route

### 1. POST /api/scrape

**File:** `apps/web/src/app/api/scrape/route.ts`

**Request:**
```typescript
interface ScrapeRequest {
  domain: string; // e.g., "https://example.com"
  force_refresh?: boolean; // default false
}
```

**Response Data:**
```typescript
interface ScrapeResponse {
  kernel_id: string; // UUID
  pages_crawled: number; // e.g., 5
  bytes_collected: number; // e.g., 241500
  citations: Record<string, string>; // e.g., { "home": "/", "pricing": "/pricing" }
}
```

**Error Codes:**
- `INVALID_DOMAIN` - Domain validation failed
- `CRAWL_LIMIT_REACHED` - Exceeded 6 pages or 300KB
- `SCRAPE_TIMEOUT` - Exceeded 15s total or 5s per request
- `SCRAPE_FAILED` - Crawler threw an error

**Implementation Steps:**
1. Parse and validate request body
2. Validate domain (must start with http:// or https://)
3. Call `crawlSite()` from core with constraints:
   ```typescript
   const crawlConfig = {
     max_pages: 6,
     max_total_kb: 300,
     max_concurrency: 4,
     per_request_timeout_ms: 5000,
     total_timeout_ms: 15000,
   };
   ```
4. Call `compressKernel()` to create <=2KB kernel
5. Generate `kernel_id` (UUID)
6. Store kernel in Supabase (`kernels` table)
7. Generate `citations` map from crawled pages
8. Return response with meta

**Tests:**
- Valid domain → successful scrape
- Invalid domain → `INVALID_DOMAIN` error
- Too many pages → `CRAWL_LIMIT_REACHED` error
- Timeout → `SCRAPE_TIMEOUT` error
- Duplicate request with `force_refresh: false` → return cached kernel

---

### 2. POST /api/review

**File:** `apps/web/src/app/api/review/route.ts`

**Request:**
```typescript
interface ReviewRequest {
  run_id: string; // UUID from previous scrape
}
```

**Response Data:**
```typescript
interface ReviewResponse {
  summary: {
    tone: string[]; // e.g., ["confident", "technical"]
    voice: string[]; // e.g., ["concise", "evidence-led"]
    proof_points: string[]; // e.g., ["99.9% uptime", "SOC 2"]
    pricing_cues: string[]; // e.g., ["Starts at $99"]
    target_audience: string; // e.g., "Mid-market IT buyers"
    citations: string[]; // e.g., ["home", "pricing"]
  };
}
```

**Error Codes:**
- `MISSING_KERNEL` - run_id not found in database
- `REVIEW_GENERATION_FAILED` - LLM call failed

**Implementation Steps:**
1. Parse request body, validate `run_id`
2. Fetch kernel from Supabase by `run_id`
3. Build LLM spec using `buildScrapeReviewSpec(kernel, callConfig)`
4. Call `routeSpec()` to execute LLM
5. Parse LLM output (should be JSON with tone, voice, proof_points, etc.)
6. Run `validateTaskOutput()` on response
7. Store review in Supabase (`reviews` table)
8. Log to audit trail
9. Return response

**Tests:**
- Valid run_id → successful review
- Missing run_id → `MISSING_KERNEL` error
- LLM failure → `REVIEW_GENERATION_FAILED` error
- Validation failure → return error with details
- Use Noop adapter → verify it returns mock data

---

### 3. POST /api/ideas

**File:** `apps/web/src/app/api/ideas/route.ts`

**Request:**
```typescript
interface IdeasRequest {
  run_id: string;
}
```

**Response Data:**
```typescript
interface IdeasResponse {
  ideas: Array<{
    id: string; // e.g., "idea-01"
    headline: string;
    angle: string;
    audience: string;
    format: string;
    evidence_keys: string[];
    validation: {
      banned_phrases: boolean;
      length_ok: boolean;
      evidence_present: boolean;
    };
  }>;
}
```

**Error Codes:**
- `IDEA_COUNT_MISMATCH` - Didn't generate exactly 20 ideas
- `BANNED_PHRASE_DETECTED` - Found slop in one of the ideas
- `EVIDENCE_MISSING` - Idea doesn't reference kernel evidence

**Implementation Steps:**
1. Parse request, validate `run_id`
2. Fetch kernel + review from Supabase
3. Build LLM spec using `buildIdeasGenerateSpec(kernel, review, callConfig)`
4. Call `routeSpec()`
5. Parse output (should be array of 20 ideas)
6. Run `validateIdeas()` on each idea:
   - Check for banned phrases (slop)
   - Validate evidence_keys reference kernel
   - Check length constraints
7. Store ideas in Supabase (`ideas` table)
8. Log to audit trail
9. Return response

**Tests:**
- Valid input → 20 ideas
- Too few/many ideas → `IDEA_COUNT_MISMATCH` error
- Banned phrase → `BANNED_PHRASE_DETECTED` error
- Missing evidence → `EVIDENCE_MISSING` error
- Use Noop adapter → verify mock ideas structure

---

### 4. POST /api/copy

**File:** `apps/web/src/app/api/copy/route.ts`

**Request:**
```typescript
interface CopyRequest {
  run_id: string;
  idea_id: string; // e.g., "idea-01"
}
```

**Response Data:**
```typescript
interface CopyResponse {
  blocks: Array<{
    slot: string; // "hook" | "context" | "proof" | "objection" | "cta"
    content: string;
    char_count: number;
    evidence_keys: string[];
  }>;
  continuity_flag: boolean; // true if blocks don't flow well
}
```

**Error Codes:**
- `CONTINUITY_BROKEN` - Blocks don't flow logically
- `LENGTH_OUT_OF_RANGE` - Block violates length constraints
- `BANNED_PHRASE_DETECTED` - Found slop in copy

**Implementation Steps:**
1. Parse request, validate `run_id` and `idea_id`
2. Fetch kernel, review, and selected idea from Supabase
3. Build LLM spec using `buildCopyGenerateSpec(idea, kernel, review, callConfig)`
4. Call `routeSpec()`
5. Parse output (should be array of 5 blocks)
6. Run `validateCopy()` on each block:
   - Check slot names (hook, context, proof, objection, cta)
   - Validate character counts per slot
   - Check for banned phrases
   - Detect continuity issues
7. Store copy blocks in Supabase (`copy_blocks` table)
8. Log to audit trail
9. Return response

**Tests:**
- Valid input → 5 blocks with correct slots
- Wrong slot name → validation error
- Length violation → `LENGTH_OUT_OF_RANGE` error
- Banned phrase → `BANNED_PHRASE_DETECTED` error
- Continuity issues → `continuity_flag: true`
- Use Noop adapter → verify mock copy structure

---

### 5. POST /api/image/brief

**File:** `apps/web/src/app/api/image/brief/route.ts`

**Request:**
```typescript
interface ImageBriefRequest {
  run_id: string;
  idea_id: string;
}
```

**Response Data:**
```typescript
interface ImageBriefResponse {
  brief: {
    aspect_ratio: string; // "4:5" (Instagram, LinkedIn portrait)
    safe_zone_top: number; // e.g., 0.15 (15% from top)
    safe_zone_bottom: number; // e.g., 0.15
    visual_direction: string; // e.g., "Night office, calm lighting"
    copy_overlay: string; // e.g., "Place CTA in lower third"
    evidence_keys: string[];
  };
}
```

**Error Codes:**
- `MISSING_IDEA` - idea_id not found
- `BRIEF_VALIDATION_FAILED` - Generated brief violates constraints

**Implementation Steps:**
1. Parse request, validate `run_id` and `idea_id`
2. Fetch kernel, review, and selected idea
3. Build LLM spec using `buildImageBriefSpec(idea, kernel, review, callConfig)`
4. Call `routeSpec()`
5. Parse output (should contain aspect_ratio, safe zones, etc.)
6. Run `validateImageBrief()`:
   - Check aspect_ratio is "4:5"
   - Validate safe zone values (0.10-0.20)
   - Check required fields present
7. Store brief in Supabase (`image_briefs` table)
8. Log to audit trail
9. Return response

**Tests:**
- Valid input → 4:5 brief with safe zones
- Wrong aspect ratio → `BRIEF_VALIDATION_FAILED`
- Invalid safe zones → validation error
- Use Noop adapter → verify mock brief structure

---

### 6. POST /api/image/asset

**File:** `apps/web/src/app/api/image/asset/route.ts`

**Request:**
```typescript
interface ImageAssetRequest {
  run_id: string;
  brief_id: string;
}
```

**Response Data:**
```typescript
interface ImageAssetResponse {
  asset_url: string; // e.g., "https://cdn.supabase.co/.../asset.png"
  safe_zone_overlay_url: string; // Debug overlay showing safe zones
  validation: {
    aspect_ratio_ok: boolean;
    safe_zones_ok: boolean;
  };
}
```

**Error Codes:**
- `BRIEF_NOT_FOUND` - brief_id not found
- `SAFE_ZONE_VIOLATION` - Generated image violates safe zones
- `RENDER_FAILED` - Image generation failed

**Implementation Steps:**
1. Parse request, validate `run_id` and `brief_id`
2. Fetch brief from Supabase
3. Build image config from brief
4. Call `routeImageGeneration()` with brief and config
5. Validate generated image:
   - Check aspect ratio matches brief
   - Verify safe zones if overlay present
6. Upload image to Supabase Storage
7. Generate safe zone overlay (optional debug feature)
8. Store asset metadata in Supabase (`image_assets` table)
9. Log to audit trail
10. Return response with URLs

**Tests:**
- Valid brief → asset URL returned
- Missing brief → `BRIEF_NOT_FOUND` error
- Generation failure → `RENDER_FAILED` error
- Use Noop adapter → verify placeholder URL structure

---

### 7. GET /api/audit/:run_id

**File:** `apps/web/src/app/api/audit/[run_id]/route.ts`

**Response Data:**
```typescript
interface AuditResponse {
  run: {
    status: string; // "in_progress" | "complete" | "failed"
    stages: Array<{
      stage: string; // e.g., "ideas.generate"
      provider: string;
      model: string;
      cost_usd: number;
      duration_ms: number;
      validation_flags: string[];
      artifacts: string[]; // IDs of generated artifacts
    }>;
  };
}
```

**Implementation Steps:**
1. Parse `run_id` from URL params
2. Query Supabase for all audit logs with this `run_id`
3. Aggregate by stage
4. Return full audit trail

**Tests:**
- Valid run_id → full audit trail
- Missing run_id → empty audit trail
- Partial run → show completed stages only

---

## Testing Strategy

### Phase C1: Build Routes with Noop Adapters ✅
- Build each route using Noop adapters
- Test request/response format
- Test validation logic
- Test error handling
- **NO API keys needed**

### Phase C2: Integration Tests ✅
- Test full pipeline: scrape → review → ideas → copy → brief → asset
- Verify data flows correctly between routes
- Verify audit trail is complete
- **Still using Noop adapters**

### Phase C3: Real LLM Testing (Later)
- Switch to Anthropic/OpenAI adapters
- Test with real API keys
- Verify output quality
- Test cost tracking

---

## Files to Create

```
apps/web/src/app/api/
├── scrape/
│   └── route.ts
├── review/
│   └── route.ts
├── ideas/
│   └── route.ts
├── copy/
│   └── route.ts
├── image/
│   ├── brief/
│   │   └── route.ts
│   └── asset/
│       └── route.ts
└── audit/
    └── [run_id]/
        └── route.ts
```

Plus test files:
```
apps/web/src/app/api/
├── __tests__/
│   ├── scrape.test.ts
│   ├── review.test.ts
│   ├── ideas.test.ts
│   ├── copy.test.ts
│   ├── image-brief.test.ts
│   ├── image-asset.test.ts
│   └── audit.test.ts
```

---

## Next Steps (Start with Route 1)

1. **Create /api/scrape route**
   - Implement request validation
   - Integrate crawler and kernel compressor
   - Add error handling
   - Write tests

2. **Test /api/scrape route**
   - Test with real domains
   - Verify kernel generation
   - Check database storage
   - Validate response format

3. **Document /api/scrape**
   - Add JSDoc comments
   - Create usage examples
   - Update API_CONTRACT.md if needed

4. **Move to next route (review, ideas, etc.)**

---

## Success Criteria

✅ All 7 routes implemented  
✅ All routes tested with Noop adapters  
✅ Request/response format matches API_CONTRACT.md  
✅ Error handling is comprehensive  
✅ Validation logic is thorough  
✅ Audit trail is complete  
✅ Database integration works  
✅ Tests pass  

**When complete:** Ready for Phase D (rebuild frontend UI)

