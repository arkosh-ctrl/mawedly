-- ============================================================================
-- Mawedly migration 0010: optional reviewer contact fields on reviews.
-- Two nullable columns added to the existing reviews table (migration 0009).
-- Optionality is guaranteed by the absence of NOT NULL; no other constraints,
-- no RLS change, no trigger change — these columns carry no security logic.
-- Re-runnable via IF NOT EXISTS.
-- ============================================================================

alter table reviews add column if not exists reviewer_name text;
alter table reviews add column if not exists reviewer_phone text;
