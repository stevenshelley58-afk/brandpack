# Phase B Progress: Wire Adapters Properly

**Status:** ✅ **PHASE COMPLETE**

## Overview
Fixed all TypeScript compilation errors in the adapters package and verified the Noop adapter works correctly.

---

## Tasks Completed

### B1: Verify Adapters Package Compiles ✅
**Goal:** Get `packages/adapters` to compile cleanly with TypeScript

**Initial Errors (10 total):**
1. `anthropic.test.ts` - Wrong adapter class name imported
2. `anthropic.ts` - Streaming vs non-streaming type mismatch
3. `anthropic.ts` - `response_format` not supported by Anthropic SDK
4. `anthropic.ts` - `string | undefined` assignment issues
5. `anthropic.ts` - Empty object type issues
6. `openai.ts` - Type casting issues
7. `noop.ts` - `ImageResult` type mismatch
8. `router.ts` - `ImageResult` type mismatch
9. `index.ts` - NoopImageAdapter array type mismatch
10. Multiple `.length` property on `{}` errors

**Fixes Applied:**

#### B1a: Fix anthropic.test.ts import name ✅
- Changed `AnthropicAdapter` → `AnthropicLLMAdapter`
- Fixed `model` option → `defaultModel` option

#### B1b: Fix anthropic.ts streaming types ✅
- Cast `messages.create()` response to `Anthropic.Message` type
- Added comment explaining non-streaming behavior

```typescript
// Non-streaming request - cast to Message type
const response = await this.client.messages.create(
  this.buildRequest(spec, model),
  { timeout: this.timeoutMs },
) as Anthropic.Message;
```

#### B1c: Fix anthropic.ts response_format ✅
- Removed `response_format` parameter (not supported by Anthropic SDK)
- Added TODO comment for when Anthropic adds official JSON mode support

```typescript
// Note: Anthropic SDK doesn't support response_format like OpenAI does
// For JSON output, rely on prompting to ask for JSON format
// TODO: Implement JSON mode when Anthropic adds official support
```

#### B1d: Fix type casting issues ✅
- Fixed `resolveModel()` in both `anthropic.ts` and `openai.ts`
- Added explicit type casting and runtime type checking

```typescript
private resolveModel(spec: LLMSpec): string {
  const requested =
    (spec.metadata?.model as string | undefined) ??
    (spec.metadata?.provider_model as string | undefined);
  return requested && typeof requested === 'string' && requested.length > 0
    ? requested
    : this.defaultModel;
}
```

- Fixed OpenAI `response_format` casting using `as any`

```typescript
if (spec.response_format === 'json') {
  (params as any).response_format = {
    type: 'json_object',
  };
}
```

#### B1e: Fix ImageResult type mismatches ✅
**Problem:** Two different `ImageResult` types in the codebase:
- `packages/core/src/types/adapter.ts` - Single image result from adapter (url, provider, model, cost, metadata)
- `packages/core/src/types/outputs.ts` - Batch result (images[], total_cost, failed[])

**Solution:** Import the adapter version explicitly using the alias

```typescript
// noop.ts and router.ts
import type {
  AdapterImageResult as ImageResult,
  // ... other imports
} from '@brandpack/core';
```

**Result:** Exit code 0 ✅

---

### B2: Check Adapter Exports Are Correct ✅
**Goal:** Verify the adapters package exports what the API routes need

**Verified exports from `packages/adapters/src/index.ts`:**
```typescript
export {
  llmRegistry,
  imageRegistry,
  registerAdapters,
  routeSpec,
  routeImageGeneration,
  NoopLLMAdapter,
  NoopImageAdapter,
  AnthropicLLMAdapter,
  OpenAILLMAdapter,
};
```

**Auto-registration logic verified:**
- Checks for `ANTHROPIC_API_KEY` environment variable
- Checks for `OPENAI_API_KEY` environment variable
- Automatically registers available adapters on import
- Falls back to Noop adapter if no API keys present
- Handles initialization errors gracefully with console.warn

---

### B3: Test Noop Adapter ✅
**Goal:** Verify Noop adapters work without API keys

**Module Resolution Journey:**
1. **Initial Issue:** Packages exported `src/` instead of `dist/` → Runtime error
   - **Fix:** Updated `package.json` exports to point to `dist/`

