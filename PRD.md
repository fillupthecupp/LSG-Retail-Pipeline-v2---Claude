# PRD — Retail Deal Pipeline & Screener
**Version:** 1.0 (Merged Product)
**Last Updated:** 2026-04-16
**Status:** Pre-merge planning

---

## Problem Statement

Retail CRE acquisitions teams receive offering memoranda as PDFs, manually key deal data into spreadsheets, and track pipeline state informally. This creates data entry friction, inconsistent deal records, no durable history, and no centralized pipeline view. Screening decisions are made without a structured one-pager or unified data model.

---

## Primary User

Acquisitions analyst or principal at LSG — a retail-focused CRE investment firm. Single-tenant internal tool. Not a broad SaaS product.

---

## Workflow This Product Supports

1. Receive OM PDF from broker
2. Upload PDF — AI extraction populates deal fields automatically
3. Deal is stored in Supabase and appears in the pipeline tracker
4. User reviews and edits extracted fields
5. Generate IC memo / one-pager from deal record
6. Track deal through pipeline stages: Screening → Underwriting → Bid → Active → Dead

---

## 5 Product Layers

| Layer | Description | Source Authority |
|---|---|---|
| 1. OM Ingest | PDF upload → Claude extraction → structured JSON | Repo A (two-agent pattern) |
| 2. Structured Supabase Store | Deals table with scalar + JSONB columns | Repo A (schema v2.0) |
| 3. AI Screener | Pass/fail hurdle rate evaluation | Deferred — see BACKLOG.md |
| 4. IC Memo / One-Pager | Claude-generated deal summary from structured record | Repo A |
| 5. Live Pipeline Tracker UI | Table, stages, sort, filter, stat cards, modal form | Repo B |

---

## MVP v1 Scope

### Included in merged v1

- PDF OM upload via Vercel Blob
- Claude-powered field extraction (two-agent pattern from Repo A)
- Supabase persistence (Repo A schema v2.0)
- Live pipeline tracker UI: sortable table, stage filter, search, stat cards
- Editable deal record (all fields from resolved schema)
- One-pager / IC memo generation per deal
- 5-stage pipeline: Screening → Underwriting → Bid → Active → Dead
- Single-user (no auth complexity)

### Explicitly out of scope for v1

- Advanced AI screener with hurdle rate modeling (IRR, CoC, cap rate pass/fail)
- Side-by-side deal comparison
- Multi-user access, team permissions, or Supabase Auth
- Export to Excel or PDF pipeline report
- Email or Slack notifications
- Historical deal performance tracking
- Market comps or external data feeds
- Mobile-optimized UI
- Analytics beyond the 4 existing stat cards

---

## Success Criteria

1. A user can upload an OM PDF and have all extractable fields populated without manual typing
2. A deal survives a page refresh (Supabase persistence — no localStorage)
3. A user can edit any deal field and save it back to Supabase
4. A user can generate a one-pager for any deal with one action
5. The pipeline table shows all deals with correct stage, sortable by any column
6. The product is deployed and functional on Vercel

---

## What "Done" Means for Merged v1

All 6 success criteria pass in a deployed Vercel environment.
No localStorage reads or writes remain in the codebase.
One-pager generation works on at least one real deal record.
No known data loss on page refresh or session end.

---

## What Is Not Required for v1 Completion

- AI screener or hurdle rate badges
- Comparison views
- Auth or multi-user
- Any feature in BACKLOG.md
