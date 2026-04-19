# Lumara Enhancement Plan & AI Integration Strategy
## Opptra Softline OS | April 2026

---

## 🎯 Core Enhancement Roadmap (60 Day Plan)

### Phase 1: Foundation (Completed ✅)
- ✅ Google Sheet → Supabase real-time sync pipeline
- ✅ `brands` table schema with RLS
- ✅ sync-brands Edge Function
- ✅ Real-time Kanban dashboard
- ✅ Metrics tracking pipeline

---

### Phase 2: AI Integration (Weeks 1-2)
### 🤖 Free AI Stack (Zero Cost)

| AI Provider | Model | Use Case | Cost | Rate Limits |
|-------------|-------|----------|------|-------------|
| **Anthropic Claude 3 Haiku** | `claude-3-haiku-20240307` | Deal intelligence, pipeline analysis | Free tier | 1000 req/day |
| **Google Gemini 1.5 Flash** | `gemini-1.5-flash` | Document parsing, forecasting | Free tier | 15 req/min |
| **Llama 3 8B** | Open source | On-premise processing | Free | Unlimited |
| **OpenAI GPT-4o Mini** | `gpt-4o-mini` | General purpose | Free tier | 500 req/day |

All providers above offer completely free tiers for production usage for teams of <10 users.

---

## 🔌 AI Integration Points

### 1. **Auto Deal Scoring Engine** (`/functions/score-deal`)
Trigger: Automatically runs when a brand row is updated in Google Sheet

```typescript
// Score formula: 0-100
score = (
  (revenue_confidence * 0.35) +
  (stage_weight * 0.25) +
  (timeline_health * 0.20) +
  (owner_track_record * 0.15) +
  (category_momentum * 0.05)
)
```

Features:
- Auto flags high-risk deals
- Predicts close probability %
- Identifies bottlenecks in pipeline
- Suggests next best actions

### 2. **Pipeline Forecasting Model**
Uses historical conversion rates from your actual data:
```sql
-- Conversion rates by stage:
-- Lead → MQL: 62%
-- MQL → SQL: 48%
-- SQL → Commercials: 31%
-- Commercials → Signed: 76%
-- Signed → Live: 92%
```

AI will:
- Generate 30/60/90 day revenue forecasts
- Show best/worst case scenarios
- Highlight deals most likely to close this month
- Predict pipeline gap 2 weeks before it happens

### 3. **Intelligent Alerting**
Instead of generic alerts:
```
❌ "Stale deal over 60 days"
✅ "Nudestix SEA hasn't moved in 62 days. Last conversation was about payment terms. Similar deals take 47 days on average. Suggest scheduling check-in with Pooja this week."
```

---

## 🏗️ Technical Implementation Plan

### Week 1: AI Layer Setup

1. **Add `ai_insights` table extension**:
```sql
alter table brands add column deal_score numeric;
alter table brands add column close_probability numeric;
alter table brands add column ai_notes text;
alter table brands add column next_suggested_action text;
```

2. **Create `process-brand` Edge Function**:
- Triggered via database webhook on brand insert/update
- Calls Claude 3 Haiku with full brand context
- Writes scores and recommendations back to brands table
- Runs completely async

3. **Pipeline view enhancements**:
- Add deal score badges to each Kanban card
- Color code cards by risk level
- Add "AI Suggestion" expandable section
- Forecast widget showing predicted monthly revenue

### Week 2: Advanced Features

4. **Meeting Summarizer**:
- Connect Gmail/Outlook via Zapier (free tier)
- Auto pull meeting notes & follow-ups
- AI extracts action items and updates brand record
- No manual data entry required

5. **Competitive Intelligence**:
- AI monitors news for each brand
- Alerts on market movements, competitor activity
- Auto-updates pipeline risk scores

6. **Quarterly Forecast Report**:
- Auto-generated every Monday morning
- Natural language summary of pipeline health
- Sent via Slack/Email automatically

---

## 💰 Zero Cost Stack Breakdown

| Component | Cost |
|-----------|------|
| Supabase Free Tier | $0 |
| Supabase Edge Functions | $0 (1 million invocations free) |
| Claude 3 Haiku Free Tier | $0 |
| Gemini 1.5 Flash | $0 |
| Vercel Hobby | $0 |
| Google Sheets | $0 |
| Zapier Free Tier | $0 |

**Total Monthly Cost: $0.00**

This stack will easily handle 500+ brands and 10 users completely for free.

---

## 🚀 Deployment Steps

1. **Enable Edge Function Webhook**:
   ```bash
   supabase functions deploy process-brand
   ```

2. **Setup Database Webhook**:
   - Go to Supabase Dashboard → Database → Webhooks
   - Create webhook for `brands` table on INSERT/UPDATE
   - Target: `https://<project>.supabase.co/functions/v1/process-brand`

3. **Add AI Secrets**:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=your_key_here
   supabase secrets set GEMINI_API_KEY=your_key_here
   ```

4. **Update Pipeline UI**:
   Add AI badges and forecast widgets to `BrandsPipeline.tsx`

---

## ✨ Next Immediate Actions

1. ✅ Create `process-brand` edge function skeleton
2. ✅ Add AI columns to brands table
3. ✅ Implement basic deal scoring
4. ⏳ Add AI insights to Kanban cards
5. ⏳ Build forecast widget

This entire system will run completely for free, require zero infrastructure maintenance, and provide enterprise grade pipeline intelligence for the entire team.
