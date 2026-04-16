# Merge Plan — Retail Deal Pipeline & Screener
**Version:** 1.0
**Last Updated:** 2026-04-16
**Status:** Approved, pre-execution

---

## Decision Summary

| Decision | Choice | Rationale |
|---|---|---|
| Structural base repo | Repo B (this repo) | Has working UI shell, Vercel deployment config, serverless API layer |
| Logic/schema authority | Repo A | Has Supabase schema v2.0, two-agent extraction, one-pager logic |
| Field schema authority | Repo A schema v2.0 | More complete, database-backed |
| Extraction pattern authority | Repo A (two-agent) | Supersedes Repo B single-agent ingest-om.js |
| Supabase design authority | Repo A | JSONB + scalar index design |
| Pipeline UI authority | Repo B | Working, correct shape, authoritative stage vocabulary |
| Deployment platform | Vercel | Repo B already configured; Repo A logic ports into Vercel Functions |

---

## Why Repo B Is the Structural Base

- Only repo with a working React frontend
- Vercel deployment already configured (vercel.json with correct timeouts)
- Two serverless API routes already wired (api/ingest-om.js, api/blob-upload.js)
- Pipeline UI — table, stages, sort, filter, stat cards — is complete and working
- The physical repo that will be deployed; adding Repo A assets is additive, not a replacement

## Why Repo A Is the Logic/Schema Authority

- Has authoritative Supabase schema (v2.0) with JSONB + scalar index design
- Has two-agent extraction pattern that supersedes Repo B's single-agent approach
- Has one-pager / IC memo generation logic not present in Repo B at all
- Schema v2.0 is more complete than Repo B's 18-field App.jsx vocabulary

---

## Assets From Repo A: What Gets Ported

| Asset | Action | Destination |
|---|---|---|
| Supabase schema / migration files | Port | `/db/schema.sql` or `/supabase/migrations/` |
| Supabase client setup | Port | `src/lib/supabase.js` |
| Two-agent extraction logic | Replace `api/ingest-om.js` | Keep blob-upload.js; replace ingest logic only |
| One-pager generation | Port as new route | `api/generate-memo.js` |
| System prompt(s) for extraction | Port verbatim | Do not rewrite prompts during merge |
| Field schema v2.0 column names | Resolve against Repo B PIPELINE_COLUMNS | Repo A wins if superset; document any conflicts |
| New environment variables (Supabase URL, anon key) | Add | `.env.example` |

## Assets From Repo B: What Stays Authoritative

| Asset | Status | Notes |
|---|---|---|
| `vercel.json` | Authoritative | Timeout values are correct; do not overwrite blindly |
| `api/blob-upload.js` | Authoritative | Vercel Blob staging; Repo A likely has no equivalent |
| Pipeline UI shape | Authoritative | Decompose App.jsx during merge but preserve UI patterns |
| `STAGES` array | Authoritative | Pipeline stage vocabulary; reconcile if Repo A differs |
| `ASSET_TYPES` array | Authoritative | Retail CRE taxonomy; reconcile if Repo A differs |
| Tailwind v3 + PostCSS config | Authoritative | Intentional choice for Vercel compatibility |
| Vite config and React setup | Authoritative | Do not replace with non-Vite build tooling |

## What Gets Dropped

| Asset | Reason |
|---|---|
| `localStorage` persistence in App.jsx | Replaced by Supabase in Phase 2 |
| `lsg-pipeline-v1` localStorage key | Do not migrate; clean Supabase start |
| `dist/` in version control | Add to .gitignore |
| Repo B's single-agent ingest prompt | Replaced by Repo A two-agent pattern |
| README inline feature wish-list | Moved to BACKLOG.md |

---

## Canonical Authority Decisions (Locked)

These decisions are final for the merge. Do not re-litigate in implementation sessions.

1. **Repo A schema v2.0 is authoritative** for the Supabase deals table structure
2. **Repo A JSONB + scalar index design is authoritative** for Supabase column design
3. **Repo A two-agent extraction pattern is authoritative** for the ingest-om.js replacement
4. **Repo B pipeline UI pattern is authoritative** for frontend layout and stage vocabulary
5. **Vercel is the deployment platform** — do not introduce Docker, Railway, or other platforms
6. **Tailwind v3 stays** — do not upgrade to v4 during this merge

---

## Phased Merge Sequence

### Phase 1 — Planning artifacts and base repo setup
**Gate:** All planning docs committed, repo clean, open questions answered

- Create PRD.md, MERGE_PLAN.md, PROJECT_OPERATING_LOG.md, TASKS.md, BACKLOG.md
- Commit api/blob-upload.js uncommitted changes
- Create .env.example
- Add dist/ to .gitignore
- Inspect Repo A and answer the 5 open questions below
- Resolve field schema: compare Repo A v2.0 against Repo B PIPELINE_COLUMNS

### Phase 2 — Supabase integration (replace localStorage)
**Gate:** Deal survives page refresh; no localStorage in codebase

- Install @supabase/supabase-js
- Create src/lib/supabase.js
- Port Repo A schema v2.0 → /db/ or /supabase/
- Create deals table in Supabase
- Replace all localStorage operations with Supabase CRUD

### Phase 3 — Port Repo A extraction/schema logic
**Gate:** Upload PDF → extract → stored in Supabase → visible in UI

- Replace api/ingest-om.js with Repo A two-agent extraction logic
- Align extracted field names with Supabase schema v2.0
- Update endpoint to write directly to Supabase
- Update UI to refresh from Supabase after ingest

### Phase 4 — Port one-pager generation
**Gate:** Select deal → generate one-pager → renders correctly

- Create api/generate-memo.js from Repo A logic
- Add route to vercel.json (60s timeout)
- Add one-pager trigger to deal edit modal or deal row

### Phase 5 — End-to-end validation
**Gate:** All 6 PRD success criteria pass in deployed Vercel environment

- Deploy to Vercel
- Run full round-trip: upload → extract → store → display → edit → one-pager
- Grep for localStorage — must return zero matches
- Update PROJECT_OPERATING_LOG.md: mark M4 complete

---

## Open Questions Before Phase 2 Starts

These must be answered by inspecting Repo A. Do not begin Phase 2 until all are resolved.

1. What are the exact column names and types in Repo A's schema v2.0?
2. Does Repo A's schema include all 18 fields from Repo B's PIPELINE_COLUMNS, or is it a subset/superset?
3. What does Repo A's two-agent extraction pattern look like — two separate API calls, two Claude messages in one call, or something else?
4. Does Repo A use Supabase Auth, or is it anonymous/service-role key access?
5. What does Repo A's one-pager output — markdown, HTML, or a rendered component?

Document answers in a new PROJECT_OPERATING_LOG.md entry before Phase 2 begins.

---

## Rollback and Safety Notes

- Do not delete Repo A. Keep it available and readable throughout Phases 2–4.
- Before replacing api/ingest-om.js, commit the current working version with a clear commit message.
- Before Phase 2, export any real deal data from localStorage to `/fixtures/deals-export.json`. Do not auto-migrate to Supabase — re-enter or re-ingest those deals.
- If Repo A schema v2.0 conflicts with Repo B's 18 fields in a way not covered by this document, stop and log it in PROJECT_OPERATING_LOG.md. Do not resolve silently in code.
- Phase gates are hard stops. Do not begin Phase 3 until Phase 2 gate passes.
