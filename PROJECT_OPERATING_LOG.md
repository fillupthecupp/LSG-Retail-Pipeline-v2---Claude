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

**Date:** 2026-04-23
**Phase:** 3 — Preflight complete; implementation beginning now
**Status:** Phase 1 complete ✓ | Phase 2 complete ✓ | Phase 3 preflight complete ✓ | Phase 3 implementation not yet complete
**Side note:** 2026-04-17 Compare tab UI shell added for meeting demo only — does not promote the backlog comparison feature (see log entry).
**Side note:** 2026-04-23 Pipeline KPI strip upgraded to Tier 2 §2.1 visual spec (presentation-safe slice); pass_reason capture formally deferred to BACKLOG.md (see log entry).
**Side note:** 2026-04-23 Vercel Pro confirmed; UI/demo polish is no longer the active stream — focus returns to Phase 3 ingestion implementation. Target: live draft deployment next week for internal testing (see log entry).

**Completed as of this update:**
- Phases 1 and 2 fully gated and complete
- Milestone 1 confirmed (deal add → Supabase → refresh → edit → delete all working)
- Repo A source files (lsg_ingest(1).html, lsg_one_pager(4).html) inspected in full
- All 5 MERGE_PLAN.md open questions answered — logged below
- Phase 3 preflight plan produced — field map, API contract, conflict log, implementation order
- 5 Repo A vs. locked-decision conflicts identified and resolved (C1–C5, logged below)
- Vercel Pro confirmed (2026-04-23) — 120s `maxDuration` ceiling is available for the ingest route

**Remaining blockers before end-to-end Phase 3 validation:**
- `BLOB_READ_WRITE_TOKEN` must be set in `.env.local` and in the Vercel dashboard — PDF upload cannot be tested end-to-end without it
- User approval / start of Phase 3 implementation

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
| M0 | Planning complete | All Phase 1 artifacts created, repo clean, open questions answered | **Complete** 2026-04-16 |
| M1 | Supabase integrated | localStorage removed, deals persist in Supabase | **Complete** 2026-04-16 |
| M2 | Extraction ported | Two-agent pattern live, deals write to Supabase on ingest | Not started |
| M3 | One-pager live | IC memo generation working from real deal record | Not started |
| M4 | v1 complete | All 6 PRD success criteria pass in deployed Vercel environment | Not started |

---

## Log

### 2026-04-23 — Vercel Pro confirmed; focus returns to Phase 3 ingestion (end of meeting-polish stream)

**What happened:**
- Vercel Pro plan confirmed. The "Vercel plan must be confirmed as Pro (300s)" blocker is closed. The 120s `maxDuration` ceiling required for the two-agent ingest route is now available.
- End of the meeting-polish / presentation stream. The aesthetic tokens, KPI strip, Compare / ONE PAGER / Support UI passes are sufficient for the near-term demo cadence and are not being extended further in this session.
- Project focus returns to Phase 3 ingestion implementation — porting Repo A's two-agent extraction into `api/ingest-om.js`, wiring the Supabase write, and closing the first-round end-to-end path.
- Target: a live draft deployment next week for internal testing. Bar for that deploy is defined in this session's execution-readiness summary (not a new milestone, not a new phase gate — it is a checkpoint inside Phase 3).

**Current Status reflects this:**
- "Vercel plan must be confirmed as Pro" removed from blockers.
- Remaining blockers before end-to-end Phase 3 validation: `BLOB_READ_WRITE_TOKEN` set in `.env.local` + Vercel dashboard; user approval / start of Phase 3 implementation.
- Phase definitions, milestones (M0–M4), locked decisions, and the BACKLOG promotion criteria are unchanged.

**Scope discipline for the next stretch:**
- No new features, no sidebar / app-shell work, no real Compare feature, no export / reporting, no `pass_reason` implementation, no Phase 4 (one-pager generation) work.
- No schema change in this pass. `db/schema.sql` stays as-is; Phase 3 implementation is additive on top of the existing schema plus `raw_data` JSONB.
- Aesthetic Tier 2 / Tier 3 work remains deferred — only the single KPI-strip carve-out already shipped was authorized.

**Files changed this session:**
- `PROJECT_OPERATING_LOG.md` — this entry + Current Status block (date, blocker list, side note).

