-- Retail Deal Pipeline & Screener — deals table
-- Schema version: Repo B Milestone 1 (Supabase persistence)
-- Last updated: 2026-04-16
--
-- IMPORTANT: This schema is derived from Repo B's PIPELINE_COLUMNS (18 fields).
-- It must be reconciled with Repo A's schema v2.0 before Phase 3.
--
-- Column naming: camelCase (quoted identifiers) to match App.jsx field names exactly.
-- No mapping layer required between JS and Postgres for this schema.
--
-- Known reconciliation items for Phase 3:
--   - Repo A uses JSONB + scalar index design; this schema uses all-scalar TEXT columns.
--   - Repo A's live DB may have a 'screen' column whose purpose is undocumented in Repo B.
--     Do NOT add 'screen' until its semantics are confirmed.
--   - Repo A may use snake_case column names. If so, a name mapping layer will be needed.
--
-- Run this in the Supabase SQL editor for your project.

CREATE TABLE IF NOT EXISTS deals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Property identification
  "propertyName"        TEXT,
  "propertyAddress"     TEXT,
  market                TEXT,
  "assetType"           TEXT,

  -- Physical attributes
  sf                    TEXT,
  acreage               TEXT,
  "yearBuiltRenovated"  TEXT,
  "parkingCount"        TEXT,

  -- Financial metrics
  occupancy             TEXT,
  walt                  TEXT,
  "askingPrice"         TEXT,
  noi                   TEXT,
  "capRate"             TEXT,

  -- Deal metadata
  broker                TEXT,
  "keyAnchors"          TEXT,
  "bidDate"             TEXT,
  stage                 TEXT NOT NULL DEFAULT 'Screening',
  notes                 TEXT,

  -- Tracking
  "dateAdded"           TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
-- Single-tenant internal tool — allow all operations for the anon role.
-- Revisit if auth is added in a future phase.
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_anon" ON deals;
CREATE POLICY "allow_all_anon" ON deals
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
