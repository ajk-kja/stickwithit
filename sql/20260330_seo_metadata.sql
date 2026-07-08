-- StickWithIt Clips - SEO metadata + telemetry schema
-- Run via psql inside the Supabase DB container:
--   cat projects/stickwithit/sql/20260330_seo_metadata.sql | docker exec -i supabase-db psql -U postgres -d postgres

BEGIN;

-- Clean up any public.* tables that may have been created in earlier attempts
DROP TABLE IF EXISTS public.stickwithit_seo_profiles CASCADE;
DROP TABLE IF EXISTS public.stickwithit_trending_keywords CASCADE;
DROP TABLE IF EXISTS public.stickwithit_metadata_candidates CASCADE;
DROP TABLE IF EXISTS public.stickwithit_metadata_performance CASCADE;

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS stickwithit;

-- ---------------------------------------------------------------------------
-- 1) Channel-level SEO profile (single-row for now, but multi-tenant ready)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stickwithit.seo_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_name TEXT NOT NULL,
    tone TEXT,
    keyword_strategy JSONB DEFAULT '{}'::jsonb,
    cta_policy TEXT,
    link_policy TEXT,
    hashtag_policy JSONB DEFAULT '{}'::jsonb,
    power_words TEXT[] DEFAULT '{}',
    banned_phrases TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION stickwithit.touch_seo_profile()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stickwithit_seo_profiles_touch ON stickwithit.seo_profiles;
CREATE TRIGGER stickwithit_seo_profiles_touch
    BEFORE UPDATE ON stickwithit.seo_profiles
    FOR EACH ROW
    EXECUTE FUNCTION stickwithit.touch_seo_profile();

-- ---------------------------------------------------------------------------
-- 2) Trending keyword log (autocomplete, analytics, manual seeds)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stickwithit.trending_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    score NUMERIC(6,3) DEFAULT 0,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT trending_keywords_keyword_source_key UNIQUE (keyword, source)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stickwithit_trending_keywords_unique
    ON stickwithit.trending_keywords (lower(keyword), source);

CREATE INDEX IF NOT EXISTS idx_stickwithit_trending_keywords_captured
    ON stickwithit.trending_keywords (captured_at DESC);

-- ---------------------------------------------------------------------------
-- 3) Metadata candidates (store champion + runner-up per clip/job)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stickwithit.metadata_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES stickwithit.clips(id) ON DELETE CASCADE,
    upload_job_id UUID REFERENCES stickwithit.upload_jobs(id) ON DELETE CASCADE,
    variant_label TEXT NOT NULL CHECK (variant_label IN ('primary','alternate')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    backend_tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5,2),
    validator_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stickwithit_metadata_candidates_clip
    ON stickwithit.metadata_candidates (clip_id);

-- ---------------------------------------------------------------------------
-- 4) Performance telemetry per clip/video
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stickwithit.metadata_performance (
    clip_id UUID PRIMARY KEY REFERENCES stickwithit.clips(id) ON DELETE CASCADE,
    youtube_video_id TEXT,
    view_count BIGINT,
    avg_watch_percentage NUMERIC(5,2),
    avg_view_duration_seconds NUMERIC(8,2),
    sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    extra JSONB DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 5) Extend upload_jobs for scoring + keyword bookkeeping
-- ---------------------------------------------------------------------------
ALTER TABLE stickwithit.upload_jobs
    ADD COLUMN IF NOT EXISTS metadata_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS metadata_version TEXT,
    ADD COLUMN IF NOT EXISTS keyword_hits JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN stickwithit.upload_jobs.metadata_score IS 'Final validator score for the metadata that shipped with this upload job.';
COMMENT ON COLUMN stickwithit.upload_jobs.metadata_version IS 'Identifier for the prompt/template version used when generating metadata.';
COMMENT ON COLUMN stickwithit.upload_jobs.keyword_hits IS 'Array of keywords that were successfully injected into the final metadata payload.';

COMMIT;
