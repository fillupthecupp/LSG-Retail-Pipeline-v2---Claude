-- Retail Deal Pipeline & Screener — deals table
-- Schema version: v2.0 (Repo A authority)
-- Last updated: 2026-04-16
--
-- Naming: snake_case per Repo A authority.
-- Design: scalar columns for indexed/queryable fields; raw_data JSONB for
--   OM extraction output and Repo B display fields that are not scalar-indexed.
--
-- Repo B display fields NOT stored as scalar columns (market, sf, acreage,
--   yearBuiltRenovated, parkingCount, occupancy, walt, noi, keyAnchors,
--   bidDate, notes) are stored inside raw_data and reconstructed by
--   fromDbRow() in src/lib/dealMapper.js.
--
-- Deferred:
--   screen     — not required for Milestone 1
--   irr_levered_5, moic_5 — present as nullable; populated in Phase 3+ underwriting
--   assignee, source_files — present as nullable; no UI fields yet
--
-- To replace a prior schema: DROP TABLE IF EXISTS deals CASCADE; then run this file.

CREATE TABLE IF NOT EXISTS deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingested_at     TIMESTAMPTZ DEFAULT now(),

  -- Core deal identification (scalar-indexed)
  deal_name       TEXT,
  address         TEXT,
  asset_type      TEXT,

  -- Financial metrics (scalar-indexed, NUMERIC for screening/comparison)
  purchase_price  NUMERIC,
  going_in_cap    NUMERIC,
  irr_levered_5   NUMERIC,    -- Phase 3+ underwriting output; null for manual entry
  moic_5          NUMERIC,    -- Phase 3+ underwriting output; null for manual entry

  -- Pipeline tracking
  status          TEXT NOT NULL DEFAULT 'Screening',

  -- Sourcing
  source_broker   TEXT,
  assignee        TEXT,       -- no UI field yet
  source_files    TEXT[],     -- set by Phase 3 ingest API; null for manual entry

  -- Schema management
  schema_version  TEXT DEFAULT '1.0',

  -- Full extraction payload + Repo B display-only fields
  -- For manual entry: contains all form fields for round-trip fidelity.
  -- For Phase 3 ingest: contains full Claude extraction response.
  raw_data        JSONB,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on every modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_updated_at ON deals;
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
-- Single-tenant internal tool — permissive anon access, no auth for v1.
-- Revisit before adding multi-user or public-facing access.
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_anon" ON deals;
CREATE POLICY "allow_all_anon" ON deals
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
