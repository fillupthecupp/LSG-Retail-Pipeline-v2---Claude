/**
 * dealMapper.js
 *
 * Translates between Repo B's camelCase UI shape and Repo A's snake_case DB schema.
 *
 * Scalar DB columns (indexed, queryable):
 *   id, ingested_at, deal_name, address, asset_type,
 *   purchase_price, going_in_cap, irr_levered_5, moic_5,
 *   status, source_broker, assignee, source_files,
 *   schema_version, raw_data, created_at, updated_at
 *
 * Semantic renames (Repo B UI → Repo A DB):
 *   propertyName    → deal_name
 *   propertyAddress → address
 *   assetType       → asset_type
 *   askingPrice     → purchase_price   (NUMERIC; original string preserved in raw_data)
 *   capRate         → going_in_cap     (NUMERIC; original string preserved in raw_data)
 *   broker          → source_broker
 *   stage           → status
 *
 * Repo B display fields with no scalar column — stored in raw_data only:
 *   market, sf, acreage, yearBuiltRenovated, parkingCount,
 *   occupancy, walt, noi, keyAnchors, bidDate, notes
 *
 * Phase 3+ fields present in schema but not in current UI:
 *   irr_levered_5, moic_5, assignee, source_files
 */

/**
 * Parse a form string value into a NUMERIC-compatible number.
 * Strips $, %, commas, whitespace. Returns null if the value is empty or
 * cannot be parsed as a finite number (e.g. "Best Offer", "TBD").
 * The original string is always preserved in raw_data for display fidelity.
 */
function parseNumeric(v) {
  if (v == null || v === '') return null;
  const cleaned = String(v).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build the raw_data JSONB payload from a UI form object.
 *
 * Stores all current Repo B display fields so fromDbRow can reconstruct
 * the full UI shape on read. This includes the original string values of
 * askingPrice and capRate, which may not survive round-trip via the NUMERIC
 * scalar columns (e.g. "$65,000,000" → 65000000 → "65000000" without this).
 *
 * PHASE 3 NOTE: For OM-ingested deals, the extraction API will supply its own
 * raw_data (the full Claude response). A subsequent manual edit will overwrite
 * raw_data with form state, losing any Phase 3 extraction metadata not surfaced
 * in the form. This trade-off is acceptable for Milestone 1. Revisit the merge
 * strategy (e.g. deep-merge raw_data on update) when Phase 3 is implemented.
 */
function buildRawData(form) {
  return {
    propertyName:       form.propertyName       ?? '',
    propertyAddress:    form.propertyAddress     ?? '',
    market:             form.market              ?? '',
    assetType:          form.assetType           ?? '',
    sf:                 form.sf                  ?? '',
    acreage:            form.acreage             ?? '',
    yearBuiltRenovated: form.yearBuiltRenovated  ?? '',
    parkingCount:       form.parkingCount        ?? '',
    occupancy:          form.occupancy           ?? '',
    walt:               form.walt                ?? '',
    askingPrice:        form.askingPrice         ?? '',  // original string; e.g. "$65,000,000"
    noi:                form.noi                 ?? '',
    capRate:            form.capRate             ?? '',  // original string; e.g. "7.07%"
    broker:             form.broker              ?? '',
    keyAnchors:         form.keyAnchors          ?? '',
    bidDate:            form.bidDate             ?? '',
    notes:              form.notes               ?? '',
  };
}

/**
 * fromDbRow(row)
 *
 * Converts a Supabase DB row (snake_case) into the UI deal shape (camelCase).
 * Applied to every row returned by Supabase selects before setting React state.
 *
 * Display-string values prefer raw_data over formatted scalar to preserve
 * original OM formatting (e.g. "$65,000,000" not "65000000").
 */
export function fromDbRow(row) {
  const raw = row.raw_data || {};
  return {
    // System fields
    id:          row.id,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    ingested_at: row.ingested_at,
    // dateAdded is a UI sort key; derived from ingested_at for PIPELINE_COLUMNS compatibility
    dateAdded:   row.ingested_at
      ? row.ingested_at.slice(0, 10)
      : (row.created_at ? row.created_at.slice(0, 10) : ''),

    // Scalar-backed fields — prefer raw_data string for display fidelity
    propertyName:    raw.propertyName    || row.deal_name      || '',
    propertyAddress: raw.propertyAddress || row.address        || '',
    assetType:       raw.assetType       || row.asset_type     || '',
    askingPrice:     raw.askingPrice     ||
      (row.purchase_price != null ? String(row.purchase_price) : ''),
    capRate:         raw.capRate         ||
      (row.going_in_cap != null ? String(row.going_in_cap) : ''),
    broker:          raw.broker          || row.source_broker  || '',
    stage:           row.status          || 'Screening',

    // raw_data-only fields (no scalar column; no fallback other than empty string)
    market:             raw.market             || '',
    sf:                 raw.sf                 || '',
    acreage:            raw.acreage            || '',
    yearBuiltRenovated: raw.yearBuiltRenovated || '',
    parkingCount:       raw.parkingCount       || '',
    occupancy:          raw.occupancy          || '',
    walt:               raw.walt               || '',
    noi:                raw.noi                || '',
    keyAnchors:         raw.keyAnchors         || '',
    bidDate:            raw.bidDate            || '',
    notes:              raw.notes              || '',

    // Phase 3+ fields: irr_levered_5, moic_5, assignee, source_files
    // Not included here because the UI has no form fields or table columns for them yet.
  };
}

/**
 * toDbRow(form)
 *
 * Converts a UI form object (camelCase) into a Supabase insert/update payload (snake_case).
 * Applied before every insert or update.
 *
 * Excluded intentionally:
 *   id          — managed by DB (PRIMARY KEY DEFAULT gen_random_uuid())
 *   created_at  — managed by DB (DEFAULT now())
 *   updated_at  — managed by DB trigger
 *   ingested_at — set by DB on insert (DEFAULT now()); not overwritten on update
 *   irr_levered_5, moic_5 — Phase 3+ underwriting; no UI fields yet
 *   assignee    — no UI field yet
 *   source_files — set by Phase 3 ingest API route; null for manual form saves
 */
export function toDbRow(form) {
  return {
    deal_name:      form.propertyName    || null,
    address:        form.propertyAddress || null,
    asset_type:     form.assetType       || null,
    purchase_price: parseNumeric(form.askingPrice),
    going_in_cap:   parseNumeric(form.capRate),
    status:         form.stage           || 'Screening',
    source_broker:  form.broker          || null,
    schema_version: '1.0',
    raw_data:       buildRawData(form),
  };
}
