-- Migration 008: Add spots tracking to jobs
-- Adds 'total_spots' and 'filled_spots' to track hiring targets.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS total_spots INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS filled_spots INTEGER DEFAULT 0;
