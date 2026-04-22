# LSG Design Tokens — v1

**Project:** LSG Retail Pipeline & Screener
**Purpose:** Aesthetic foundation spec for porting the Design prototype's visual identity into the Code project
**Last updated:** 2026-04-22

---

## Operating principle

Single-accent system. Red is the only colored ramp. Warm grayscale carries everything else — surfaces, borders, text hierarchy, active states. No navy.

**Discipline rule:** if more than ~5% of pixels on screen are red, you've used too much. Red signals action, emphasis, or selection. Everything else is grayscale.

---

## Implementation tiers

Sequenced to respect Phase 3 work. Do not promote later tiers without an explicit task in TASKS.md.

| Tier | When | Scope |
|---|---|---|
| **Tier 1** | Now | Token file replacement, font import, wordmark lockup, canvas color |
| **Tier 2** | After Phase 3 ships | KPI tile strip, row treatment, section headers, status pill color map |
| **Tier 3** | After Phase 4 (one-pager) ships | Sidebar restructure, filter chips with counts, soft form placeholders, maturity proximity indicators |

---

## TIER 1 — Foundation

Single PR, no component logic changes, zero functional risk.

### 1.1 Token file

Create `src/styles/tokens.css`:

```css
:root {
  /* Accent — the only colored ramp */
  --lsg-red:           #B8232A;
  --lsg-red-deep:      #8F1A20;
  --lsg-red-subtle:    #FBEDEE;

  /* Surfaces */
  --lsg-canvas:        #FAFAF8;
  --lsg-surface:       #FFFFFF;
  --lsg-surface-alt:   #F6F6F3;
  --lsg-surface-sunk:  #EEEEE9;

  /* Text */
  --lsg-text-primary:  #171717;
  --lsg-text-secondary:#3D3D3D;
  --lsg-text-tertiary: #8A8A85;
  --lsg-text-disabled: #B8B8B0;

  /* Borders */
  --lsg-border:        rgba(0,0,0,0.06);
  --lsg-border-strong: rgba(0,0,0,0.12);

  /* Semantic — state only, never decoration */
  --lsg-positive:        #116B40;
  --lsg-positive-subtle: #E8F1EC;
  --lsg-warning:         #8A5A10;
  --lsg-warning-subtle:  #F6EEDC;

  /* Typography */
  --font-sans: "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* Compatibility aliases — preserve existing variable usage */
  --accent:    var(--lsg-red);
  --text:      var(--lsg-text-primary);
  --muted:     var(--lsg-text-tertiary);
  --surface:   var(--lsg-surface);
  --border:    var(--lsg-border);
}
```

**Critical:** the compatibility aliases at the bottom preserve existing `--accent`, `--text`, `--muted`, `--surface`, `--border` usage in `App.jsx`. Do not refactor consumers in this PR. The aliases let Tier 1 ship as a pure token swap.

Import in `src/main.jsx` (or wherever Tailwind is imported):

```js
import './styles/tokens.css';
```

### 1.2 Font import

Add to `index.html` inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 1.3 Wordmark lockup

Replace existing header brand mark with:

```jsx
<div className="wordmark">
  <span className="wordmark-primary">LIGHTSTONE</span>
  <span className="wordmark-secondary">/ PIPELINE</span>
</div>
```

```css
.wordmark {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--font-sans);
}
.wordmark-primary {
  font-weight: 700;
  font-size: 16px;
  color: var(--lsg-red);
  letter-spacing: 0.12em;
}
.wordmark-secondary {
  font-weight: 400;
  font-size: 16px;
  color: var(--lsg-text-tertiary);
  letter-spacing: 0.06em;
}
```

### 1.4 Canvas + body styles

```css
body {
  background: var(--lsg-canvas);
  color: var(--lsg-text-primary);
  font-family: var(--font-sans);
}
```

All numeric values in tables must use:

```css
font-family: var(--font-mono);
font-variant-numeric: tabular-nums;
```

