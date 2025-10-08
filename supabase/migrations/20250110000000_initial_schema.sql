-- Brand Pack - Initial Database Schema
-- Migration: 20250110000000_initial_schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'power_user', 'admin')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand kernels (compressed website data)
CREATE TABLE IF NOT EXISTS public.brand_kernels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  kernel_json JSONB NOT NULL,
  compressed_kb DECIMAL(5,2) NOT NULL,
  citations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_kernel_hash UNIQUE (domain, content_hash)
);

-- Scrape cache (avoid redundant scraping)
CREATE TABLE IF NOT EXISTS public.scrape_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  etag TEXT,
  last_modified TEXT,
  raw_html_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Runs (each pipeline execution)
CREATE TABLE IF NOT EXISTS public.runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN (
    'scrape',
    'review',
    'audience',
    'ideas',
    'copy',
    'image_brief',
    'image_render',
    'export',
    'completed',
    'failed'
  )),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  )),
  config_snapshot JSONB NOT NULL,
  error_message TEXT,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Artifacts (generated content: snapshots, ideas, copy, images)
CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'kernel',
    'snapshot',
    'audience',
    'idea',
    'copy',
    'image_brief',
    'image',
    'export'
  )),
  content JSONB NOT NULL,
  ranking_score DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log (every LLM/image API call)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd DECIMAL(10,6) NOT NULL,
  duration_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  request_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Config overrides (user presets and this-run overrides)
CREATE TABLE IF NOT EXISTS public.config_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'call', 'preset', 'this_run')),
  name TEXT,
  description TEXT,
  key_path TEXT,
  value JSONB NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Brand kernels
CREATE INDEX IF NOT EXISTS idx_kernels_domain ON public.brand_kernels(domain);
CREATE INDEX IF NOT EXISTS idx_kernels_hash ON public.brand_kernels(content_hash);
CREATE INDEX IF NOT EXISTS idx_kernels_created ON public.brand_kernels(created_at DESC);

-- Scrape cache
CREATE INDEX IF NOT EXISTS idx_cache_domain ON public.scrape_cache(domain);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.scrape_cache(expires_at);

-- Runs
CREATE INDEX IF NOT EXISTS idx_runs_user ON public.runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON public.runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_stage ON public.runs(stage);
CREATE INDEX IF NOT EXISTS idx_runs_created ON public.runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_user_created ON public.runs(user_id, created_at DESC);

-- Artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_run ON public.artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON public.artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_score ON public.artifacts(ranking_score DESC);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_run ON public.audit_log(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_provider ON public.audit_log(provider);
CREATE INDEX IF NOT EXISTS idx_audit_cost ON public.audit_log(cost_usd DESC);
CREATE INDEX IF NOT EXISTS idx_audit_hash ON public.audit_log(request_hash);

-- Config overrides
CREATE INDEX IF NOT EXISTS idx_config_user ON public.config_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_config_scope ON public.config_overrides(scope);
CREATE INDEX IF NOT EXISTS idx_config_preset ON public.config_overrides(name) WHERE scope = 'preset';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kernels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_overrides ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Brand kernels policies (shared resource, readable by all)
CREATE POLICY "Brand kernels are readable by all authenticated users"
  ON public.brand_kernels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Brand kernels can be created by authenticated users"
  ON public.brand_kernels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Scrape cache policies (shared resource)
CREATE POLICY "Scrape cache is readable by all authenticated users"
  ON public.scrape_cache FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Scrape cache can be written by authenticated users"
  ON public.scrape_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Scrape cache can be updated by authenticated users"
  ON public.scrape_cache FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Runs policies (user isolation)
CREATE POLICY "Users can view own runs"
  ON public.runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own runs"
  ON public.runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs"
  ON public.runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all runs"
  ON public.runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Artifacts policies (inherit from runs)
CREATE POLICY "Users can view artifacts from own runs"
  ON public.artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.runs
      WHERE runs.id = artifacts.run_id
        AND runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create artifacts for own runs"
  ON public.artifacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.runs
      WHERE runs.id = run_id
        AND runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all artifacts"
  ON public.artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Audit log policies (inherit from runs)
CREATE POLICY "Users can view audit logs from own runs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.runs
      WHERE runs.id = audit_log.run_id
        AND runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Audit logs can be created for any run"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Config overrides policies
CREATE POLICY "Users can view own config overrides"
  ON public.config_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own config overrides"
  ON public.config_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config overrides"
  ON public.config_overrides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config overrides"
  ON public.config_overrides FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kernels_updated_at
  BEFORE UPDATE ON public.brand_kernels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cache_updated_at
  BEFORE UPDATE ON public.scrape_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runs_updated_at
  BEFORE UPDATE ON public.runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate run total cost (aggregate from audit log)
CREATE OR REPLACE FUNCTION public.update_run_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.runs
  SET total_cost_usd = (
    SELECT COALESCE(SUM(cost_usd), 0)
    FROM public.audit_log
    WHERE run_id = NEW.run_id
  )
  WHERE id = NEW.run_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update run cost when audit entry added
CREATE TRIGGER update_run_cost_on_audit
  AFTER INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_run_cost();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Note: These are created via Supabase dashboard or API, not SQL
-- Documenting for reference:

-- 1. scraped-content
--    - Purpose: Store raw HTML, sitemaps
--    - Public: No
--    - File size limit: 10MB
--    - Allowed MIME types: text/html, text/xml, application/json

-- 2. generated-images
--    - Purpose: Store AI-generated ad images
--    - Public: Yes (for CDN delivery)
--    - File size limit: 5MB
--    - Allowed MIME types: image/png, image/jpeg, image/webp

-- 3. export-packs
--    - Purpose: Store downloadable ZIP files
--    - Public: No (pre-signed URLs)
--    - File size limit: 20MB
--    - Allowed MIME types: application/zip

-- Storage bucket policies will be created separately via Supabase dashboard

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Example seed data for development/testing
-- Comment out for production

-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'admin@brandpack.local',
--   'Admin User',
--   'admin'
-- ) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.brand_kernels IS 'Compressed brand data extracted from websites';
COMMENT ON TABLE public.scrape_cache IS 'Cache to avoid redundant website scraping';
COMMENT ON TABLE public.runs IS 'Pipeline executions, one per user session';
COMMENT ON TABLE public.artifacts IS 'Generated content: ideas, copy, images, etc.';
COMMENT ON TABLE public.audit_log IS 'Every LLM and image API call for cost tracking';
COMMENT ON TABLE public.config_overrides IS 'User-specific configuration overrides and presets';

COMMENT ON COLUMN public.brand_kernels.compressed_kb IS 'Actual size of kernel in KB (should be ≤2)';
COMMENT ON COLUMN public.runs.config_snapshot IS 'Effective config used for this run (for reproducibility)';
COMMENT ON COLUMN public.artifacts.ranking_score IS 'Quality score 0-100, higher is better';
COMMENT ON COLUMN public.audit_log.request_hash IS 'Hash of (task_id + inputs + config) for caching';

