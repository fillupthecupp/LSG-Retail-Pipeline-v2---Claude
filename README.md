# LSG Retail Pipeline v1

React + Vite + Vercel. Pipeline-first deal tracker with AI-powered OM extraction via Claude.

---

## Local Development

```bash
npm install
npm run dev
```

Set your API key in a `.env.local` file at the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Deploy to Vercel (5 minutes)

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about framework: select **Vite**.

Then add your environment variable:

```bash
vercel env add ANTHROPIC_API_KEY
```

Paste your key when prompted. Redeploy:

```bash
vercel --prod
```

---

### Option B — GitHub + Vercel Dashboard

1. Push this folder to a new GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import that repo
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable: `ANTHROPIC_API_KEY` = your key
7. Deploy

---

## Project Structure

```
lsg-pipeline/
├── api/
│   └── ingest-om.js        # Vercel serverless function — calls Anthropic
├── src/
│   ├── App.jsx             # Main pipeline app
│   ├── main.jsx            # React entry point
│   └── style.css           # Tailwind v4 import
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```

---

## How OM Ingestion Works

1. Click **Add Deal** → upload a PDF OM
2. Frontend sends the PDF (base64) to `/api/ingest-om`
3. Vercel serverless function calls `claude-sonnet-4-20250514` with the PDF
4. Claude extracts all pipeline fields and returns JSON
5. Form pre-fills — you review, correct, and save

Your `ANTHROPIC_API_KEY` never touches the browser — it lives only in Vercel's environment.

---

## What's Coming Next

- Hurdle rate screening (Cap ≥ 8.5%, IRR ≥ 15%, CoC ≥ 10%)
- AI screener with IRR/CoC modeling and go/no-go variable
- Side-by-side deal comparison
- Deal detail view with TIF, rollover, tenant data
- Export to CSV / IC brief