### Tier 1 acceptance

- App renders identically in functionality
- Header shows new wordmark
- Body background is warm `#FAFAF8`, not pure white
- Geist + Geist Mono load (verify in dev tools network tab)
- No existing `var(--accent)` / `var(--text)` references break
- One commit, one PR

---

## TIER 2 — Components (after Phase 3)

### 2.1 KPI tile strip

Above the pipeline table, four tiles in a 4-column grid.

Pattern per tile:
- White surface, 0.5px border, 4px radius, 14px/16px padding
- Red bullet marker (5px circle) + thin uppercase label above
- Mono numeric in 28px/500, tabular figures, primary color
- Delta line in 11px below: positive (`#116B40`) for ▲, tertiary gray for neutral, red-deep for ▼

Reference layout:
```
ACTIVE DEALS              PIPELINE $              ADDED · APR '26          KILLED · APR '26
11                        $1.65b                  5                        3
▲ 2 vs. 30 days prior    across active deals      ▲ 1 vs. March           62% basis · 25% anchor · 13% mkt
```

The "Killed" tile's kill-reason decomposition is the single highest-value move on the page. It surfaces the proprietary data asset inline. Compute from the deals where `status = 'Dead'` and a `pass_reason` field has been populated.

### 2.2 Section header signature

Page titles in thin weight (300) with a 28px red underline 2px tall below.

```jsx
<div className="section-header">
  <h1>Retail Pipeline</h1>
  <div className="section-rule" />
</div>
```

```css
.section-header h1 {
  font-weight: 300;
  font-size: 28px;
  color: var(--lsg-text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}
.section-rule {
  width: 28px;
  height: 2px;
  background: var(--lsg-red);
  margin: 0 0 20px;
}
```

Apply to: Pipeline, Compare, One Pager, and any tab title.

### 2.3 Table row treatment

| Element | Spec |
|---|---|
| Row height | 36–40px |
| Standard row | `background: var(--lsg-surface)`, 0.5px bottom border |
| Hover row | `background: var(--lsg-surface-alt)`, no color shift |
| Selected row | `background: var(--lsg-red-subtle)` + 3px `var(--lsg-red)` left border |
| Header row | `background: var(--lsg-canvas)`, 10px uppercase labels in tertiary text |
| Numerics | Mono, right-aligned, tabular-nums |
| Deal name | Primary text, 13px, regular weight (selected = medium weight) |
| Deal ID + broker | Mono, 10px, tertiary text, stacked under deal name |
| Location state suffix | Mono, 10px, tertiary text |
| Maturity | Date in mono primary text, months-to-maturity in 10px tertiary |

### 2.4 Status pill color map

Lock once, propagate everywhere.

| Status | Background | Text | Notes |
|---|---|---|---|
| IC | `--lsg-red-subtle` | `--lsg-red-deep` | Optional 0.5px `#F0C8CB` border |
| Underwriting | `--lsg-surface-sunk` | `--lsg-text-secondary` | |
| Screening | `--lsg-surface-alt` | `--lsg-text-tertiary` | |
| Bid | `--lsg-warning-subtle` | `--lsg-warning` | |
| Active | `--lsg-positive-subtle` | `--lsg-positive` | |
| Dead | transparent | `--lsg-text-tertiary` | 0.5px `--lsg-border-strong` border |

Pill geometry:
- 2px vertical, 8px horizontal padding
- 3px border-radius
- 10px font, 500 weight, 0.02em letter-spacing

### 2.5 Priority badges

| Priority | Treatment |
|---|---|
| A | Filled red background, white text |
| B | Transparent, primary text, 1px primary border |
| C | Transparent, tertiary text, 1px `--lsg-border-strong` |

18px square, 3px radius, mono font, 10px, 500 weight.

### Tier 2 acceptance

- KPI strip renders above pipeline table with real values from Supabase
- Section header signature applied to all 4 main views
- Pipeline table uses new row treatment
- All status pills follow the locked color map
- Priority badges replace any prior text-based priority indicators

