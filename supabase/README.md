# Supabase Setup for Brand Pack

## Overview

Brand Pack uses Supabase for:
- **Postgres Database**: All application data
- **Storage**: Scraped content, generated images, export packs
- **Auth**: User authentication and session management
- **Row-Level Security (RLS)**: User data isolation

## Initial Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Save these credentials:
   - **Project URL**: `https://xxx.supabase.co`
   - **Anon Key**: `eyJ...` (public, safe for client)
   - **Service Role Key**: `eyJ...` (secret, server-only)

### 2. Run Database Migration

**Option A: Via Supabase CLI** (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

**Option B: Via SQL Editor**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250110000000_initial_schema.sql`
3. Paste and run

### 3. Create Storage Buckets

Go to **Storage** in Supabase Dashboard and create these buckets:

#### Bucket 1: `scraped-content`

- **Name**: `scraped-content`
- **Public**: No
- **File size limit**: 10 MB
- **Allowed MIME types**: `text/html`, `text/xml`, `application/json`

**RLS Policy**:
```sql
-- Users can read/write their own scraped content
CREATE POLICY "Users manage own scraped content"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'scraped-content'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### Bucket 2: `generated-images`

- **Name**: `generated-images`
- **Public**: Yes (for CDN delivery)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/png`, `image/jpeg`, `image/webp`

**RLS Policy**:
```sql
-- Public read, authenticated users can write
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-images'
    AND auth.role() = 'authenticated'
  );
```

#### Bucket 3: `export-packs`

- **Name**: `export-packs`
- **Public**: No (use pre-signed URLs)
- **File size limit**: 20 MB
- **Allowed MIME types**: `application/zip`

**RLS Policy**:
```sql
-- Users can only access their own export packs
CREATE POLICY "Users manage own exports"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'export-packs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 4. Set Environment Variables

Add to `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (NEVER expose to client)
SUPABASE_SERVICE_KEY=eyJ...
```

Add to Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (secret, encrypt)

## Database Schema

### Tables

- **users**: User profiles (extends auth.users)
- **brand_kernels**: Compressed website data
- **scrape_cache**: Avoids redundant scraping
- **runs**: Pipeline executions
- **artifacts**: Generated content (ideas, copy, images)
- **audit_log**: Every API call for cost tracking
- **config_overrides**: User presets and settings

### Key Relationships

```
auth.users (Supabase)
    ↓
users (our table)
    ↓
runs
    ↓
artifacts, audit_log
```

### RLS Policies

- **User isolation**: Users can only see their own runs/artifacts
- **Shared resources**: Brand kernels and scrape cache accessible to all
- **Admin access**: Admins can see all data (for debugging/monitoring)

## Testing Database

### 1. Test Connection

Create `test-db.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testConnection() {
  const { data, error } = await supabase
    .from('users')
    .select('count');
  
  if (error) {
    console.error('Connection failed:', error);
  } else {
    console.log('✓ Connected to Supabase');
    console.log('Users count:', data);
  }
}

testConnection();
```

Run: `npx tsx test-db.ts`

### 2. Create Test User

```sql
-- In Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

Or use Supabase Dashboard → Authentication → Add User

### 3. Test CRUD Operations

```typescript
// Create a run
const { data: run, error } = await supabase
  .from('runs')
  .insert({
    user_id: userId,
    domain: 'example.com',
    stage: 'scrape',
    status: 'in_progress',
    config_snapshot: {}
  })
  .select()
  .single();

// Create an artifact
await supabase
  .from('artifacts')
  .insert({
    run_id: run.id,
    type: 'idea',
    content: {
      angle: 'Test angle',
      hook: 'Test hook'
    },
    ranking_score: 85.5
  });

// Query with RLS (should only see own data)
const { data: runs } = await supabase
  .from('runs')
  .select(`
    *,
    artifacts(count)
  `)
  .order('created_at', { ascending: false });
```

## Common Operations

### Clear Cache

```sql
-- Clear expired scrape cache
DELETE FROM scrape_cache
WHERE expires_at < NOW();

-- Clear all cache for a domain
DELETE FROM scrape_cache
WHERE domain = 'example.com';
```

### View Run Costs

```sql
-- Total cost by user
SELECT
  u.email,
  COUNT(r.id) as total_runs,
  SUM(r.total_cost_usd) as total_spent,
  AVG(r.total_cost_usd) as avg_per_run
FROM users u
LEFT JOIN runs r ON r.user_id = u.id
GROUP BY u.id, u.email
ORDER BY total_spent DESC;

-- Cost breakdown by provider
SELECT
  provider,
  model,
  COUNT(*) as calls,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost,
  SUM(total_tokens) as total_tokens
FROM audit_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY provider, model
ORDER BY total_cost DESC;
```

### Find High-Scoring Artifacts

```sql
-- Top ideas by score
SELECT
  r.domain,
  a.content->>'hook' as hook,
  a.ranking_score,
  a.created_at
FROM artifacts a
JOIN runs r ON r.id = a.run_id
WHERE a.type = 'idea'
  AND a.ranking_score IS NOT NULL
ORDER BY a.ranking_score DESC
LIMIT 20;
```

## Maintenance

### Vacuum and Analyze

Run periodically for performance:

```sql
VACUUM ANALYZE;
```

### Archive Old Runs

```sql
-- Archive runs older than 90 days
CREATE TABLE IF NOT EXISTS archived_runs (LIKE runs INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archived_artifacts (LIKE artifacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS archived_audit_log (LIKE audit_log INCLUDING ALL);

-- Move to archive
INSERT INTO archived_runs
SELECT * FROM runs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete from main tables
DELETE FROM runs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Monitor Database Size

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key never exposed to client
- [ ] Storage bucket policies restrict access
- [ ] API keys stored in environment variables
- [ ] HTTPS enforced everywhere
- [ ] Rate limiting configured
- [ ] Admin role restricted to trusted users

## Troubleshooting

### Connection Issues

```bash
# Test connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/users \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### RLS Blocking Queries

If queries return empty unexpectedly:

1. Check if RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'runs';`
2. Check policies: `SELECT * FROM pg_policies WHERE tablename = 'runs';`
3. Test with service role key (bypasses RLS)
4. Check auth context: `SELECT auth.uid(), auth.role();`

### Migration Conflicts

```bash
# Reset migrations (DANGER: destroys data)
supabase db reset

# Or manually drop tables
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS artifacts CASCADE;
DROP TABLE IF EXISTS config_overrides CASCADE;
DROP TABLE IF EXISTS runs CASCADE;
DROP TABLE IF EXISTS scrape_cache CASCADE;
DROP TABLE IF EXISTS brand_kernels CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [CLI Reference](https://supabase.com/docs/reference/cli)

