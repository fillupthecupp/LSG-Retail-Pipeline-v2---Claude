# LSG Retail Pipeline v1

React + Vite + Tailwind v3 + Vercel. Pipeline-first deal tracker with AI-powered OM extraction via Claude.

---

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` at the project root:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel
```

When prompted:
- Framework: **Vite**
- Build command: `npm run build` (default)
- Output directory: `dist` (default)

Add your API key:
```bash
vercel env add ANTHROPIC_API_KEY
# paste your key, select Production + Preview + Development
```

Redeploy:
```bash
vercel --prod
```

### Option B — GitHub + Vercel Dashboard

1. Push this folder to a new GitHub repo
2. vercel.com → New Project → Import repo
3. Framework: **Vite** | Build: `npm run build` | Output: `dist`
4. Add env variable: `ANTHROPIC_API_KEY` = your Anthropic key
5. Deploy

---

## Project Structure

```
lsg-pipeline/
├── api/
│   └── ingest-om.js        # Serverless function — calls Anthropic Claude
├── src/
│   ├── App.jsx             # Pipeline app
│   ├── main.jsx            # React entry
│   └── style.css           # Tailwind directives
├── index.html
├── package.json            # Tailwind v3 + PostCSS
├── postcss.config.js       # Required for Tailwind v3
├── tailwind.config.js      # Content paths
├── vite.config.js          # Vite + React only (no Tailwind plugin)
├── vercel.json
└── README.md
```

---

## Key Fix vs Previous Build

The prior build used `@tailwindcss/vite` (Tailwind v4) which is ESM-only and incompatible with how Vercel builds Vite projects. This build uses **Tailwind v3 + PostCSS** which is the stable, Vercel-compatible approach.

---

## What's Next

- Hurdle rate screening (Cap ≥ 8.5%, IRR ≥ 15%, CoC ≥ 10%)
- AI screener with IRR/CoC modeling
- Side-by-side deal comparison
- Deal detail / abstract view
