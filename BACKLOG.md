# Backlog — Retail Deal Pipeline & Screener
**Deferred features. None of these are in scope for merged v1.**
**Promote an item to TASKS.md only after M4 (v1 complete) and with explicit advisor scoping.**
**Last updated:** 2026-04-16

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

## Promotion Criteria

A backlog item can be promoted to TASKS.md only when:
1. Milestone M4 (merged v1 complete) is achieved
2. The item is explicitly scoped by the advisor with acceptance criteria
3. An entry is added to PROJECT_OPERATING_LOG.md recording the decision to promote it
