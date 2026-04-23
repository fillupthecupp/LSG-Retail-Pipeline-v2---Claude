/**
 * api/ingest-om.js — Phase 3 two-agent ingest route.
 *
 * Contract (see PROJECT_OPERATING_LOG.md 2026-04-16 preflight entry):
 *   Request:  POST { filename, url }            (url = Vercel Blob staging URL)
 *   Success:  { ok: true, dealId, fieldsPopulated, conflicts, confidence }
 *   Error:    { ok: false, error, stage: 'reader'|'standardizer'|'save' }
 *
 * Flow:
 *   1. Fetch the staged PDF from the provided Blob URL, base64-encode.
 *   2. Reader agent  — claude-sonnet-4-6, max_tokens 8000, narrative output.
 *   3. Standardizer  — claude-sonnet-4-6, max_tokens 16000, LSG v2 JSON.
 *   4. Sanitize payload (drop _reader_narrative; force schema_version='2.0'),
 *      write to Supabase `deals`. purchase_price and going_in_cap scalars
 *      are always null after ingest (analyst-owned per C1/C2 — see log).
 *
 * System prompts (READER_SYSTEM, STANDARDIZER_SYSTEM) are copied verbatim
 * from examples/lsg_ingest_v1.html lines 928–1169 per the preflight decision
 * to treat Repo A prompts as authoritative.
 */

import { createClient } from '@supabase/supabase-js';

// ── Agent system prompts (verbatim from Repo A) ─────────────────────────────

const READER_SYSTEM = `You are a senior acquisitions analyst at Lightstone Group. Your job is to READ a commercial real estate offering memorandum (or financial document) and produce a comprehensive, faithful narrative summary.

CRITICAL RULES:
- Do NOT extract into JSON yet
- Do NOT impose any structure on the data
- Faithfully represent what the document actually says, in the document's own organization
- Note WHERE information appears (e.g. "Page 3 executive summary states...", "The rent roll table on page 14 shows...")
- Capture the broker's exact language for thesis, upside, and risk — do not paraphrase
- Flag any internal inconsistencies you notice (e.g. occupancy stated as 95% on page 1 but rent roll implies 91%)
- Note anything that appears in footnotes, asterisks, or qualifications
- If multiple documents are provided, treat each separately then note cross-document observations

Your output will be passed to a second agent for standardization. The richer and more faithful your summary, the better the final extraction.

Structure your output as:
1. DOCUMENT OVERVIEW (type, broker, date, page count if determinable)
2. PROPERTY SUMMARY (what the document says about the physical asset)
3. INVESTMENT THESIS (broker's exact stated thesis and upside scenarios)
4. FINANCIAL SUMMARY (all numbers mentioned — NOI, cap rate, price, returns — with source location)
5. TENANCY (all tenant information — full roster if available, or described as presented)
6. CAPITAL STACK (debt assumptions, terms, sources & uses)
7. MARKET & DEMOGRAPHICS (submarket characterization, comps, demographics)
8. RISKS DISCLOSED (anything the broker flags as a risk, however buried)
9. INCONSISTENCIES NOTED (any data conflicts you identified across the document)
10. MISSING INFORMATION (fields you would expect in an OM of this type that were absent)`;

