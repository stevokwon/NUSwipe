-- Migration 004: add visa_warning flag to applications
-- Records that an application was submitted despite no visa sponsorship offered.
-- This lets the tracker surface a heads-up to the candidate without blocking the apply flow.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS visa_warning BOOLEAN NOT NULL DEFAULT FALSE;
