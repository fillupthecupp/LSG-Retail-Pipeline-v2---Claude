# Backlog — Retail Deal Pipeline & Screener
**Deferred features. None of these are in scope for merged v1.**
**Promote an item to TASKS.md only after M4 (v1 complete) and with explicit advisor scoping.**
**Last updated:** 2026-04-23

---

## AI Screener — Hurdle Rate Modeling

Pass/fail evaluation against configurable thresholds:
- Cap rate ≥ threshold (e.g., 8.5%)
- IRR ≥ threshold (e.g., 15%)
- Cash-on-cash ≥ threshold (e.g., 10%)

Stage-level pass/fail badge or flag on pipeline table rows.

**Dependency:** Reliable IRR and CoC data in deal records. These fields are often absent from OMs and may require manual input or underwriting model integration. Do not build this until the data quality problem is understood.

---

## Side-by-Side Deal Comparison

Select 2–3 deals, view fields in parallel columns.

**Dependency:** Stable, complete deal schema and clean Supabase data from real OMs. Build after M4 when real deal records exist.

---

## Hurdle Rate Badge UI

Visual pass/fail indicator on pipeline table rows (green check / red X per metric).

**Dependency:** AI Screener logic above must exist first.

---

## Export and Reporting

- Export pipeline to Excel or CSV
- PDF pipeline report (all deals, filtered by stage)
- Scheduled email summary

---

## Analytics Beyond Stat Cards

- Deal velocity (time from Screening to Bid)
- Stage conversion rates
- Broker source analysis
- Time-in-stage metrics
- Cohort views

---

## Multi-User and Team Features

- Supabase Auth integration
- Role-based access (read-only vs. edit)
- User attribution on deal edits and notes
- Deal assignment or ownership

**Note:** v1 is single-user. Do not add auth complexity during or before the merge.

---

## Deal Detail and Abstract View

- Expanded read-only deal view beyond the edit modal
- Deal activity history / change log
- Multiple OM attachments per deal

---

## Market Comps and External Data

- Comparable sales integration
- Market cap rate benchmarks by submarket
- CoStar or similar data feed

---

## Mobile-Optimized UI

Current UI is desktop-first. A responsive redesign for phone/tablet would require significant layout work. Defer until v1 is stable.

---

## Notification and Workflow Automation

- Email or Slack alert as bid date approaches
- Broker follow-up reminders
- Stage change notifications

---

## Dead Deal Pass Reason Capture

Capture structured reasons when a deal moves to the Dead stage, so "why we passed" becomes queryable institutional memory instead of living only in free-text notes or analyst recall.

**Purpose:**
- Explicit reason-capture on stage transition to Dead (Screening/Underwriting/Bid/Active → Dead)
- Structured enough to aggregate (KPI decomposition, source analysis) without losing the nuance of free-text detail

**Rationale:**
- Improves sourcing intelligence — broker-by-broker and market-by-market kill-reason patterns become visible
- Improves institutional memory — future analysts can see why prior deals in the same submarket/anchor/sponsor were killed, without re-reading every note
- Enables future Killed-deal KPI decomposition — the "Killed · <month>" tile's subline can show the reason mix (e.g. `62% basis · 25% anchor · 13% market`) per the Tier 2 KPI strip spec in `examples/DESIGN_TOKENS.md` §2.1. Today that tile carries a fallback subline because the underlying field does not exist.
- Feeds the screener / hurdle-rate backlog: knowing historical kill thresholds sharpens the future hurdle calibration

**Suggested future structure:**
- `pass_reason_primary` — controlled category (one of the list below)
- `pass_reason_detail` — optional free text (1–2 sentences; analyst's own words)

**Suggested primary categories (controlled list):**
- Basis / pricing
- Anchor / tenancy
- Market
- Lease rollover / WALT
- Debt / financing
- Returns
- Sponsor / counterparty
- Physical / capex
- Competing priority / bandwidth
- Other

**Future uses:**
- Killed-deal KPI decomposition on the Pipeline page (Tier 2 KPI strip)
- Source analysis — aggregate kill reasons by broker, market, asset type
- Pipeline learning / feedback loop — surface patterns like "last three Dead deals in Atlanta industrial were all basis-driven" to shape future screening criteria

**Dependency:** Defer implementation until after M4 / merged v1 complete. Scope only after the core workflow is stable. When promoted, explicitly scope (a) the schema addition, (b) the UI capture point — most likely a small reason-capture modal triggered on stage change to Dead, with primary category required and detail optional — and (c) the reporting / KPI wiring that consumes it. Follow the Promotion Criteria below.

---

## Application Shell / Left Navigation Rail

Evaluate a future shift from the current top-nav-only layout to a left-hand workspace navigation shell (app-shell pattern).

Potential destinations/modules in the rail:
- Ingest
- Pipeline
- Compare
- One Pager
- Support

**Rationale:**
- Stronger workspace feel — the product reads as a tool, not a single-page view
- Clearer navigation as modules mature and each destination carries more weight
- Better long-term information architecture once more sections are real (not placeholders)

**Dependency:** Defer until after M4 / merged v1 complete. Only revisit once the core workflow is stable and the active modules are finalized. A navigation overhaul while modules are still in flux would be churn.

**Note:** This should be scoped later as a navigation/app-shell decision, not a casual UI tweak. Promoting it to TASKS.md requires explicit advisor scoping with acceptance criteria (per Promotion Criteria below).

---

## Promotion Criteria

A backlog item can be promoted to TASKS.md only when:
1. Milestone M4 (merged v1 complete) is achieved
2. The item is explicitly scoped by the advisor with acceptance criteria
3. An entry is added to PROJECT_OPERATING_LOG.md recording the decision to promote it
