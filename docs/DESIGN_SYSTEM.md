# Brand Pack - Design System

## Intent
The UI communicates trust, evidence, and guardrails. Every screen should make it obvious that assets are grounded in real brand data and respect the caps defined in `/PROJECT_SPEC.md`.

## Layout Principles
- **Progressive Disclosure**: Mirror the pipeline phases (Scrape, Review, Ideas, Copy, Image, Audit). Users should only see the next action once the previous phase validates.
- **Evidence Surfacing**: Each artifact card shows the evidence keys it used, the validation state, and quick links to the brand kernel.
- **Continuity Feedback**: When the copy continuity flag trips, highlight the affected blocks with warning styles and suggest remediation.

## Visual System
- **Typography**: Use a two-scale system (Display 32/24/20 px, Body 16/14 px). Keep line height >= 1.4 for readability.
- **Color Tokens**:
  - `--surface-default`: #ffffff
  - `--surface-muted`: #f5f5f5
  - `--text-primary`: #171717
  - `--text-secondary`: #525252
  - `--accent`: #2563eb
  - `--accent-strong`: #1d4ed8
  - `--warning`: #f59e0b
  - `--danger`: #dc2626
  - `--success`: #16a34a
- **Status Chips**:
  - Success: green background, white text.
  - Warning: amber outline, dark text.
  - Error: red outline, dark text.

## Component Patterns
- **Run Timeline**: Horizontal or vertical stepper showing phases with validation badges. Display caps (pages crawled, bytes, time) inline.
- **Idea Grid**: Masonry or list of 20 cards. Each card includes headline, angle tags, audience tags, evidence chips, and banned-phrase/length indicators.
- **Copy Blocks**: Five stacked cards labeled Hook, Context, Proof, Objection, CTA. Include character counts and continuity indicator between cards.
- **Image Brief**: Split layout with 4:5 canvas preview on the left and structured instructions on the right. Overlay safe zones (top/bottom 15%) with dashed outlines.
- **Audit Drawer**: Collapsible panel listing stage metadata (provider, model, tokens, cost, evidence hashes). Provide export button for compliance.

## Accessibility
- Contrast ratio >= 4.5:1 for text, >= 3:1 for UI elements.
- Keyboard focus rings must be visible on all interactive controls (use `outline: 2px solid var(--accent)`).
- Support reduced motion by disabling entrance animations when `prefers-reduced-motion` is set.

## Content Guidelines
- Explain caps plainly: e.g., "Crawl paused at 6 pages (limit)". Avoid jargon such as "TPM" outside of developer surfaces.
- Present evidence keys using human-readable labels derived from the kernel (e.g., `proof.metrics: 23% faster onboarding`).
- When validation fails, offer actionable fixes (retry crawl, adjust prompt, trim copy) without blaming the user.

## Safe Zones and Imagery
- Image previews must display the 4:5 aspect ratio frame.
- Render top and bottom safe zones as translucent overlays representing 15% of height each.
- Provide copy overlay guidelines (e.g., "Place CTA within safe zone").
- Indicate if generated asset violated safe zones so users can request a rerender.

## Responsiveness
- Mobile: single column stack with tabs to navigate phases.
- Tablet: two-column layout (timeline sidebar + main content).
- Desktop: three-column variant (timeline, content, audit drawer).
- Breakpoints: 0-639 (mobile), 640-1023 (tablet), 1024+ (desktop).

## Motion
- Keep motion subtle (150 ms fade/slide). Do not animate validation errors.
- Use skeleton loaders for ideas/copy lists to reflect capped counts.

## Hand-off Checklist
1. Reference `/PROJECT_SPEC.md` for the latest caps.
2. Confirm banned phrase and validation messaging align with config.
3. Ensure every artifact component shows evidence chips and validation state.
4. Verify safe zone overlays render correctly at all breakpoints.
