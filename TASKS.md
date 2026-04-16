# Tasks — Retail Deal Pipeline & Screener
**Active phases only. Deferred work goes to BACKLOG.md.**
**Last updated:** 2026-04-16 (Phase 3 preflight complete)

---

## Phase 1 — Planning artifacts and base repo setup
**Goal:** Clean, documented base repo ready for merge execution
**Gate:** All tasks complete, repo is clean, open questions answered, field schema conflict resolved

- [x] Create PRD.md
- [x] Create MERGE_PLAN.md
- [x] Create PROJECT_OPERATING_LOG.md
- [x] Create TASKS.md
- [x] Create BACKLOG.md
- [x] Commit api/blob-upload.js (committed in Phase 1 session)
- [x] Create .env.example with: `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [x] Add `dist/` and `node_modules/` to .gitignore
- [x] Inspect Repo A and answer the 5 open questions in MERGE_PLAN.md (answered via source inspection + user authority — logged in PROJECT_OPERATING_LOG.md 2026-04-16)
- [x] Compare Repo A schema v2.0 columns against Repo B PIPELINE_COLUMNS; document resolution in PROJECT_OPERATING_LOG.md (field map produced in Phase 3 preflight plan)

---

## Phase 2 — Supabase integration (replace localStorage)
**Goal:** Deals are stored in and read from Supabase; localStorage is fully removed
**Gate:** Deal survives a page refresh; `grep -r 'localStorage'` returns zero matches in src/

- [x] Install @supabase/supabase-js
- [x] Create `src/lib/supabase.js` — Supabase client initialization using env vars
- [x] Create `db/schema.sql` — Repo A authority: snake_case, NUMERIC fields, raw_data JSONB
- [x] Create `src/lib/dealMapper.js` — fromDbRow / toDbRow with semantic renames and parseNumeric
- [x] Create deals table in Supabase project (run db/schema.sql in Supabase SQL editor)
- [x] Replace `localStorage.setItem` in `addDeal()` with Supabase insert
- [x] Replace `localStorage.setItem` in `saveDeal()` with Supabase update
- [x] Replace `localStorage.removeItem` in `deleteDeal()` with Supabase delete
- [x] Replace `localStorage.getItem` on initial load with Supabase select
- [x] Remove all remaining localStorage references from App.jsx
- [x] Test: add deal → refresh page → deal persists ✓ edit ✓ delete ✓ — MILESTONE 1 COMPLETE

**Note:** Decompose App.jsx into components naturally as part of this phase — not as a separate sprint. Minimum decomposition: `useDeals` hook, `DealTable` component, `DealForm` component.

---

## Phase 3 — Port Repo A extraction/schema logic
**Goal:** PDF ingest uses Repo A's two-agent pattern and writes directly to Supabase
**Gate:** Upload PDF → extract → row in Supabase → deal opens in edit modal → analyst-owned fields blank

**Blocker:** Vercel plan must be Pro (300s max) — two-agent flow exceeds 60s Hobby limit. Confirm before deploying.
**Blocker:** `BLOB_READ_WRITE_TOKEN` must be set in `.env.local` and Vercel dashboard before end-to-end testing.

- [x] Read and understand Repo A's two-agent extraction pattern (lsg_ingest(1).html inspected 2026-04-16)
- [ ] Commit current `api/ingest-om.js` — "chore: preserve Repo B single-agent ingest before Phase 3 replacement"
- [ ] Replace `api/ingest-om.js` — READER_SYSTEM + STANDARDIZER_SYSTEM prompts (verbatim), two-agent flow, Supabase write
- [ ] Update `vercel.json` — ingest route maxDuration: 60 → 120
- [ ] Update `fromDbRow` in `src/lib/dealMapper.js` — additive v2 schema fallbacks only (see field map in log)
- [ ] Update `handleIngest` in `src/App.jsx` — receive dealId → re-fetch Supabase → open edit modal
- [ ] Test: upload PDF → Supabase row appears → deal opens in edit modal
- [ ] Verify: `purchase_price` null in DB row (analyst-owned, not extracted)
- [ ] Verify: `going_in_cap` null in DB row (analyst-owned, not extracted)
- [ ] Verify: `raw_data` contains full Agent 2 output with no `_reader_narrative` key
- [ ] Verify: `source_files` contains filename
- [ ] Verify: analyst enters Purchase Price and Going-In Cap Rate → save → full round-trip completes

---

## Phase 4 — Port one-pager generation
**Goal:** User can generate an IC memo / one-pager for any deal from the UI
**Gate:** Select any deal with complete fields → generate one-pager → output renders correctly

- [ ] Read and understand Repo A's one-pager generation logic before touching any code
- [ ] Create `api/generate-memo.js` from Repo A logic
- [ ] Add `api/generate-memo.js` entry in `vercel.json` (60s timeout)
- [ ] Add one-pager trigger (button) in deal edit modal or deal table row
- [ ] Display generated one-pager — modal, drawer, or new view depending on output format
- [ ] Test: open deal with complete Supabase-sourced fields → generate one-pager → output is coherent and complete

---

## Phase 5 — End-to-end validation
**Goal:** All 6 PRD success criteria pass in deployed Vercel environment
**Gate = Merged v1 complete**

- [ ] Deploy current state to Vercel (production or preview URL)
- [ ] Run full round-trip: upload PDF → extract → Supabase → display → edit → save → one-pager
- [ ] Verify all extractable fields survive the full cycle
- [ ] Confirm one-pager generates from a real Supabase deal record (not fixture)
- [ ] `grep -r 'localStorage' src/` — must return zero matches
- [ ] `grep -r 'localStorage' api/` — must return zero matches
- [ ] Confirm `dist/` is not tracked in git
- [ ] Check all 6 PRD success criteria, mark each pass/fail
- [ ] Add log entry to PROJECT_OPERATING_LOG.md marking M4 complete
- [ ] Update TASKS.md: mark Phase 5 complete

---

## Notes for Claude Code Sessions

- Do not begin a phase until the previous phase's gate condition is met
- If you find a conflict between Repo A schema and Repo B fields not covered by MERGE_PLAN.md, stop and log it in PROJECT_OPERATING_LOG.md — do not resolve it silently in code
- Do not add features not listed in the current phase's task list
- If App.jsx decomposition goes beyond minimum necessary for the current phase's tasks, stop — it is not a standalone goal
- The `STAGES` and `ASSET_TYPES` constants in App.jsx are authoritative vocabulary; do not rename or reorder them without an explicit log entry
