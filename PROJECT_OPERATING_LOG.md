# Project Operating Log — Retail Deal Pipeline & Screener
**Started:** 2026-04-16
**Base Repo:** Repo B (LSG-Retail-Pipeline-v2---Claude)
**Maintained by:** LSG acquisitions team

---

## Project Identity

**Product name:** Retail Deal Pipeline & Screener
**Purpose:** Internal tool for LSG to ingest retail CRE offering memoranda, store structured deal data, track pipeline status, and generate IC memos
**Users:** LSG acquisitions team — single-tenant, internal use only
**Deployment:** Vercel
**Stack:** React 18 / Vite 5 / Tailwind v3 / Vercel Functions / Supabase (target) / Anthropic Claude API

---

## How This Project Is Being Run

This project follows the operating discipline from the Hospitality Pricing Copilot project.

**Advisor role (ChatGPT):** Product decisions, scope management, planning documents, resolving ambiguity before implementation. Does not write production code.

**Implementation role (Claude Code):** Executes defined tasks. Does not re-litigate scope. Reports blockers immediately rather than making silent assumptions.

**Rules:**
- No implementation session begins without a defined task in TASKS.md and a phase gate condition
- Scope changes go through the advisor first — do not expand scope inside a Claude Code session
- Do not overbuild. If a feature is not in the current phase's tasks, it goes to BACKLOG.md, not into the code
- Phase gates are hard stops — do not begin the next phase until the current gate condition is met
- If Repo A inspection reveals a conflict with decisions in MERGE_PLAN.md, log it here before writing code

---

## Current Status

**Date:** 2026-04-16
**Phase:** 1 — Planning artifacts and base repo setup
**Status:** In progress

**Completed this session:**
- Full repo assessment of Repo B
- Repo role assessment: Repo B in the 5-layer target product
- Merge architecture decision: Repo B = base, Repo A = logic/schema authority
- Created PRD.md, MERGE_PLAN.md, PROJECT_OPERATING_LOG.md, TASKS.md, BACKLOG.md

**Remaining Phase 1 tasks:**
- Commit api/blob-upload.js (currently uncommitted in working tree)
- Create .env.example
- Add dist/ to .gitignore
- Inspect Repo A and answer the 5 open questions in MERGE_PLAN.md
- Resolve field schema: compare Repo A v2.0 against Repo B PIPELINE_COLUMNS

---

## Source Repos

### Repo B — Structural Base (this repo)

**Strongest at:** Layer 5 (Live Pipeline Tracker UI), Layer 1 partial (PDF upload + single-agent Claude extraction)

**Key assets to preserve:**
- React SPA shell, Vite build, Tailwind v3 config
- Vercel deployment config (vercel.json)
- api/blob-upload.js — Vercel Blob staging for PDF upload
- api/ingest-om.js — working single-agent extraction (to be replaced in Phase 3)
- 18-field deal schema: PIPELINE_COLUMNS in App.jsx
- STAGES array: `['Screening', 'Underwriting', 'Bid', 'Active', 'Dead']`
- ASSET_TYPES array: 8 retail CRE categories
- Pipeline UI: sortable table, stage filter, search bar, stat cards, modal form

**Known weaknesses:**
- localStorage only — replaced by Supabase in Phase 2
- Monolithic App.jsx (485 lines) — decompose during merge, not as a standalone sprint
- Uncommitted changes in api/blob-upload.js
- No project docs (fixed this session)
- dist/ committed to git (fix in Phase 1)

### Repo A — Logic/Schema Authority

**Strongest at:** Layer 1 (two-agent OM extraction), Layer 2 (Supabase schema v2.0), Layer 4 (IC memo / one-pager)

**Key assets to port:**
- Supabase schema v2.0 with JSONB + scalar index design
- Two-agent extraction pattern for api/ingest-om.js replacement
- IC memo / one-pager generation logic
- Claude system prompts (port verbatim)

**Open questions about Repo A** (must answer before Phase 2):
1. Exact column names and types in schema v2.0
2. Whether schema v2.0 is a superset or subset of Repo B's 18 fields
3. Whether two-agent pattern means two API calls or two messages in one call
4. Whether Supabase Auth is present or service-role key only
5. What one-pager output format is (markdown, HTML, rendered component)

---

## Locked Decisions

These are final. A new log entry is required to change any of them.

| # | Decision | Date | Rationale |
|---|---|---|---|
| 1 | Repo B is the structural base repo | 2026-04-16 | Working UI, Vercel config, API layer |
| 2 | Repo A schema v2.0 is authoritative for Supabase | 2026-04-16 | More complete, database-backed |
| 3 | Repo A two-agent extraction is authoritative | 2026-04-16 | Supersedes Repo B single-agent |
| 4 | Repo B pipeline UI pattern is authoritative | 2026-04-16 | Working, correct shape |
| 5 | Tailwind v3 stays — no v4 upgrade | 2026-04-16 | Vercel compatibility — intentional |
| 6 | Deployment platform is Vercel | 2026-04-16 | Repo B already configured |
| 7 | No localStorage in merged product | 2026-04-16 | Replaced by Supabase in Phase 2 |
| 8 | AI screener is deferred to post-v1 | 2026-04-16 | Out of MVP scope |

---

## Do Not Overbuild

The following are explicitly deferred. If a Claude Code session starts working on any of these, stop and re-scope to the current phase:

- Hurdle rate screening or pass/fail badges
- Side-by-side deal comparison
- Auth or multi-user support
- Excel or PDF export
- Analytics beyond the 4 stat cards
- AI screener modeling
- Mobile-optimized UI
- Notifications or workflow automation