---

## TIER 3 — Polish (after Phase 4)

### 3.1 Sidebar three-section split

Group nav items under section labels:
- **Workspace:** Pipeline, Map, Analytics, Archive
- **Intake:** Inbox, OMs, Memos
- **Admin:** Settings, Shortcuts

Section labels in tertiary text, 10px, uppercase, 0.08em letter-spacing.

Active item: `background: var(--lsg-surface-alt)` + primary text + 500 weight. No red, no left rail (selection is reserved for table rows).

### 3.2 Filter chips with counts

When a filter has selections, show count: `Status (2)`. When none, show: `Status All`.

Inactive chip:
```css
background: transparent;
color: var(--lsg-text-secondary);
border: 0.5px solid var(--lsg-border-strong);
```

Active chip:
```css
background: var(--lsg-text-primary);
color: var(--lsg-surface);
border: none;
```

Chip geometry: 4px vertical, 10px horizontal padding, 3px radius, 11px font.

### 3.3 Soft form placeholders

The New Deal modal's placeholder strategy: show expected format without polluting state.

Examples by field:
- Deal Name: `Sunbelt Logistics Portfolio`
- Property Address: `1420 Industrial Pkwy, Phoenix, AZ`
- Market: `Phoenix, AZ`
- Sponsor / Seller: `Prologis JV`
- SF: `412,000`
- Acreage: `38.2`
- Occupancy: `91.0%`
- WALT (yrs): `5.4`
- Year Built / Renovated: `1999 / 2018`
- Parking Count: `1,965`
- Asking Price: `$89,500,000`
- NOI: `$6,980,000`
- Cap Rate: `7.8%`
- Source Broker: `CBRE · D. Reiss`

Placeholder styling: `color: var(--lsg-text-disabled)` so it reads as suggestion, not value.

### 3.4 Maturity proximity indicators

For any debt maturity column, render the date plus months-to-maturity:

```
Jun 14 '27   14 mo
```

Date in primary text mono. Months in tertiary text, 10px, mono. The "X mo" indicator is an underwriter convenience — surfaces near-term refis at a glance.

---

## Active state patterns (no navy)

Without a second accent color, three patterns cover every "active" state need.

### Pattern 1 — Sidebar nav active

```css
.nav-item.active {
  background: var(--lsg-surface-alt);
  color: var(--lsg-text-primary);
  font-weight: 500;
}
```

### Pattern 2 — Filter chip active (inverted)

```css
.filter-chip.active {
  background: var(--lsg-text-primary);
  color: var(--lsg-surface);
  font-weight: 500;
}
```

### Pattern 3 — Input focus (ring, not color shift)

```css
input:focus,
textarea:focus,
select:focus {
  border: 1px solid var(--lsg-text-primary);
  box-shadow: 0 0 0 2px rgba(23, 23, 23, 0.08);
  outline: none;
}
```

---

## Red usage discipline

### Red is reserved for

- Wordmark "LIGHTSTONE"
- Primary CTA buttons (`+ New Deal`, `Run Valuation`, etc.)
- IC stage pills
- A-priority badges (filled)
- Selected row left rail
- Section header underline
- KPI tile bullet markers
- Negative deltas in metrics

### Red is never used for

- Sidebar active state (use surface-alt + bold text)
- Hover backgrounds (use surface-alt)
- Borders or dividers
- Body text or labels
- Multiple table rows (one selection only)
- Underwriting / Bid / Active / Screening status pills
- Decorative accents
- Icons not tied to a primary CTA

### Audit rule

Before shipping any new screen, ask: "If I screenshotted this and counted red pixels, would they exceed 5% of the canvas?" If yes, demote one of them.

---

## Color reference table

### Accent

