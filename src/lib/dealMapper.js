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
 * Semantic renames (UI → DB):
 *   propertyName    → deal_name
 *   propertyAddress → address
 *   assetType       → asset_type
 *   askingPrice     → purchase_price   (analyst-entered; NUMERIC scalar + string in raw_data)
 *   capRate         → going_in_cap     (analyst-entered; NUMERIC scalar + string in raw_data)
 *   broker          → source_broker
 *   stage           → status
 *   sourceFiles     → source_files
 *
 * Analyst-owned fields — purchase_price and going_in_cap:
 *   These are set by the analyst, not auto-populated from OM extraction.
 *   OM extraction intentionally skips these fields (see handleIngest in App.jsx).
 *   The NUMERIC scalar is useful for future screener comparisons.
 *   The original string (e.g. "$65,000,000") is preserved in raw_data for display.
 *
 * Repo B display fields with no scalar column — stored in raw_data only:
 *   market, sf, acreage, yearBuiltRenovated, parkingCount,
 *   occupancy, walt, noi, keyAnchors, bidDate, notes
 *
 * Phase 3+ fields present in schema but not in current UI:
 *   irr_levered_5, moic_5, assignee
 */

/**
 * Parse a form string value into a NUMERIC-compatible number.
 * Strips $, %, commas, whitespace. Returns null if the value is empty or
 * cannot be parsed as a finite number (e.g. "Best Offer", "TBD", "Call for Pricing").
 * The original string is always preserved in raw_data for display fidelity.
 */
function parseNumeric(v) {
  if (v == null || v === '') return null;
  const cleaned = String(v).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build the form-state portion of raw_data from a UI form object.
 *
 * Records all current Repo B display fields so fromDbRow can reconstruct
 * the full UI shape on read. This includes the original string values of
 * askingPrice and capRate (e.g. "$65,000,000", "7.0%") which do not survive
 * round-trip through the NUMERIC scalar columns without this preservation.
 *
 * This object is MERGED into existing raw_data on update (not replaced),
 * so any Phase 3 extraction metadata or extra keys are preserved.
 * See toDbRow for the merge strategy.
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
    askingPrice:        form.askingPrice         ?? '',  // analyst-entered; original string preserved
    noi:                form.noi                 ?? '',
    capRate:            form.capRate             ?? '',  // analyst-entered; original string preserved
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
 * Includes raw_data and sourceFiles on the output object so they survive through
 * the edit form and back into toDbRow without requiring an extra DB read.
 *
 * Display-string values prefer raw_data over formatted scalar to preserve
 * original entry (e.g. "$65,000,000" not "65000000").
 */
export function fromDbRow(row) {
  const raw = row.raw_data || {};
  return {
    // System fields
    id:          row.id,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    ingested_at: row.ingested_at,
    // dateAdded is a UI sort key derived from ingested_at for PIPELINE_COLUMNS compatibility
    dateAdded:   row.ingested_at
      ? row.ingested_at.slice(0, 10)
      : (row.created_at ? row.created_at.slice(0, 10) : ''),

    // Pass raw_data through so edits can patch rather than overwrite (used in toDbRow)
    raw_data:    row.raw_data || null,

    // Pass source_files through so it survives edits without being cleared
    sourceFiles: row.source_files || null,

    // Scalar-backed fields — prefer raw_data string for display fidelity
    propertyName:    raw.propertyName    || row.deal_name      || '',
    propertyAddress: raw.propertyAddress || row.address        || '',
    assetType:       raw.assetType       || row.asset_type     || '',
    // askingPrice / capRate: analyst-entered; raw_data string takes priority over NUMERIC scalar
    askingPrice:     raw.askingPrice     ||
      (row.purchase_price != null ? String(row.purchase_price) : ''),
    capRate:         raw.capRate         ||
      (row.going_in_cap != null ? String(row.going_in_cap) : ''),
    broker:          raw.broker          || row.source_broker  || '',
    stage:           row.status          || 'Screening',

    // raw_data-only fields (no scalar column)
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

    // Phase 3+ fields: irr_levered_5, moic_5, assignee
    // Not surfaced here — no UI form fields or table columns yet.
  };
}

/**
 * toDbRow(form)
 *
 * Converts a UI form object (camelCase) into a Supabase insert/update payload (snake_case).
 * Applied before every insert or update.
 *
 * raw_data strategy:
 *   On insert: form.raw_data is undefined → { ...{}, ...buildRawData(form) } = buildRawData(form)
 *   On update: form.raw_data is the existing DB value (passed through by fromDbRow) →
 *     { ...existingRawData, ...buildRawData(form) } patches only the known form fields,
 *     preserving any Phase 3 extraction metadata or extra keys in raw_data.
 *
 * source_files:
 *   Populated from form.sourceFiles, which is set in handleIngest (App.jsx) when a PDF
 *   is uploaded. Stores filenames as TEXT[]. Null for deals with no uploaded OM.
 *   Richer provenance (blob URLs, timestamps) can extend this in a later phase.
 *
 * Excluded intentionally:
 *   id          — managed by DB (PRIMARY KEY DEFAULT gen_random_uuid())
 *   created_at  — managed by DB (DEFAULT now())
 *   updated_at  — managed by DB trigger
 *   ingested_at — set by DB on insert (DEFAULT now()); not overwritten on update
 *   irr_levered_5, moic_5 — Phase 3+ underwriting output; no UI fields yet
 *   assignee    — no UI field yet
 */
export function toDbRow(form) {
  return {
    deal_name:      form.propertyName    || null,
    address:        form.propertyAddress || null,
    asset_type:     form.assetType       || null,
    purchase_price: parseNumeric(form.askingPrice),   // analyst-entered; null if blank or unparseable
    going_in_cap:   parseNumeric(form.capRate),        // analyst-entered; null if blank or unparseable
    status:         form.stage           || 'Screening',
    source_broker:  form.broker          || null,
    source_files:   Array.isArray(form.sourceFiles) && form.sourceFiles.length > 0
      ? form.sourceFiles
      : null,
    schema_version: '1.0',
    // Patch existing raw_data with current form values; preserves any extra keys
    raw_data: { ...(form.raw_data || {}), ...buildRawData(form) },
  };
}