2. **ESM Import Issue:** Directory imports like `'./types'` failed in Node.js ESM
   - **Attempted Fix:** Changed to `module: "Node16"` and `type: "module"`
   - **New Problem:** Node16 requires explicit `.js` extensions on ALL imports (100+ files)

3. **Final Solution:** Use CommonJS instead
   - Reverted to `module: "CommonJS"` and `moduleResolution: "node"`
   - CommonJS handles directory imports automatically
   - Tests pass perfectly ✅

**Test Results:**
```
Testing NoopLLMAdapter...
  Provider: noop-llm
  Available models: [ 'noop-llm-v1' ]
  Validation: { valid: true, errors: [] }
  Execution result:
    - Outputs: [ '[noop::test.task] TEXT response placeholder' ]
    - Provider: noop-llm
    - Model: noop-llm-v1
    - Cost: 0
    - Duration: 0 ms
    - Usage: { prompt_tokens: 6, completion_tokens: 32, total_tokens: 38 }
✅ NoopLLMAdapter test passed!

Testing NoopImageAdapter...
  Provider: noop-image
  Available models: [ 'noop-image-v1' ]
  Generation result:
    - URL: https://example.com/noop/test-brief-1.png
    - Provider: noop-image
    - Model: noop-image-v1
    - Cost: 0
    - Duration: 0 ms
    - Metadata: {
      resolution: '1024x1280',
      aspect_ratio: '4:5',
      file_size_kb: 42,
      format: 'png'
    }
✅ NoopImageAdapter test passed!

🎉 All Noop adapter tests passed!
```

---

## Files Modified

### Configuration Files
- `packages/core/package.json` - Updated exports to point to `dist/`
- `packages/adapters/package.json` - Updated exports to point to `dist/`
- `packages/core/tsconfig.json` - Kept CommonJS module system

### Source Files
- `packages/adapters/src/anthropic.test.ts` - Fixed import names
- `packages/adapters/src/anthropic.ts` - Fixed streaming types, response_format, type casting
- `packages/adapters/src/openai.ts` - Fixed type casting, resolveModel
- `packages/adapters/src/noop.ts` - Fixed ImageResult import
- `packages/adapters/src/router.ts` - Fixed ImageResult import

---

## Key Learnings

### 1. Type Name Collisions
When you have two types with the same name in different modules, use explicit aliases:
```typescript
import { ImageResult as AdapterImageResult } from './adapter';
import { ImageResult as BatchImageResult } from './outputs';
```

### 2. TypeScript SDK Type Issues
- Anthropic SDK: No `response_format` support (yet)
- Anthropic SDK: `messages.create()` returns `Message | Stream` union type
- Solution: Cast to `Message` when not streaming, rely on prompts for JSON output

### 3. Module Resolution Strategies
- **Node16/ESM:** Requires explicit `.js` extensions everywhere - tedious for large codebases
- **CommonJS:** Just works with directory imports - simpler for development
- **Bundler mode:** Great for dev with TypeScript, but breaks at Node.js runtime

**Decision:** Stick with CommonJS for now, revisit ESM later when we have time to add `.js` extensions properly.

---

## What's Next?

### Phase C: Build API Routes (Next)
Now that adapters compile and work, we can build the API routes:
1. `/api/scrape` - Scrape domain → brand kernel
2. `/api/ideas` - Generate campaign ideas
3. `/api/copy` - Generate copy blocks
4. `/api/image/brief` - Generate image brief

### Remaining Phase B Tasks (Optional/Later)
These require API keys and can be tested later:
- **B4:** Test Anthropic adapter with real API key
- **B5:** Test OpenAI adapter with real API key
- **B6:** Unit test each adapter separately
- **B7:** Document adapter interface

---

## Summary

✅ **All adapters compile cleanly**  
✅ **Noop adapters tested and working**  
✅ **Module exports configured correctly**  
✅ **Auto-registration working**  

**Phase B Status:** Ready to move to Phase C (API Routes)

The adapters layer is solid. The Noop adapter proves the interface works. Real adapters (Anthropic, OpenAI) will be tested when we have API keys and start building the frontend.
