# OpenAI Integration Status

**Current State:** OpenAI is successfully called but output format doesn't match expectations

---

## ✅ What's Working

1. **OpenAI API calls are succeeding:**
   - Provider: openai ✅
   - Model: gpt-4o-mini ✅
   - Cost tracking: ~$0.003 per call ✅
   - Duration: 18-24 seconds ✅
   - Tokens: ~18K total ✅

2. **Configuration is fully modular:**
   - Provider set in `data/config/prompts.json` ✅
   - Prompts are editable ✅
   - No hardcoded logic ✅

---

## ❌ Current Issue

**Validation Error:**
```
Expected exactly 20 ideas, got 1
Idea 1 missing required field: headline
Idea 1 missing required field: angle
...
```

**What this means:**
- OpenAI is returning a response
- The response gets parsed as JSON
- After parsing, we have 1 item instead of 20
- That 1 item is missing the expected fields

**Possible causes:**
1. OpenAI wraps the array in an object: `{"ideas": [{...}, {...}]}`
2. OpenAI includes markdown: ` ```json\n[...]\n``` `
3. The unwrapping logic needs adjustment for OpenAI's format
4. OpenAI interprets the prompt differently than Noop adapter

---

## 🔧 What's Been Tried (All Via Config)

### Attempt 1: Add "JSON" to prompts
**Rationale:** OpenAI requires the word "json" in prompts when using `response_format: json_object`

**Changes made:**
```json
"system": "...in JSON format..."
"user_template": "...as a JSON array..."
```

**Result:** OpenAI API call succeeds now (was failing with 400 before) ✅

### Attempt 2: Be more explicit about structure
**Changes made:**
```json
"system": "Output ONLY valid JSON. No markdown, no explanations, just the JSON array."
"user_template": "Return a JSON array of EXACTLY 20 campaign ideas. Format:\n[...]"
```

**Result:** Still getting 1 item instead of 20 ❌

### Attempt 3: Show exact example
**Changes made:** Added literal example structure in prompt showing the array format

**Result:** Same issue ❌

---

## 🤔 Investigation Needed

To properly fix this via configuration (no hardcoding), we need to see:

**What OpenAI actually returns:**
```javascript
// We need to see the raw LLM output before any parsing
// Is it:
"[{...}, {...}, ...]"  // ← What we expect
// Or:
"```json\n[{...}, {...}, ...]\n```"  // ← Markdown wrapped
// Or:
"{\"ideas\": [{...}, {...}, ...]}"  // ← Object wrapped
```

**Once we know the format, we can:**
1. Adjust the prompt template to get the right format
2. OR add a configurable "output_format" field to handle different LLM behaviors
3. OR document that different providers need different prompt styles

---

## 💡 Modular Solutions (No Hardcoding)

### Option A: Enhance Prompt Engineering (Config Only)
Add more explicit instructions in `prompts.json`:
- "Do not use markdown code blocks"
- "Return raw JSON only"
- "Start your response with [ and end with ]"

### Option B: Add Output Format Config
In `prompts.json`, add:
```json
{
  "calls": {
    "ideas.generate": {
      "output": {
        "format": "json_array",  // vs "json_object"
        "strip_markdown": true,   // Remove ```json``` blocks
        "unwrap_key": null        // Or "ideas" if wrapped
      }
    }
  }
}
```

Then the orchestrator reads these settings and handles accordingly.

### Option C: Provider-Specific Prompt Templates
Since different LLMs behave differently, allow:
```json
{
  "calls": {
    "ideas.generate": {
      "prompts": {
        "openai": {
          "system": "OpenAI-optimized prompt...",
          "user_template": "..."
        },
        "anthropic": {
          "system": "Claude-optimized prompt...",
          "user_template": "..."
        }
      }
    }
  }
}
```

---

## 📊 Test Data

**Scrape (Working):**
- Domain: stripe.com
- Pages: 1
- Kernel size: ~82KB
- Time: 2-5 seconds

**Ideas (Failing validation):**
- LLM call: ✅ Success
- Cost: $0.0033
- Tokens: 18K
- Duration: 18-24s
- Parse JSON: ✅ Success  
- Unwrap array: ❌ Getting 1 item instead of 20
- Validation: ❌ Missing fields

---

## 🎯 Next Steps

1. **Debug the actual OpenAI response** - Need to see raw output
2. **Adjust prompt template** based on what we learn
3. **OR add configurable output handling** if prompts alone can't fix it
4. **Document provider-specific quirks** in the config schema

**Everything should remain configurable - no hardcoded OpenAI-specific logic in the core.**

---

## 📁 Files That Control This (All Configurable)

- `data/config/prompts.json` - All prompts, providers, models
- `packages/core/src/runner/orchestrator.ts` - Reads config, no hardcoded providers
- `packages/core/src/runner/task-builder.ts` - Builds specs from config
- `packages/adapters/src/openai.ts` - OpenAI adapter (generic, no task-specific logic)

**Philosophy:** The core is provider-agnostic. All behavior controlled via config. ✅