**Next action:**
- Resolve `BLOB_READ_WRITE_TOKEN` (set in `.env.local` and Vercel env vars).
- On user approval, execute the Phase 3 TASKS.md checklist in the order documented in this session's execution checklist, beginning with the preservation commit of the current single-agent `api/ingest-om.js`.

---

### 2026-04-23 — ONE PAGER token refresh + Pipeline KPI strip upgrade + deferred pass_reason enhancement

**What happened (three coordinated pieces in one session):**
- **ONE PAGER token refresh (Tier 1.2 cleanup)** — the `OnePagerTab` component was originally built before the Tier 1 token port (2026-04-22). This pass token-aligned it: dropped the banned navy `#1e40af/#eff6ff` market chip, retired the decorative green `#15803d` asset-type chip, replaced every hardcoded `#111/#555/#777/#e5e3df/#f4f3f1/#fafaf9/#a8a5a1` with the corresponding `--lsg-*` token, moved the gap-banner to `--lsg-warning-subtle` / `--lsg-warning` / `--lsg-border-strong`, promoted the Print / Export PDF CTA to `--lsg-red` (the one deliberate red button on the page), reused `<StageBadge>` for the stage pill so it picks up the Tier 2 status-pill color map, and threaded a `mono: true` flag through the KV primitive so numeric values (Purchase Price / Going-In Cap / NOI / GLA / Occupancy / WALT / etc.) render in Geist Mono with `tabular-nums`.
- **Pipeline KPI strip upgrade** — replaced the legacy `StatCard` (Total / Active / At Bid / Screening) with a four-tile KPI strip following Tier 2 §2.1 of `examples/DESIGN_TOKENS.md`. Advisor authorized this as a presentation-safe slice of Tier 2, not a Tier 2 kickoff.
- **pass_reason governance decision** — recorded in `BACKLOG.md` that structured capture of why a deal was moved to Dead is strategically valuable and planned, but is NOT being implemented now because Phase 3 ingestion has not shipped and v1 is not yet complete.

**ONE PAGER token refresh (code change):**
- `src/App.jsx` — `OnePagerTab` body: paper styles (`paperStyle`, `sectionHdr`, `kvRow`, `sectionWrap`, `kvK`, `kvV`) swapped from raw hexes to `--lsg-*` tokens. Title-strip chips: `<StageBadge>` for stage; asset-type and market now render as warm surface-sunk pills with tertiary text (no navy, no decorative green). `KV` primitive extended with a `mono: true` row flag; applied to every numeric value row across Property / Transaction / Summary Metrics / Market & Submarket / Returns Summary / Capital Sources / Sources & Uses. Scorecard em-dashes use `--lsg-text-disabled` + Geist Mono. Gap banner moved to warm warning tokens. Footer date shifted to mono tabular-nums. Primary action button (Print / Export PDF) now uses `--lsg-red` (white text).
- Keeps the existing data bindings, deal dropdown, and "no deals" empty state. Still front-end-only; no schema, no API, no real one-pager generation — the backlog item for real one-pager generation remains deferred.

**Part A — KPI strip (code change):**
- `src/App.jsx` — replaced `StatCard` with a new `KpiTile` component and a compact-USD formatter (`formatCompactUSD`): `$1.65b / $42.0m / $240k`. Added a `kpiStats` `useMemo` that computes each tile from in-memory deals only — no extra Supabase queries, no schema touches, no new API routes. The four tiles:
  - **Active Deals** — count of `stage !== 'Dead'`. Subline: `"Across all stages except Dead"` (neutral). Real count; no delta claimed.
  - **Pipeline $** — `Σ` parseable `askingPrice` across active deals, rendered compact. Subline: `"${activePriced}/${activeCount} active deals priced"` (neutral). Real sum. No delta.
  - **Added · <Mon 'YY>** — count of `dateAdded` in current calendar month. Subline: real delta vs prior month (`▲ N vs Mar '26` in `--lsg-positive`, `▼ N vs Mar '26` in `--lsg-red-deep`, or `On pace with …` / `First tracked adds since …` / `No adds this month` as accurate fallbacks). Only the MoM comparison is real.
  - **Killed · <Mon 'YY>** — count of `stage === 'Dead'` with `updated_at` starting with the current `YYYY-MM` prefix (best-effort proxy; no dedicated `killed_at` column). Subline: fixed fallback `"Reason capture planned post-v1"`. **Intentionally no decomposition** — the Tier 2 reference (`62% basis · 25% anchor · 13% mkt`) requires the `pass_reason` field, which has not been added.
