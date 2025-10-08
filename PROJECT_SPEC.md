# Brand Pack - Product Specification

## Purpose
- Convert a brand's public website into audit-ready marketing assets without manual rewriting.
- Guarantee deterministic safety rails: no hallucinated facts, on-brand tone, compliant visuals.
- Operate within strict crawl and generation limits so the system can run cheaply on commodity infrastructure.

## Delivery Phases
1. **Scrape & Kernel** - Crawl the public site, compress into a <=2 KB brand kernel with citations.
2. **Review** - Summarize brand voice and proof in a review brief pulled directly from the kernel.
3. **Ideas** - Produce 20 distinct campaign angles backed by kernel evidence references.
4. **Copy** - Generate 5 sequential copy blocks (hook -> proof -> call-to-action) with continuity checks.
5. **Image** - Deliver 4:5 creative briefs and renderings that respect safe zones for copy overlays.
6. **Audit** - Persist artifacts, validation signals, and evidence trails for every output.

## System Caps & Policies
- **Crawl Limits**: Maximum 6 pages, 300 KB total content, 4 concurrent fetches, 5 s per request, 15 s budget overall.
- **Kernel Compression**: Brand kernel must remain <=2 KB (post-compression) and include citation pointers.
- **Evidence Policy**: Every idea, copy block, and image brief must cite the kernel keys it uses; missing evidence invalidates the artifact.
- **Ideas Output**: Exactly 20 ideas, each labeled with an evidence list and variance tags (tone, audience, format).
- **Copy Output**: 5 blocks per campaign (Hook, Context, Proof, Objection, CTA). Enforce min/max character windows and raise a continuity flag if the narrative breaks.
- **Image Output**: Default aspect ratio 4:5 with defined safe zones for top and bottom 15 percent margins plus copy overlay guidance.
- **Validation**: Apply banned phrase filter, length guards, continuity enforcement for copy, and confidence scoring for cited evidence.
- **Audit Trail**: Log provider/model, cost, latency, cache hits, validation flags, and evidence hashes for each call.

## Config Presets
- **fast** - Cheapest providers, aggressive crawl and content caps, low token ceilings; prioritizes speed and cost.
- **balanced** - Default blend of cost and quality; honors global caps while keeping moderate token budgets.
- **full** - Upgrades copy stage models only for premium output; other stages stay balanced to control spend.

## Shared Sources of Truth
- `/docs/ARCHITECTURE.md` - Platform topology and service responsibilities.
- `/docs/API_CONTRACT.md` - External API surface aligned to the caps above.
- `/docs/CONFIG_SCHEMA.md` - Runtime configuration, validation rules, and preset wiring.
- `/docs/DESIGN_SYSTEM.md` - UI standards for presenting evidence-backed assets.
- `/data/config/prompts.json` - Operational prompt and preset definitions that must reflect this spec.
- `/SESSION_SUMMARY.md` - Session delta referencing this document as the authoritative plan.

All derivative documentation, configuration, and implementation must stay synchronized with this specification.
