# Softline OS

Operating dashboard for softline business execution across `tracker + inbox + legal + documents + AI`.

## What is included

- React + Vite frontend with a polished analytics UI
- Passwordless login flow with a local demo fallback
- KPI cards, analyst-focused charts, brand performance table, and AI insights
- Google Sheets source settings
- Excel/CSV upload parsing and validation
- Notion control-center configuration for operational context
- Claude-backed insight generation with safe heuristic fallback
- Brand 360 pages grounded in tracker rows, inbox updates, legal status, and linked documents
- Legal workflow with NDA review draft generation and approval-before-send flow
- Sidebar agent that can answer over brand, legal, inbox, market, category, and document signals
- Netlify Functions for dashboard reads, automation sync, source refresh, AI generation, and config persistence
- Supabase SQL schema with workspaces, roles, analytics records, automation configs, Notion context, and run history

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm run dev
```

Without external API keys, the app runs from the latest local source snapshot so you can still preview the full UI and workflow logic.

## Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_SHEETS_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_APPS_SCRIPT_URL`
- `GOOGLE_APPS_SCRIPT_KEY`
- `GOOGLE_WORKSPACE_SENDER`
- `NOTION_ACCESS_TOKEN`
- `NOTION_VERSION`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `LEGAL_TEAM_EMAIL`
- `NDA_TEMPLATE_DOCUMENT_ID`
- `NDA_TEMPLATE_NAME`

## Full automated architecture

The intended production flow is:

`Google Sheets + Gmail + Google Docs/Drive + Notion -> Netlify scheduled sync -> Supabase -> Dashboard + Agent + Legal workflows`

- `Google Sheets` stores live business rows like sales, inventory, returns, and discounts.
- `Gmail` stores ongoing brand communication, signatory details, next steps, proposal movement, and legal follow-up.
- `Google Docs / Drive` stores NDA drafts, decks, reports, and term-sheet documents.
- `Notion` stores business memory like KPI definitions, alert rules, category notes, reporting tone, and workflow instructions.
- `Netlify Functions` orchestrate sync and insight generation.
- `Supabase` stores normalized records, context snapshots, run history, and secure user access.
- `Claude` generates grounded summaries after data and context are synced.

See [docs/architecture.md](/Users/vishwaspandey/Documents/Playground/docs/architecture.md) for the full architecture breakdown.

## Deploy on free services

### Netlify

- Connect the repo to a Netlify site.
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- The scheduled function is [netlify/functions/scheduled-sync.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/scheduled-sync.ts)

### Supabase

- Create a free Supabase project.
- Run [schema.sql](/Users/vishwaspandey/Documents/Playground/supabase/schema.sql) in the SQL editor.
- Enable email auth with magic links.
- Add one workspace row and matching admin profile row.

### Google Sheets

- Use a sheet with these columns:
  `date`, `sku`, `product_name`, `category`, `brand`, `channel`, `sales_qty`, `sales_amount`, `returns_qty`, `inventory_on_hand`, `cost_amount`, `discount_amount`
- Save the sheet ID, tab, and range in the app settings.
- For the simplest live setup, you can skip OAuth and point Netlify to an Apps Script web app instead:
  - `GOOGLE_APPS_SCRIPT_URL`
  - `GOOGLE_APPS_SCRIPT_KEY`
  - the script should return JSON with `headers` and `rows`

### Notion

- Create a Notion integration and share your database with it.
- Store control-center rows like alert rules, reporting instructions, or KPI notes.
- Save the database ID and field mappings in the app settings.

### Claude

- Add your Anthropic API key to `.env`.
- The app will use Claude for insight generation and fall back safely if the API is not configured or unavailable.

## NDA automation requirements

To make the legal workflow truly production-ready, these must be in place:

- one reusable NDA master template in Google Docs
  - convert the current brand-specific draft into placeholders such as `{{brand_name}}`, `{{entity_name}}`, `{{signatory_name}}`, `{{signatory_title}}`, `{{signatory_email}}`, `{{registered_address}}`
- Gmail send access
  - required so `Approve and send to legal` creates a real draft or sends the prepared NDA to the legal team
- Google Docs edit access
  - required so the app can fill the actual template before review
- one legal recipient rule
  - example: `palak@opptra.com`
- one review policy
  - recommended: `prepare draft -> review -> send`

Current app behavior:

- prepares a review-ready draft packet from structured brand/email/tracker details
- opens a printable review copy that can be saved as PDF
- gates send until all required fields exist

Final production behavior after credentials are added:

- extract legal details from mail and brand records
- fill the live NDA template
- generate a reviewable draft
- send directly to the legal team after approval

## Recommended next steps

- Replace the in-memory Netlify function state with real Supabase reads and writes.
- Wire live Sheets, Gmail, and Docs connectors into the Netlify functions.
- Convert the NDA source file into a true placeholder template.
- Add Gmail draft/send support for legal routing.
- Add admin invite flows for viewer users.
- Persist Notion context snapshots and automation runs into Supabase from the serverless functions.