- Retired the old `stats` object and `StatCard` component — the new tiles fully replace them.
- Visual: tiles use `--lsg-surface` / `--lsg-border` / `--lsg-text-primary` / `--lsg-text-tertiary` / `--lsg-red` bullet / `--lsg-positive` and `--lsg-red-deep` only for delta deltas. No navy, no decorative greens. Red footprint stays well under the 5% discipline rule.
- Build passes clean (`vite build` — 410 kB JS / 12.3 kB CSS). HMR fired without errors across all edits.

**Part B — pass_reason planning (docs only):**
- `BACKLOG.md` — added "Dead Deal Pass Reason Capture" entry: purpose, rationale (sourcing intelligence, institutional memory, KPI decomposition feed), suggested structure (`pass_reason_primary` controlled category + optional `pass_reason_detail` free text), primary category list (Basis / pricing · Anchor / tenancy · Market · Lease rollover / WALT · Debt / financing · Returns · Sponsor / counterparty · Physical / capex · Competing priority / bandwidth · Other), future uses, and explicit post-M4 deferral note. Bumped "Last updated" to 2026-04-23.
- This entry records the advisor decision to defer.

**Why pass_reason is deferred right now:**
- Project is still at Phase 3 preflight — ingestion implementation has not started; core workflow is not stable.
- Adding `pass_reason_primary` / `pass_reason_detail` would require schema change (`db/schema.sql`), form field addition (edit modal + likely a stage-change modal on transition to Dead), mapper wiring (`src/lib/dealMapper.js`), and Supabase write paths — all of which are off-phase work in the middle of ingestion implementation.
- The Killed-tile fallback subline is explicitly scoped so the KPI strip can ship presentation-safe without inventing data.

**Future action (post-M4):**
- Re-open this decision after Milestone M4 is achieved.
- At that time, the advisor explicitly scopes (a) schema addition (primary column + optional detail column), (b) UI capture point (most likely a small modal triggered on stage change to Dead, primary category required, detail optional), and (c) reporting / KPI wiring that consumes it — including the Killed-tile decomposition subline per Tier 2 §2.1.
- Only then does the item get promoted from `BACKLOG.md` to `TASKS.md` with explicit acceptance criteria, per the Promotion Criteria in `BACKLOG.md`.

**Critical discipline — what was NOT touched:**
- `TASKS.md` — intentionally unchanged. Nothing is being promoted yet.
- `db/schema.sql` — no `pass_reason` column, no other schema changes.
- `src/lib/dealMapper.js` — untouched. `pass_reason` is NOT in `fromDbRow` / `toDbRow`.
- Pipeline edit modal, form fields, Supabase writes — untouched. No `pass_reason` capture point in code.
- `api/ingest-om.js`, `api/blob-upload.js`, `vercel.json` — untouched. Phase 3 ingestion is still gated on its existing blockers (Vercel Pro, `BLOB_READ_WRITE_TOKEN`, implementation-plan approval).
- Locked Decisions — all 8 still in force. Milestones, phase definitions, Do Not Overbuild list — unchanged.
- Tier 2 §2.1 is NOT fully opened by this pass. Remaining Tier 2 patterns (section-header signature, row treatment, status pill color map, priority badges) are still scoped as post-Phase-3 work. This was a single-pattern carve-out, not a tier promotion.

**Acceptance check:**
- Pipeline page renders the 4-tile KPI strip. Active Deals / Pipeline $ / Added · <cur month> / Killed · <cur month> all populate from current deal data.
- Killed tile shows a neutral fallback subline, not a fabricated decomposition.
- No backend, schema, or form changes shipped.
- `BACKLOG.md` contains a clear, deferred pass_reason entry. `TASKS.md` unchanged.