const STANDARDIZER_SYSTEM = `You are a senior acquisitions analyst at Lightstone Group. You will receive a narrative summary of a commercial real estate document produced by a reader agent. Your job is to map this narrative into the LSG standard JSON schema.

CRITICAL RULES:
- Return ONLY valid JSON — no markdown, no code fences, no preamble
- Use null for any field not present in the narrative
- For conflicts flagged by the reader, use the more conservative/reliable figure and note it in the conflict_flags array
- Do not invent or estimate data not present in the narrative
- Preserve the broker's exact language in text fields (thesis, description, risk narrative)
- For lease_abstracts, extract every tenant mentioned — not just top tenants
- Health ratio = annual rent / annual sales (if sales disclosed)

Return this exact structure:
{
  "schema_version": "2.0",
  "deal_name": "",
  "address": "",
  "city": "",
  "state": "",
  "mode": "CONSERVATIVE",
  "property": {
    "type": "",
    "size_sf": "",
    "acreage": "",
    "occupancy": "",
    "economic_occupancy": "",
    "tenant_count": "",
    "walt": "",
    "vintage": "",
    "buildings": "",
    "class": "",
    "parking_ratio": "",
    "zoning": ""
  },
  "transaction": {
    "status": "Screening",
    "strategy": "",
    "seller": "",
    "sourcing": "",
    "ask_price": "",
    "ask_price_psf": "",
    "bid_deadline": "",
    "call_for_offers": ""
  },
  "investment_thesis": {
    "broker_headline": "",
    "stated_upside": [],
    "repositioning_narrative": "",
    "value_add_components": [],
    "comp_set_referenced": [],
    "disclosed_risks": [],
    "broker_NOI_adjustment_narrative": ""
  },
  "scorecard": {
    "overall_grade": null,
    "market_grade": null,
    "property_grade": null,
    "location_grade": null,
    "business_plan_grade": null,
    "description": "",
    "kpis": []
  },
  "returns": {
    "going_in_yield_cost": "",
    "going_in_cap": "",
    "stable_yield_y11": "",
    "avg_yield_5yr": "",
    "avg_yield_10yr": "",
    "hold_period_1": "5",
    "hold_period_2": "10",
    "irr_unlevered_5": "",
    "irr_unlevered_10": "",
    "irr_levered_5": "",
    "irr_levered_10": "",
    "irr_net_5": "",
    "irr_net_10": "",
    "net_profit_5": "",
    "net_profit_10": "",
    "moic_5": "",
    "moic_10": "",
    "coc_pre_refi_5": "",
    "coc_pre_refi_10": ""
  },
  "valuation": {
    "stable_value_psf_today": "",
    "stable_value_psf_5yr": "",
    "stable_value_psf_10yr": "",
    "stable_cap_rate": "",
    "stable_cap_expansion": "",
    "exit_cap_5yr": "",
    "exit_cap_10yr": "",
    "mtm_exit_cap_5yr": ""
  },
  "sources_uses": {
    "purchase_price": "",
    "purchase_price_psf": "",
    "closing_costs": "",
    "reserves_at_close": "",
    "total_at_closing": "",
    "ticl_costs": "",
    "capex_costs": "",
    "total_post_closing": "",
    "total_uses": "",
    "senior_debt_initial": "",
    "senior_debt_pct": "",
    "lightstone_initial": "",
    "lightstone_pct": "",
    "total_initial": ""
  },
  "capital_sources": {
    "proceeds_at_close": "",
    "ltpp": "",
    "ltc": "",
    "ltv": "",
    "fixed_floating": "",
    "benchmark": "",
    "index": "",
    "spread": "",
    "effective_rate": "",
    "rate_cap": "",
    "term_years": "",
    "io_period_years": "",
    "amortization": "",
    "debt_yield": "",
    "dscr": ""
  },
  "top_tenants": [
    {"name":"","parent_company":"","sf":"","sf_pct":"","move_in":"","expiration":"","in_place_rent":"","market_rent":"","mtm_pct":"","options":"","termination_rights":"","co_tenancy":"","percentage_rent":"","guarantee_type":"","sales_psf":"","health_ratio":"","credit_watch":false}
  ],
  "lease_abstracts": [
    {"tenant":"","sf":"","commencement":"","expiration":"","base_rent_psf":"","rent_steps":[],"options":[],"termination_rights":"","co_tenancy_requirement":"","guarantee_type":"","sales_psf":"","health_ratio":""}
  ],
  "by_size": [
    {"category":"","national_pct":"","in_place_rent":"","market_rent":"","mtm_pct":"","walt":"","sf":"","rev_pct":"","sales_psf":"","health_ratio":""}
  ],
  "cash_flows": {
    "years": [],
    "period_ending": [],
    "gross_potential_rent": [],
    "opex_reimbursements": [],
    "vacancy_loss": [],
    "effective_gross_income": [],
    "other_income": [],
    "total_revenue": [],
    "operating_expenses": [],
    "noi": [],
    "total_capex_leasing": [],
    "cfbds": [],
    "debt_service": [],
    "cfads": [],
    "yield_on_cost": [],
    "cash_on_cash": []
  },
  "market": {
    "submarket": "",
    "gs_grade": "",
    "avg_rent_growth_10yr": "",
    "avg_rent_growth_20yr": "",
    "inventory_total": "",
    "vacancy_total": "",
    "market_growth_2026": "",
    "market_growth_2027": "",
    "market_growth_2028": "",
    "market_growth_2029": "",
    "market_growth_2030": "",
    "lsg_uw_growth": ""
  },
  "income_assumptions": {
    "general_vacancy": "",
    "credit_loss": "",
    "annual_escalations": "",
    "mla_term_small": "",
    "mla_renew_prob_small": "",
    "mla_market_rent_small": "",
    "mla_ti_new_small": "",
    "mla_lc_new_small": "",
    "mla_free_rent_new": ""
  },
  "sensitivity": [],
  "demographics": {
    "pop_30": "", "pop_50": "", "pop_70": "",
    "hh_30": "", "hh_50": "", "hh_70": "",
    "hh_med_inc_30": "", "hh_med_inc_50": "", "hh_med_inc_70": "",
    "med_home_val_30": "", "med_home_val_50": "", "med_home_val_70": "",
    "crime_vs_natl_30": "",
    "traffic_streets": []
  },
  "expenses": {
    "ret_insurance_psf": "",
    "cam_psf": "",
    "management_pct": "",
    "other_psf": "",
    "capex_schedule": []
  },
  "tenant_use_type": [],
  "deal_risks": {
    "anchor_expiry_risk": "",
    "credit_watch_tenants": [],
    "deferred_maintenance": "",
    "legal_disclosed": null,
    "environmental_disclosed": null,
    "title_issues": null,
    "market_headwinds": "",
    "broker_NOI_bridge_risk": ""
  },
  "conflict_flags": [
    {"field":"","source_a_value":"","source_b_value":"","resolution":"","note":""}
  ],
  "extraction_meta": {
    "schema_version": "2.0",
    "fields_populated": 0,
    "fields_null": 0,
    "confidence": "high|medium|low",
    "source_docs": [],
    "conflicts_detected": 0
  }
}`;