| Token | Hex | Use |
|---|---|---|
| `--lsg-red` | `#B8232A` | Primary accent, CTAs, wordmark, selection |
| `--lsg-red-deep` | `#8F1A20` | Hover/pressed states for red elements, IC pill text |
| `--lsg-red-subtle` | `#FBEDEE` | Selected row tint, IC pill background, A-priority chip background |

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `--lsg-canvas` | `#FAFAF8` | Page background |
| `--lsg-surface` | `#FFFFFF` | Cards, modals, inputs, table rows |
| `--lsg-surface-alt` | `#F6F6F3` | Row hover, sidebar active state, screening pill |
| `--lsg-surface-sunk` | `#EEEEE9` | Underwriting pill, secondary container backgrounds |

### Text

| Token | Hex | Use |
|---|---|---|
| `--lsg-text-primary` | `#171717` | Headlines, primary content, active nav |
| `--lsg-text-secondary` | `#3D3D3D` | Body text, secondary content |
| `--lsg-text-tertiary` | `#8A8A85` | Labels, placeholders, captions, deal IDs |
| `--lsg-text-disabled` | `#B8B8B0` | Disabled inputs, soft placeholders |

### Borders

| Token | Value | Use |
|---|---|---|
| `--lsg-border` | `rgba(0,0,0,0.06)` | Default hairlines, table row dividers |
| `--lsg-border-strong` | `rgba(0,0,0,0.12)` | Inputs, modal footers, secondary buttons |

### Semantic (state only)

| Token | Hex | Use |
|---|---|---|
| `--lsg-positive` | `#116B40` | Active status, positive deltas |
| `--lsg-positive-subtle` | `#E8F1EC` | Active status pill background |
| `--lsg-warning` | `#8A5A10` | Bid status, soft warnings |
| `--lsg-warning-subtle` | `#F6EEDC` | Bid status pill background |

---

## Typography reference

| Style | Font | Size | Weight | Color | Use |
|---|---|---|---|---|---|
| page-title | Geist | 28px | 300 | primary | H1 page titles |
| section-h2 | Geist | 18px | 400 | primary | Section headings |
| label | Geist | 11px | 500 | tertiary | Uppercase labels (0.08em tracking) |
| body | Geist | 14px | 400 | secondary | Standard body text |
| body-sm | Geist | 13px | 400 | secondary | Table cells, dense content |
| caption | Geist | 11px | 400 | tertiary | Helper text, deltas |
| numeric-lg | Geist Mono | 28px | 500 | primary | KPI values |
| numeric-table | Geist Mono | 13px | 400 | primary | Table numerics (tabular-nums) |
| numeric-sm | Geist Mono | 10px | 400 | tertiary | Deal IDs, proximity indicators |

All Geist Mono usage requires `font-variant-numeric: tabular-nums`.

---

## Out-of-scope reminders

These are explicitly NOT in any aesthetic tier. They belong to feature work governed by TASKS.md and BACKLOG.md:

- Map view — Phase 5+ feature work
- Analytics dashboard — Phase 5+ feature work
- Deal Detail multi-tab layout — Phase 4+ feature work
- Side-by-side deal comparison (real feature) — backlog
- Hurdle rate screener — backlog
- AI screener / pass-fail badges — backlog
- Excel / PDF export — backlog
- Mobile-optimized UI — backlog

Aesthetic tier work touches styling only. If implementation requires schema changes, new components beyond styling, or new data flows, stop and re-scope through the advisor.

---

## Handoff notes for Claude Code

1. Read this file in full before writing any code
2. Implement only the tier referenced in the TASKS.md task — never promote scope across tiers in a single session
3. Preserve all existing CSS variable consumers (`--accent`, `--text`, `--muted`, `--surface`, `--border`) via the compatibility aliases — do not refactor consumers
4. Verify Geist loads in dev tools before claiming Tier 1 complete
5. After Tier 1 commit, do a visual diff: header should show new wordmark, body background should be warm, no other functional changes should be visible
6. Phase 3 (ingestion) implementation takes precedence over any tier of aesthetic work — if aesthetic work conflicts with Phase 3 timing, defer