**Files changed this session:**
- `src/App.jsx` — KPI strip (replaced `StatCard` with `KpiTile`, added `formatCompactUSD`, rebuilt the 4-card render block and `stats` → `kpiStats` `useMemo`).
- `BACKLOG.md` — added "Dead Deal Pass Reason Capture" item; bumped "Last updated" to 2026-04-23.
- `PROJECT_OPERATING_LOG.md` — this entry; Current Status date bumped to 2026-04-23 with a side note.

**Next action:**
- Return focus to the main roadmap — Phase 3 ingestion implementation. The three Phase 3 blockers (Vercel Pro confirmation, `BLOB_READ_WRITE_TOKEN`, user approval of the implementation plan) still gate start. No further analytics / KPI / reason-capture work until M4.

---

### 2026-04-22 — Tier 1 aesthetic port: LSG design tokens, Geist fonts, wordmark, accent consistency

**What happened:**
- Ported the Tier 1 visual foundation from `examples/DESIGN_TOKENS.md` into the code project. Single-accent red system, warm grayscale, Geist typography. No Tier 2 or Tier 3 work.
- Follow-up pass (Tier 1.1) cleaned up remaining hardcoded hover/destructive colors so the new red accent doesn't clash on interaction.

**Changes made:**
- Added `src/styles/tokens.css` — the Tier 1 token file: `--lsg-red` ramp, warm surfaces (`--lsg-canvas` `#FAFAF8`, `--lsg-surface`, `--lsg-surface-alt`, `--lsg-surface-sunk`), text scale, borders, semantic positive/warning, Geist `--font-sans` / `--font-mono`, and compatibility aliases `--accent` `--text` `--muted` `--surface` `--border` so existing `App.jsx` consumers pick up the new palette without a refactor. Wordmark CSS (`.wordmark`, `.wordmark-primary`, `.wordmark-secondary`) lives in the same file.
- `src/main.jsx` — imports `tokens.css` after `style.css` so the compatibility aliases win the cascade.
- `index.html` — replaced DM Sans `<link>` with Google Fonts preconnect + `Geist` (300/400/500/700) + `Geist Mono` (400/500).
- `src/style.css` — body now uses `var(--lsg-canvas)` / `var(--lsg-text-primary)` / `var(--font-sans)` with fallbacks; legacy `--bg` updated to `#FAFAF8`; non-aliased vars (`--surface2` `--surface3` `--border2` `--dim` `--sh` `--sh-lg`) preserved for existing consumers.
- `src/App.jsx` header — replaced the "L" square + "Lightstone / Retail Pipeline · Acquisitions" block with the `LIGHTSTONE / PIPELINE` wordmark (red primary, tertiary-gray secondary).
- Accent consistency fixes (Tier 1.1): Add Deal and Save Deal primary-button hovers swapped from `#2d2b28` (old near-black) to `var(--lsg-red-deep)`; per-row delete icon border/text and delete-confirmation modal CTA moved off hardcoded Tailwind reds (`#dc2626` / `#fecaca` / `#fef2f2` / `#b91c1c`) to `var(--lsg-red)` / `var(--lsg-red-deep)` / `var(--lsg-red-subtle)`.

**What was explicitly NOT touched:**
- No feature work, no new views, no Tier 2 components (KPI strip, section-header signature, row treatment, status pill map, priority badges), no Tier 3 polish (sidebar restructure, filter chips, soft placeholders, maturity indicators).
- No schema changes (`db/schema.sql` untouched), no API changes (`api/ingest-om.js`, `api/blob-upload.js` untouched), no Supabase changes, no mapper changes (`src/lib/dealMapper.js` untouched).
- No Phase 3 ingestion logic touched. Phase 3 blockers (Vercel Pro, `BLOB_READ_WRITE_TOKEN`, implementation-plan approval) are unchanged and remain the gating items.
- Locked Decisions, milestones, phase definitions, and the Do Not Overbuild list are all unchanged.

**Known bridge to be removed in Tier 2:**
- `tokens.css` contains a temporary rule `[style*="tabular-nums"] { font-family: var(--font-mono); }`. This was used to promote existing numeric table cells to Geist Mono without a component-markup refactor. It is fragile (string-matches inline-style serialization) and should be replaced in Tier 2 with explicit `.numeric` / `data-numeric` classes on KPI, table-numeric, and maturity-proximity cells — applied at the same time as the Tier 2 row treatment work. Do not build new features on top of the attribute selector.