// ── Helpers ─────────────────────────────────────────────────────────────────

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function errorResponse(res, stage, message, status = 500) {
  return res.status(status).json({ ok: false, error: message, stage });
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Robust JSON parse: strip ```json fences, then parse; on failure, extract
// the first balanced object from the string.
function parseStandardizerJson(text) {
  const cleaned = String(text).replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Standardizer did not return parseable JSON.');
    return JSON.parse(m[0]);
  }
}

async function callAnthropic({ apiKey, system, userContent, max_tokens }) {
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const detail = data?.error?.message || `HTTP ${resp.status}`;
    const err = new Error(detail);
    err.status = resp.status;
    throw err;
  }
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  if (!text) throw new Error('Anthropic returned an empty response.');
  return text;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    return errorResponse(res, 'reader', 'Method not allowed.', 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse(res, 'reader', 'ANTHROPIC_API_KEY is not set in Vercel environment variables.');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return errorResponse(res, 'save', 'Supabase credentials not set in Vercel environment variables.');
  }

  let body;
  try { body = await parseJsonBody(req); }
  catch { return errorResponse(res, 'reader', 'Invalid JSON body.', 400); }

  const filename = typeof body?.filename === 'string' ? body.filename : 'document.pdf';
  const url = typeof body?.url === 'string' ? body.url : null;
  if (!url) return errorResponse(res, 'reader', 'Missing `url` in request body.', 400);

  const t0 = Date.now();
  let pdfBase64;
  try {
    const pdfResp = await fetch(url);
    if (!pdfResp.ok) throw new Error(`Blob fetch failed (${pdfResp.status}).`);
    const buf = Buffer.from(await pdfResp.arrayBuffer());
    if (buf.byteLength === 0) throw new Error('Staged PDF is empty.');
    pdfBase64 = buf.toString('base64');
    console.log(`[ingest] pdf_bytes=${buf.byteLength} fetch_ms=${Date.now() - t0}`);
  } catch (err) {
    return errorResponse(res, 'reader', `Could not fetch staged PDF: ${err.message}`);
  }

  // ── Step 1: Reader agent ────────────────────────────────────────────────
  let narrative;
  try {
    const tR = Date.now();
    narrative = await callAnthropic({
      apiKey,
      system: READER_SYSTEM,
      max_tokens: 8000,
      userContent: [
        { type: 'text', text: `--- Document: ${filename} (Type: OM) ---` },
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text: 'Please read the provided document carefully and produce a comprehensive narrative summary following your instructions. Be thorough — this narrative will be the sole input for a standardization agent.' },
      ],
    });
    console.log(`[ingest] reader_ms=${Date.now() - tR} words=${narrative.split(/\s+/).length}`);
  } catch (err) {
    return errorResponse(res, 'reader', err.message || 'Reader agent failed.');
  }

  // ── Step 2: Standardizer agent ──────────────────────────────────────────
  let extracted;
  try {
    const tS = Date.now();
    const stdText = await callAnthropic({
      apiKey,
      system: STANDARDIZER_SYSTEM,
      max_tokens: 16000,
      userContent: `Here is the reader agent narrative:\n\n${narrative}\n\nMap this to the LSG JSON schema. Return only valid JSON.`,
    });
    extracted = parseStandardizerJson(stdText);
    console.log(`[ingest] standardizer_ms=${Date.now() - tS}`);
  } catch (err) {
    return errorResponse(res, 'standardizer', err.message || 'Standardizer agent failed.');
  }

  // Defensive sanitization before storage:
  //   - extracted must be a plain object
  //   - _reader_narrative key (if any leaked into extracted) is removed
  //   - schema_version is forced to '2.0' per locked Phase 3 rule
  if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)) {
    return errorResponse(res, 'standardizer', 'Standardizer returned an unexpected shape.');
  }
  if ('_reader_narrative' in extracted) delete extracted._reader_narrative;
  extracted.schema_version = '2.0';

  // ── Step 3: Supabase write ──────────────────────────────────────────────
  const supa = createClient(supabaseUrl, supabaseKey);

  // Derived scalars — populated where an Agent 2 field is safely a string.
  // purchase_price and going_in_cap are explicitly null — analyst-owned (C1/C2).
  const addressParts = [
    extracted.address,
    extracted.city,
    extracted.state,
  ].map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
  const addressScalar = addressParts.length > 0 ? addressParts.join(', ') : null;

  const row = {
    deal_name:      typeof extracted.deal_name === 'string' && extracted.deal_name.trim() ? extracted.deal_name.trim() : null,
    address:        addressScalar,
    asset_type:     typeof extracted.property?.type === 'string' && extracted.property.type.trim() ? extracted.property.type.trim() : null,
    purchase_price: null,                                           // analyst-owned (C1)
    going_in_cap:   null,                                           // analyst-owned (C2)
    status:         (typeof extracted.transaction?.status === 'string' && extracted.transaction.status.trim()) || 'Screening',
    source_broker:  typeof extracted.transaction?.sourcing === 'string' && extracted.transaction.sourcing.trim() ? extracted.transaction.sourcing.trim() : null,
    source_files:   [filename],                                     // set by ingest route, not extracted (locked rule 5)
    schema_version: '2.0',                                          // ingest writes 2.0; toDbRow writes 1.0 (C3)
    raw_data:       extracted,                                      // full Agent 2 output with no _reader_narrative
  };

  let dealId;
  try {
    const tDB = Date.now();
    const { data, error } = await supa.from('deals').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    dealId = data.id;
    console.log(`[ingest] supabase_ms=${Date.now() - tDB} deal_id=${dealId}`);
  } catch (err) {
    return errorResponse(res, 'save', err.message || 'Supabase insert failed.');
  }

  const conflicts = Array.isArray(extracted.conflict_flags)
    ? extracted.conflict_flags.filter(c => c && c.field).length
    : 0;

  return res.status(200).json({
    ok: true,
    dealId,
    fieldsPopulated: extracted.extraction_meta?.fields_populated ?? null,
    conflicts,
    confidence: extracted.extraction_meta?.confidence ?? null,
  });
}
