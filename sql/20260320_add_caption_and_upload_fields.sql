-- StickWithIt Automations - speech/caption gating + upload tracking
-- Run inside the Supabase SQL editor or psql session pointed at the StickWithIt database.

BEGIN;

-- 1) Enrich the core clip metadata so downstream workers know whether to burn in captions
--    and what musical characteristics were detected.
ALTER TABLE public.stickwithit_clips
    ADD COLUMN IF NOT EXISTS speech_ratio NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS needs_captions BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS detected_instruments TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS transcription JSONB;

COMMENT ON COLUMN public.stickwithit_clips.speech_ratio IS '0-1 ratio of frames containing speech per WhisperX diarization pass';
COMMENT ON COLUMN public.stickwithit_clips.needs_captions IS 'Flag set by intake worker; renderer skips subtitles when FALSE';
COMMENT ON COLUMN public.stickwithit_clips.detected_instruments IS 'Top-N instruments detected by ML classifier (used for descriptions)';
COMMENT ON COLUMN public.stickwithit_clips.transcription IS 'Cached WhisperX JSON so downstream editors avoid re-processing audio.';

-- 2) Track a couple of project-level ingestion facts so audits/dashboards have context.
ALTER TABLE public.stickwithit_projects
    ADD COLUMN IF NOT EXISTS source_duration_seconds INT,
    ADD COLUMN IF NOT EXISTS lufs_normalized BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ingest_notes TEXT;

COMMENT ON COLUMN public.stickwithit_projects.source_duration_seconds IS 'Length of the original file dropped into Incoming/ (seconds).';
COMMENT ON COLUMN public.stickwithit_projects.lufs_normalized IS 'TRUE once intake worker normalizes to -14 LUFS.';
COMMENT ON COLUMN public.stickwithit_projects.ingest_notes IS 'Free-form notes for odd files (corrupt audio, re-run needed, etc).';

-- 3) Dedicated table for upload + metadata automation, keeps the Draft/Approved folders simple.
CREATE TABLE IF NOT EXISTS public.stickwithit_upload_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES public.stickwithit_clips(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','metadata_ready','uploading','scheduled','published','failed')),
    needs_captions BOOLEAN NOT NULL DEFAULT TRUE,
    youtube_video_id TEXT,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stickwithit_upload_jobs_status ON public.stickwithit_upload_jobs(status);
CREATE INDEX IF NOT EXISTS idx_stickwithit_upload_jobs_clip_id ON public.stickwithit_upload_jobs(clip_id);

CREATE OR REPLACE FUNCTION public.stickwithit_touch_upload_job()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stickwithit_upload_jobs_touch
    BEFORE UPDATE ON public.stickwithit_upload_jobs
    FOR EACH ROW EXECUTE FUNCTION public.stickwithit_touch_upload_job();

-- 4) Helper function the metadata/uploader pipeline can call so both the API and n8n share logic.
CREATE OR REPLACE FUNCTION public.build_stickwithit_metadata(p_clip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    clip_record RECORD;
    project_record RECORD;
    payload JSONB;
BEGIN
    SELECT c.*, p.title AS project_title, p.source_duration_seconds
      INTO clip_record
      FROM public.stickwithit_clips c
      JOIN public.stickwithit_projects p ON p.id = c.project_id
     WHERE c.id = p_clip_id;

    IF clip_record IS NULL THEN
        RAISE EXCEPTION 'Clip % not found', p_clip_id;
    END IF;

    payload := jsonb_build_object(
        'clip_id', clip_record.id,
        'project_title', clip_record.project_title,
        'filename', clip_record.metadata ->> 'filename',
        'speech_ratio', clip_record.speech_ratio,
        'needs_captions', clip_record.needs_captions,
        'detected_instruments', clip_record.detected_instruments,
        'duration', clip_record.metadata ->> 'duration_secs'
    );

    RETURN payload;
END;
$$;

COMMIT;