**Acceptance check:**
- App renders identically in functionality. Header shows the new wordmark. Body background is warm `#FAFAF8`. Geist + Geist Mono load via Google Fonts. Vite HMR reports no errors across all edits. No existing `--accent` / `--text` / `--muted` / `--surface` / `--border` consumer breaks.

**Files changed:**
- `src/styles/tokens.css` (new)
- `src/main.jsx`
- `index.html`
- `src/style.css`
- `src/App.jsx` (header wordmark + primary-button hover fixes + delete-button token migration)
- `PROJECT_OPERATING_LOG.md` — this entry

**Next action:**
- Return focus to the main roadmap — Phase 3 ingestion implementation. The three Phase 3 blockers in Current Status still gate start. Aesthetic work stops here until the Tier 2 task is explicitly scoped, post-Phase-3.

---

### 2026-04-22 — Advisor review: left navigation rail / app-shell direction (deferred, docs-only)

**What happened:**
- A left sidebar / workspace navigation rail reference was reviewed as a potential future direction for the app layout (Ingest / Pipeline / Compare / One Pager / Support surfaced as rail destinations)
- Direction is strategically interesting — stronger workspace feel, clearer IA as modules mature, better long-term navigation once more sections are real
- Intentionally deferred to avoid an app-shell redesign during current Phase 3 / Phase 4 work. A navigation overhaul while modules are still in flux would be churn

**Current decision:**
- Preserve existing top-nav layout for now — no app-shell or sidebar work in Phase 3 or Phase 4
- This is a governance decision, not a UI tweak — scoping belongs to the advisor, not an implementation session

**Future action:**
- Revisit after M4 (merged v1 complete) once the active modules are finalized
- If promoted, move the item from BACKLOG.md into TASKS.md with explicit scope and acceptance criteria, per the BACKLOG.md Promotion Criteria

**Governance note:**
- No code, no layout, no UI changes made in this session
- Docs-only update: new "Application Shell / Left Navigation Rail" entry added to BACKLOG.md; this log entry recording the advisor decision
- TASKS.md intentionally not touched — nothing is being promoted yet
- Phase definitions, milestones, blockers, and Locked Decisions unchanged

**Files changed:**
- `BACKLOG.md` — added "Application Shell / Left Navigation Rail" deferred item; bumped "Last updated" to 2026-04-22
- `PROJECT_OPERATING_LOG.md` — this entry

---

### 2026-04-17 — End-of-day handoff: meeting-polish UI pass (no Phase 3 code touched)

**Session summary (front-end-only, presentation-oriented work):**

1. **Pipeline table formatting fixes** (`src/App.jsx`)
   - Added two display-layer helpers: `formatUSD` (renders `$20,000,000` form, returns em-dash for non-numeric values like `"Best Offer"`) and `formatWalt` (regex-extracts first decimal, formats to one decimal place, strips `±` and unit suffixes).
   - Purchase Price cell now matches surrounding numeric cells visually — removed `fontWeight:500` and `color:'var(--text)'` so it uses the same `color:'var(--muted)'` as NOI / Cap Rate / Bid Date.
   - WALT renders as `4.8` / `24.4` (no `±`, no `Yrs.`). Sort behavior unchanged — still uses raw strings via `parseSortable`.
   - No changes to stored values, `dealMapper.js`, Supabase, or any form input.

