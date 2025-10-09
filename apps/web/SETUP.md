# Brand Pack - Setup Guide

## Environment Variables

Create a `.env.local` file in `apps/web/` with:

```bash
# Required: At least one model provider
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-...

# Optional: Supabase (not yet wired)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Stripe (not yet wired)
# STRIPE_SECRET_KEY=sk_test_...
```

## Installation

```bash
# From project root
npm install

# Start dev server
cd apps/web
npm run dev
```

## Testing the Flow

1. Open http://localhost:3000
2. Enter a domain (e.g., `stripe.com`, `vercel.com`)
3. Click "Scrape & Analyze"
4. Wait for kernel generation (~10-15 seconds)
5. Click "Generate Ideas"
6. Wait for 20 ideas (~20-30 seconds)
7. Click any idea to generate copy
8. Wait for 5 copy blocks (~25-30 seconds)
9. Click "Generate Image Brief"
10. View the complete 4:5 image brief with safe zones

## What's Working

✅ **Phase 3**: Core orchestration (runner, task builders, validators)
✅ **Phase 4**: Provider adapters (Anthropic, OpenAI, Noop)
✅ **Phase 5**: Scraper + kernel compression (respects all caps)
✅ **Phase 9**: API routes (`/api/scrape`, `/api/ideas`, `/api/copy`, `/api/image/brief`)
✅ **Phase 7**: Progressive disclosure UI (no sidebar!)

## What's NOT Working Yet

❌ Database persistence (Supabase not wired)
❌ Auth & user accounts
❌ Billing & Stripe
❌ Admin dashboard
❌ Caching (ETag, content_hash)
❌ Audit trail logging to DB
❌ Image asset generation (only brief)
❌ Ranking/dedupe for ideas

## Architecture

- **Core** (`packages/core`): Scraper, kernel, runner, validators
- **Adapters** (`packages/adapters`): Provider routing (Anthropic, OpenAI)
- **Config** (`data/config/prompts.json`): All task definitions
- **API** (`apps/web/src/app/api/*`): Next.js route handlers
- **UI** (`apps/web/src/app/page.tsx`): Progressive single-page flow

## Config Customization

Edit `data/config/prompts.json` to:
- Change model providers
- Adjust temperature/max_tokens
- Modify system/user prompts
- Update validation rules
- Add banned phrases

Changes apply immediately (config loaded per request).