See BACKLOG.md for the full deferred list.

---

## Milestones

| ID | Milestone | Description | Status |
|---|---|---|---|
| M0 | Planning complete | All Phase 1 artifacts created, repo clean, open questions answered | In progress |
| M1 | Supabase integrated | localStorage removed, deals persist in Supabase | Not started |
| M2 | Extraction ported | Two-agent pattern live, deals write to Supabase on ingest | Not started |
| M3 | One-pager live | IC memo generation working from real deal record | Not started |
| M4 | v1 complete | All 6 PRD success criteria pass in deployed Vercel environment | Not started |

---

## Log

### 2026-04-16 — Schema correction pass: Repo A authority applied, mapper layer added

**What happened:**
- Rewrote db/schema.sql from scratch — Repo A authority (snake_case, NUMERIC fields, raw_data JSONB)
- Created src/lib/dealMapper.js — fromDbRow and toDbRow with all semantic renames
- Updated App.jsx persistence paths (addDeal, saveDeal, initial load) to route through mapper
- deleteDeal unchanged (operates on id only)
- handleIngest unchanged (populates form state; toDbRow handles translation on Save)

**Schema changes (prior schema must be dropped and recreated):**
- Column naming: camelCase quoted identifiers → snake_case
- Column types: askingPrice/capRate TEXT → purchase_price/going_in_cap NUMERIC
- Added: raw_data JSONB (non-negotiable per Repo A authority)
- Added: source_files TEXT[], assignee TEXT, schema_version TEXT (nullable; no UI yet)
- Added: irr_levered_5 NUMERIC, moic_5 NUMERIC (nullable; Phase 3+ underwriting)
- Removed: all camelCase columns from prior schema
- Kept: updated_at trigger, permissive anon RLS policy, id UUID, created_at, updated_at

**Mapper design decisions:**
- UI remains camelCase throughout (Repo B authority for UI vocabulary)
- DB is snake_case (Repo A authority)
- Semantic renames: askingPrice↔purchase_price, capRate↔going_in_cap, broker↔source_broker, stage↔status, propertyName↔deal_name, propertyAddress↔address, assetType↔asset_type
- Fields with no scalar column (market, sf, acreage, etc.) stored in raw_data, reconstructed by fromDbRow
- NUMERIC columns: parseNumeric() strips $, %, commas; returns null for unparseable strings (e.g. "Best Offer")
- Original display strings (e.g. "$65,000,000") preserved in raw_data; fromDbRow prefers raw_data string over formatted NUMERIC for display fidelity
- dateAdded (UI sort key) derived from ingested_at in fromDbRow

**Known limitation noted in mapper:**
- Manual edit of an OM-ingested deal overwrites raw_data with form state. Phase 3 extraction metadata beyond the 17 form fields will be lost on edit. Revisit deep-merge strategy in Phase 3.

**Pending before Milestone 1 gate passes:**
- Drop old deals table (if already created) and run new db/schema.sql in Supabase SQL editor
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
- Run npm run dev and validate 7-step round-trip test

---

### 2026-04-16 — Phase 2 implementation: Supabase persistence, localStorage removed

**What happened:**
- Completed remaining Phase 1 items: .gitignore, .env.example, committed api/blob-upload.js
- Installed @supabase/supabase-js
- Created src/lib/supabase.js — Vite-compatible client using VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
- Created db/schema.sql — deals table with Repo B's 18 camelCase fields as scalar TEXT columns
- Replaced all localStorage reads/writes in src/App.jsx with Supabase CRUD
- Added loading state (async initial fetch)
- Confirmed: `grep -r 'localStorage' src/` returns zero matches

**Schema decisions made this session:**
- Columns use camelCase quoted identifiers matching App.jsx field names — no mapping layer needed
- All deal field columns are TEXT — preserves string formatting from OMs
- id: UUID (auto-generated), dateAdded: TEXT (YYYY-MM-DD), created_at/updated_at: TIMESTAMPTZ
- RLS: permissive anon policy — single-tenant, no auth
- NOT implementing Repo A JSONB design — deferred to Phase 3
- NOT adding 'screen' column — purpose unknown from Repo B; must confirm from Repo A

**Pending before Milestone 1 gate passes:**
- You must create a Supabase project (if not done already)
- Run db/schema.sql in the Supabase SQL editor
- Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local
- Run `npm run dev` and validate the 7-step round-trip test

**Blockers (must resolve before Phase 3):**
- What is the `screen` column in Repo A's live DB? Do not add it without understanding its semantics.
- Repo A schema v2.0 column names likely differ — schema migration required in Phase 3.

---

### 2026-04-16 — Intake, planning, and merge architecture

**What happened:**
- Completed full repo assessment of Repo B (code inventory, feature audit, gap analysis)
- Completed repo role assessment against the 5-layer target product
- Determined merge architecture: Repo B = base, Repo A = logic/schema authority
- Confirmed all 9 Hospitality playbook operating elements were missing from Repo B
- Created all 5 Phase 1 planning artifacts in this session

**Decisions made:**
- All 8 locked decisions above established this session

**Blockers / open questions:**
- Repo A has not been inspected yet — 5 open questions in MERGE_PLAN.md must be answered before Phase 2
- api/blob-upload.js has uncommitted changes — must be committed before Phase 2

**Next action:**
- Inspect Repo A
- Answer the 5 MERGE_PLAN.md open questions
- Log findings in a new entry here
- Complete remaining Phase 1 tasks
- Begin Phase 2 only after Phase 1 gate condition is met