2. **ONE PAGER tab (mock presentation page)** (`src/App.jsx`)
   - Added a new `ONEPAGER` tab between COMPARE and SUPPORT.
   - Layout adapted from `examples/lsg_one_pager_v4.html`: dark `#111` uppercase section-header strip, three-box head row (Property / Transaction / Scorecard), 3-column main grid of section cards, "Confidential & Proprietary — LIGHTSTONE" footer strap.
   - Typography bumped from the example's print sizes (7.5–9px) to screen-readable 9–11px. Dropped the example's layout editor, drag-drop, API inputs, upload zone, cash-flows table, and all generation mechanics.
   - Sections populated from real top-level fields only: Property (assetType/sf/acreage/vintage/parking/occupancy+WALT), Transaction (stage/broker/bidDate/sourceFiles), Summary Metrics (all six core fields), Market & Submarket (market only), Sources & Uses (purchase price only), Key Anchors (split from `keyAnchors`), Notes.
   - Scorecard, Returns Summary, Capital Sources, and most of Sources & Uses are intentional placeholders with an italic "data not yet modeled" note — no fabricated tenant rosters, returns, or debt details.
   - Deal selection is a local dropdown in the action bar; defaults to the most recent deal (`deals[0]`). Pipeline row-click → edit-modal behavior is unchanged.
   - Action-bar buttons (Layout / Edit Data / DB Sync / Clear / Print / Export PDF) are rendered `disabled` with "Not yet wired" tooltips — visible but non-functional, per meeting-demo scope.
   - **This is NOT Phase 4 implementation.** The "One-pager generation" backlog item remains deferred. No `api/generate-memo.js`, no print logic, no PDF export, no Repo A logic ported.

3. **Support tab polish** (`src/App.jsx`)
   - Flipped `SupportCard`'s `defaultOpen` default from `true` → `false`. All four cards (Screening Hurdles, Supabase Setup Guide, Anthropic API Key, Project Status) now start collapsed on tab entry. Expand/collapse behavior unchanged.
   - Rewrote the "Project Status & Next Steps" card to reflect current reality: Phase 3 preflight complete, awaiting implementation approval. Replaced stale "Refinement / Validation" / "Fast-pass OM extraction" copy with Current Phase, Overall Status (Phase 1 ✓ / Phase 2 ✓ / Phase 3 preflight ✓ / Phase 3 implementation pending), Recently Completed (4 items), Blockers Before Phase 3 Implementation (the 3 blockers from Current Status above — amber warning styling), and Immediate Next Steps (the 6 open Phase 3 tasks from TASKS.md).
   - Removed the "What Is Working Now" and "Deferred / Later" blocks — redundant with the phase-status indicators and violated the "don't mention deferred features" instruction.

**What was NOT touched this session:**
- `api/ingest-om.js`, `api/blob-upload.js` — Phase 3 implementation is still blocked on the three items in Current Status.
- `src/lib/dealMapper.js`, `src/lib/supabase.js`, `db/schema.sql` — no schema, mapping, or persistence changes.
- `vercel.json` — `maxDuration` still 60s; Phase 3 requires 120s but that change hasn't been made.
- TASKS.md, BACKLOG.md, PRD.md, MERGE_PLAN.md — Phase 3 task list, backlog deferrals, and merge plan are intentionally untouched.
- Locked Decisions — all 8 still in force. Side-by-side comparison and AI screener remain on the Do Not Overbuild list for their real-feature implementations; the UI shells built during this session do not promote either backlog item.

**Pipeline state at handoff:**
- Branch: `main`, pushed to `origin/main`.
- Phase 1 complete ✓ | Phase 2 complete ✓ | Phase 3 preflight complete, implementation not started.
- Milestone 1 (add → Supabase → refresh → edit → delete) confirmed and working in deployed Vercel environment.
- Three Compare tab / One Pager / Pipeline-formatting UI shells are live for the upcoming demo but do not constitute production feature work.

**Resume next session by:**
- Resolving the three Phase 3 blockers (Vercel Pro confirmation, `BLOB_READ_WRITE_TOKEN`, user approval of the implementation plan).
- Then beginning the six Phase 3 tasks in order — starting with the `api/ingest-om.js` preservation commit.

**Files changed this session:**
- `src/App.jsx` — all edits listed above.
- `PROJECT_OPERATING_LOG.md` — this entry + Current Status date.

---

### 2026-04-17 — Compare tab UI shell (meeting demo only — NOT a scope change)

**What happened:**
- Built a presentation-ready Compare tab UI in `src/App.jsx` to replace the "coming soon" placeholder for an upcoming meeting demo
- Added a `CompareTab` component with: header ("Side-by-Side Comparison" + "Select 2–3 deals to compare"), three deal dropdowns (A / B / C-optional) with cross-slot duplicate prevention, Clear button, empty state, and a 14-row comparison grid (Property Name, Address, Market, Asset Type, SF, Occupancy, WALT, Purchase Price, Going-In Cap Rate, NOI, Broker, Bid Date, Stage, Notes)
- Follow-up pass: switched the comparison grid to `table-layout: fixed` with an explicit `<colgroup>` — first column fixed at 180px, remaining deal columns each `calc((100% − 180px) / N)` so 2-deal and 3-deal views are always evenly distributed regardless of cell content
- Reuses existing `StageBadge` for the Stage row; matches existing CSS variables (`--surface`, `--border`, `--accent`, etc.); em-dash for missing values

