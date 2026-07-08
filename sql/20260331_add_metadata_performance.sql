-- StickWithIt Clips - Telemetry table + indexes
-- Apply with:
--   cat projects/stickwithit/sql/20260331_add_metadata_performance.sql \
--     | docker exec -i ${SUPABASE_DB_CONTAINER:-supabase-db} psql -U postgres -d postgres

BEGIN;

-- Clean up any old copies that may still live in the public schema.
DROP TABLE IF EXISTS public.stickwithit_metadata_performance CASCADE;

-- Ensure the stickwithit schema exists for all downstream objects.
CREATE SCHEMA IF NOT EXISTS stickwithit;

-- ---------------------------------------------------------------------------
-- metadata_performance: one row per clip storing the most recent telemetry
-- snapshot coming back from YouTube (view count + retention metrics).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stickwithit.metadata_performance (
    clip_id UUID PRIMARY KEY REFERENCES stickwithit.clips(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    view_count BIGINT DEFAULT 0,
    avg_watch_percentage NUMERIC(5,2),
    avg_view_duration_seconds NUMERIC(8,2),
    sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    extra JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE stickwithit.metadata_performance IS
    'Latest YouTube telemetry snapshot (views + retention) for each StickWithIt clip.';
COMMENT ON COLUMN stickwithit.metadata_performance.youtube_video_id IS
    'Short/video ID that was uploaded to YouTube.';
COMMENT ON COLUMN stickwithit.metadata_performance.view_count IS
    'Latest total view count reported by the YouTube Analytics API.';
COMMENT ON COLUMN stickwithit.metadata_performance.avg_watch_percentage IS
    'Average percentage watched (0-100) returned by YouTube Analytics.';
COMMENT ON COLUMN stickwithit.metadata_performance.avg_view_duration_seconds IS
    'Average view duration (seconds) returned by YouTube Analytics.';
COMMENT ON COLUMN stickwithit.metadata_performance.extra IS
    'Raw JSON payload for auditing/debugging (analytics + video metadata).';

-- Helpful indexes for dashboards + collectors.
CREATE INDEX IF NOT EXISTS idx_metadata_performance_sampled
    ON stickwithit.metadata_performance (sampled_at DESC);
CREATE INDEX IF NOT EXISTS idx_metadata_performance_views
    ON stickwithit.metadata_performance (view_count DESC);

COMMIT;
