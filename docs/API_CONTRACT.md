# Brand Pack - API Contract

All responses follow a shared envelope:

```json
{
  "data": {},
  "meta": {
    "run_id": "uuid",
    "stage": "ideas.generate",
    "duration_ms": 1234,
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "cost_usd": 0.12,
    "validation_flags": ["length_ok", "evidence_present"],
    "evidence_hashes": ["sha256:..."],
    "cached": false
  }
}
```

Errors use:

```json
{
  "error": { "code": "string", "message": "human readable", "details": {} }
}
```

## POST /api/scrape
- Collects raw HTML/text with caps: 6 pages, 300 KB total, 4 concurrent requests, 5 s request timeout, 15 s overall budget.
- Generates kernel seed and citation handles.

Request:
```json
{ "domain": "https://example.com", "force_refresh": false }
```

Response highlights:
```json
{
  "data": {
    "kernel_id": "uuid",
    "pages_crawled": 5,
    "bytes_collected": 241500,
    "citations": { "home": "/", "pricing": "/pricing" }
  }
}
```

Error codes: `INVALID_DOMAIN`, `CRAWL_LIMIT_REACHED`, `SCRAPE_TIMEOUT`, `SCRAPE_FAILED`.

## POST /api/review
- Creates review brief directly from the <=2 KB kernel.

Request: `{ "run_id": "uuid" }`

Response:
```json
{
  "data": {
    "summary": {
      "tone": ["confident", "technical"],
      "voice": ["concise", "evidence-led"],
      "proof_points": ["99.9% uptime", "SOC 2"],
      "pricing_cues": ["Starts at $99"],
      "target_audience": "Mid-market IT buyers",
      "citations": ["home", "pricing"]
    }
  }
}
```

Errors: `MISSING_KERNEL`, `REVIEW_GENERATION_FAILED`.

## POST /api/ideas
- Generates exactly 20 campaign ideas with evidence references.

Request: `{ "run_id": "uuid" }`

Response sample:
```json
{
  "data": {
    "ideas": [
      {
        "id": "idea-01",
        "headline": "Reclaim your nights with automated patching",
        "angle": "Operational relief",
        "audience": "IT managers",
        "format": "LinkedIn carousel",
        "evidence_keys": ["features.automation", "proof.nps"],
        "validation": {
          "banned_phrases": false,
          "length_ok": true,
          "evidence_present": true
        }
      }
    ]
  }
}
```

Errors: `IDEA_COUNT_MISMATCH`, `BANNED_PHRASE_DETECTED`, `EVIDENCE_MISSING`.

## POST /api/copy
- Produces five sequential copy blocks (Hook, Context, Proof, Objection, CTA) and continuity diagnostics.

Request: `{ "run_id": "uuid", "idea_id": "idea-01" }`

Response:
```json
{
  "data": {
    "blocks": [
      { "slot": "hook", "content": "Tired of midnight tickets?", "char_count": 64, "evidence_keys": ["proof.nps"] },
      { "slot": "context", "content": "Our automated pipeline ...", "char_count": 210, "evidence_keys": ["features.automation"] }
    ],
    "continuity_flag": false
  }
}
```

Errors: `CONTINUITY_BROKEN`, `LENGTH_OUT_OF_RANGE`, `BANNED_PHRASE_DETECTED`.

## POST /api/image/brief
- Crafts a 4:5 brief with safe zones and overlay guidance.

Request: `{ "run_id": "uuid", "idea_id": "idea-01" }`

Response:
```json
{
  "data": {
    "brief": {
      "aspect_ratio": "4:5",
      "safe_zone_top": 0.15,
      "safe_zone_bottom": 0.15,
      "visual_direction": "Night office, calm lighting",
      "copy_overlay": "Place CTA in lower third",
      "evidence_keys": ["features.automation"]
    }
  }
}
```

Errors: `MISSING_IDEA`, `BRIEF_VALIDATION_FAILED`.

## POST /api/image/asset
- Renders final image following the approved brief.

Request: `{ "run_id": "uuid", "brief_id": "brief-01" }`

Response:
```json
{
  "data": {
    "asset_url": "https://cdn.supabase.co/.../asset.png",
    "safe_zone_overlay_url": "https://cdn.supabase.co/.../overlay.png",
    "validation": { "aspect_ratio_ok": true, "safe_zones_ok": true }
  }
}
```

Errors: `BRIEF_NOT_FOUND`, `SAFE_ZONE_VIOLATION`, `RENDER_FAILED`.

## GET /api/audit/{run_id}
- Returns artifacts, validation states, and telemetry history.

Response snippet:
```json
{
  "data": {
    "run": {
      "status": "complete",
      "stages": [
        {
          "stage": "ideas.generate",
          "provider": "anthropic",
          "model": "claude-3-5-sonnet-20241022",
          "cost_usd": 0.18,
          "duration_ms": 4123,
          "validation_flags": ["length_ok", "banned_phrases_passed"],
          "artifacts": ["idea-01", "idea-02"]
        }
      ]
    }
  }
}
```

## Headers and Versioning
- `X-Run-Id` is returned on every response for correlation.
- Clients send `Accept: application/json; version=1`.
- Breaking changes require updating `/PROJECT_SPEC.md` and the version header.