**What this is NOT:**
- Not the "Side-by-Side Deal Comparison" backlog item — that remains deferred until post-M4 per BACKLOG.md
- No backend, persistence, API, schema, export, analytics, or screener logic was introduced
- Purely a front-end render of existing in-memory `deals` state
- Compare-tab selection is local component state and resets on tab switch (intentional — no new persistence)

**Governance note:**
- Locked Decision "Side-by-side deal comparison" in the Do Not Overbuild list remains in force for the real feature
- This UI shell was explicitly scoped and authorized as a meeting-only presentation pass
- No changes to TASKS.md, BACKLOG.md, PRD.md, or MERGE_PLAN.md
- Phase 3 implementation remains blocked on the three items listed in Current Status

**Files changed:**
- `src/App.jsx` — added `CompareTab` component + `COMPARE_ROWS` / `dealLabel` helpers; replaced the placeholder block under `activeTab === 'COMPARE'`

---

### 2026-04-16 — Phase 3 preflight: Repo A source inspection and implementation plan

**What happened:**
- Repo A source files pulled from GitHub and inspected in full: `lsg_ingest(1).html`, `lsg_one_pager(4).html`
- All 5 MERGE_PLAN.md open questions answered (see below)
- Phase 3 implementation plan produced — field map, API contract, file change list, conflict log, implementation order
- Locked decisions C1–C5 established for Phase 3 ingestion contract

**Answers to the 5 MERGE_PLAN.md open questions:**

1. **Exact column names and types in schema v2.0:** Confirmed in prior session via user-provided authority. snake_case, NUMERIC for financial fields, JSONB for raw_data, TEXT[] for source_files — already applied in db/schema.sql.

2. **Superset or subset of Repo B's 18 fields:** Repo A schema v2.0 is a major superset. The 18 Repo B fields are a shallow subset. Repo A's raw_data JSONB contains deeply nested structures for tenants, cash flows, market, demographics, returns, capital stack, and more. The 18 Repo B UI fields map to a small fraction of the Agent 2 output schema. Field map produced in Phase 3 preflight plan (see below).

3. **Two-agent pattern — two calls or one:** Two sequential Anthropic API calls. Agent 1 (Reader): narrative text output, `max_tokens: 8000`. Agent 2 (Standardizer): LSG schema JSON output, `max_tokens: 16000`. Model for both: `claude-sonnet-4-6`.

4. **Supabase Auth or anon key:** Anon key only. No auth. RLS is deliberately disabled (single-tenant internal tool). Confirmed in source: `'apikey': key` where key is the anon public key.

5. **One-pager output format:** Rendered HTML (landscape print-optimized, 4-column layout). Built dynamically via `buildOP(d)` from `raw_data` JSONB. Exported to PDF via browser print dialog. Phase 4 will port this as `api/generate-memo.js`.

**Phase 3 field map (Agent 2 raw_data → Repo B UI form):**

| UI field (camelCase) | Source in raw_data (Agent 2 schema) | Notes |
|---|---|---|
| propertyName | `raw.deal_name` (top-level) | Agent 2 top-level key |
| propertyAddress | `raw.address` (top-level, concatenated) | Agent 2 concatenates address+city+state |
| market | `raw.market.submarket` | raw.market is an object — string check required in fromDbRow |
| assetType | `raw.property.type` | |
| sf | `raw.property.size_sf` | |
| acreage | `raw.property.acreage` | |
| yearBuiltRenovated | `raw.property.vintage` | |
| parkingCount | `raw.property.parking_ratio` | |
| occupancy | `raw.property.occupancy` | |
| walt | `raw.property.walt` | |
| askingPrice | **blank** | Analyst-owned; `sources_uses.purchase_price` present in raw_data for reference only |
| noi | `raw.cash_flows.noi[0]` (first year) | Array; take first non-null value |
| capRate | **blank** | Analyst-owned; `returns.going_in_cap` present in raw_data for reference only |
| broker | `raw.transaction.sourcing` | |
| keyAnchors | derived from `raw.top_tenants[0..2].name` | Join first 3 names |
| bidDate | `raw.transaction.bid_deadline` or `raw.transaction.call_for_offers` | |
| notes | `raw.investment_thesis.broker_headline` | |
| stage | `row.status` (scalar column) | |

