# Automated Notion + Claude Architecture

## Core idea

This project is designed so you do **not** need to upload documents every time.

You update:
- `Google Sheets` for live business data
- `Notion` for business logic, notes, alerts, KPI definitions, and reporting instructions

The app then automates:
- source sync
- dashboard refresh
- AI summary generation

## Flow

```text
Google Sheets ----\
                    -> Netlify run-automation -> Supabase normalized tables -> Dashboard
Notion database ---/                                      \
                                                           -> Claude insight generation -> cached insight cards
```

## Source responsibilities

### Google Sheets

Use Sheets for fast-changing structured business data:
- daily sales
- inventory on hand
- returns
- discounts
- cost inputs

### Notion

Use Notion for slower-changing business context:
- KPI definitions
- alert rules
- executive reporting tone
- category guidance
- channel caveats
- workflow notes

### Supabase

Use Supabase as the durable system of record:
- auth
- normalized analytics rows
- cached snapshots
- automation configs
- Notion context items
- automation run history

### Claude

Use Claude only after sync:
- generate concise insight cards
- explain anomalies
- summarize business movement
- apply Notion rules to the final narrative

## Serverless endpoints

- [dashboard.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/dashboard.ts): returns the latest dashboard payload
- [refresh-source.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/refresh-source.ts): refreshes Google Sheets state
- [save-automation-config.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/save-automation-config.ts): stores automation settings
- [run-automation.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/run-automation.ts): orchestrates Sheets + Notion + Claude
- [generate-insights.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/generate-insights.ts): generates AI insights on demand
- [scheduled-sync.ts](/Users/vishwaspandey/Documents/Playground/netlify/functions/scheduled-sync.ts): scheduled automation trigger

## Notion database recommendation

Suggested properties:
- `Title`
- `Category`
- `Priority`
- `Notes`
- `Workspace`

Examples of rows:
- “Margin watchlist”
- “Low stock rule”
- “CEO summary tone”
- “Channel exceptions”

## Production hardening

- Move serverless memory state into Supabase writes
- Add signed admin-only mutation endpoints
- Add idempotent sync job tracking
- Store row hashes for Notion items as well as Sheets data
- Cache Claude outputs by workspace + date range
