# Brand Pack - System Architecture

## Overview
Brand Pack transforms a public website into validated marketing assets while enforcing strict crawl and content limits. The platform follows `/PROJECT_SPEC.md` as the single source of truth for caps, phases, and validation rules.

Guiding principles:
- **Spec First**: All services implement the contract defined in the project spec.
- **Adapter Friendly**: Providers can be swapped through configuration only.
- **Evidence Driven**: No artifact ships without a citation back to the brand kernel.

## Pipeline Phases
1. **Scrape** - The Next.js API route invokes the scraper worker with guardrails: <=6 pages, <=300 KB combined payload, <=4 concurrent requests, 5 s per HTTP request, 15 s total run budget.
2. **Kernel Compress** - Core pipeline normalizes scraped text, deduplicates sections, and compresses everything into a <=2 KB kernel with citation keys.
3. **Review Brief** - The kernel feeds a structured brand review that downstream stages use for tone and proof alignment.
4. **Ideas** - Task runner produces exactly 20 campaign ideas. Each idea lists variance tags (tone, audience, format) and cites kernel keys.
5. **Copy Blocks** - Generator returns five ordered blocks (Hook, Context, Proof, Objection, CTA) per run. Continuity and length gates fire before artifacts are saved.
6. **Image Brief + Asset** - Image flow delivers 4:5 aspect briefs with top/bottom 15% safe zones plus generated assets that respect those constraints.
7. **Audit** - Validation flags, provider metadata, latency, cost, and evidence hashes land in Supabase audit tables.

## Services and Packages
- **Frontend (`apps/web`)**: Next.js UI provides progressive disclosure, surfaces validation results, and links artifacts to evidence.
- **API Routes**: Stateless handlers that enforce caps, call core orchestration, and return JSON aligned with `/docs/API_CONTRACT.md`.
- **Core (`packages/core`)**: Hosts kernel builder, task orchestrator, validation harness, and adapter router.
- **Adapters (`packages/adapters`)**: Implement neutral specs for LLM and image providers. Provider swaps require config changes only.
- **Supabase (`supabase`)**: Stores kernels, ideas, copy blocks, image briefs, rendered assets, audits, and run metadata.
- **Config (`data/config/prompts.json`)**: Defines prompts, validation settings, presets, banned phrases, and evidence requirements.

## Data Flow Summary
1. User submits a domain from the UI. Run ID is created and stored.
2. Scraper fetches permitted pages, cleans HTML, and writes raw content plus metadata to storage.
3. Kernel compressor reduces content to <=2 KB with citation map and persists the result.
4. Ideas stage invokes adapters to generate 20 ideas with evidence lists; validation checks banned phrases and minimum length.
5. Copy stage produces five sequential blocks; continuity validator compares tone, subject, and cited evidence between blocks.
6. Image brief and asset stages output structured instructions and rendered images using safe zone guidelines.
7. Audit writer logs stage metrics, validation results, and evidence hashes. UI consumes the audit data to display pass/fail states.

## Operational Guardrails
- **Crawl Enforcement**: Queue limits concurrent requests per run and cuts the crawl at 6 pages or 300 KB, whichever hits first.
- **Timeouts**: Global crawl budget (15 s) plus per-request cap (5 s). Downstream tasks have stage-specific timeouts in config.
- **Validation Stack**: Shared modules apply banned phrase filters, length bounds, continuity scoring, and evidence verification.
- **Evidence Policy**: Any artifact missing citations fails validation and is excluded from exports until corrected.
- **Retry Logic**: Adapters implement deterministic retries with exponential backoff capped by stage budgets.

## Observability
- Each API response includes `run_id`, `stage`, `duration_ms`, `provider`, `model`, `cost`, `validation_flags`, and `evidence_hashes`.
- Supabase `audit_log` records state transitions, cache hits, and overrides sourced from presets or ad-hoc changes.
- Metrics exporters push per-stage success, latency, and retry counts for dashboarding.

## Extensibility
- **New Provider**: Implement adapter interface, register in router, configure via presets.
- **New Validation Gate**: Add module in core, wire through prompts config, document in spec.
- **New UI Surface**: Follow `/docs/DESIGN_SYSTEM.md` for tokens and layout; surface audit signals prominently.

Any architectural deviation must be reflected in `/PROJECT_SPEC.md` before implementation.