**Phase 3 conflicts logged (C1–C5):**

| # | Field | Repo A behavior | Locked decision | Resolution |
|---|---|---|---|---|
| C1 | purchase_price | Extracted and stored as NUMERIC scalar | Analyst-owned — null after ingest | Null in scalar; value preserved in raw_data.sources_uses.purchase_price |
| C2 | going_in_cap | Extracted and stored as NUMERIC scalar | Analyst-owned — null after ingest | Null in scalar; value preserved in raw_data.returns.going_in_cap |
| C3 | schema_version | Repo A writes '2.0' | toDbRow writes '1.0' | Ingest route writes '2.0'; toDbRow stays '1.0' — clean distinction |
| C4 | model string | claude-sonnet-4-6 | Current Repo B: claude-3-5-sonnet-20241022 | Update to claude-sonnet-4-6 |
| C5 | screen column | Repo A patches screen JSONB after screener | Column not in our schema | Defer to screener phase |

**Locked rules for Phase 3 implementation (set this session):**
1. raw_data = Agent 2 normalized output only; _reader_narrative explicitly deleted before storage
2. conflict_flags and extraction_meta preserved in raw_data as-is
3. purchase_price and going_in_cap scalars are always null after ingest (analyst-owned)
4. After ingest succeeds, newly created deal auto-opens in edit modal — extracted fields visible, analyst-owned fields blank
5. source_files = [filename] set by ingest route from request body, not extracted from OM
6. Vercel maxDuration for ingest route must increase to 120s (requires Pro plan)
7. No screener, no one-pager in Phase 3

**Phase 3 API contract (pending user approval):**
- Request: POST /api/ingest-om → { filename, url }
- Success: { ok: true, dealId, fieldsPopulated, conflicts, confidence }
- Error: { ok: false, error, stage: 'reader|standardizer|save' }
- Frontend: receive dealId → re-fetch Supabase → find deal → open edit modal
- No extracted field values returned to frontend

**Known limitation noted:**
- After analyst's first edit+save of a v2-ingested deal, raw_data.market (Agent 2 object) is overwritten with a string via buildRawData. Market subfields (gs_grade, avg_rent_growth, etc.) are lost from top-level. Submarket string is preserved. Acceptable for v1.

---

### 2026-04-16 — Semantic correction + validation-prep pass

**What happened:**
- UI labels updated: "Asking Price" → "Purchase Price", "Cap Rate" → "Going-In Cap Rate"
- Table column labels updated to match
- Placeholders updated to say "Analyst-entered" for both fields
- handleIngest: removed askingPrice and capRate from auto-fill (locked decision: analyst-owned)
- handleIngest: added sourceFiles population with omFile.name on successful extraction
- dealMapper.js: raw_data is now patched on update (not overwritten) — existing keys preserved
- dealMapper.js: fromDbRow passes raw_data and sourceFiles through to form state
- dealMapper.js: toDbRow maps source_files from form.sourceFiles
- dealMapper.js: all comments updated to reflect locked decisions

**Locked decisions applied:**
- purchase_price = analyst-entered; OM extraction deliberately skips it
- going_in_cap = analyst-entered; OM extraction deliberately skips it
- source_files stores filenames for v1; richer provenance deferred
- raw_data is patched on edit, not replaced

**Milestone 1 validation target:**
1. Open app → loading state → empty state
2. Manually add deal with Purchase Price and Going-In Cap Rate
3. Deal saves to Supabase with correct scalar values and raw_data
4. Refresh → deal persists with all fields intact
5. Edit deal → raw_data is patched, not overwritten
6. Upload OM → Purchase Price and Going-In Cap Rate fields left blank for analyst
7. Analyst fills in Purchase Price and Going-In Cap Rate → saves
8. Delete deal → removed from Supabase

---

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
