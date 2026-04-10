# Opptra AI-Powered E-commerce Platform - Setup Guide

## 🚀 Revolutionizing E-commerce with AI-Driven Inventory Planning

This platform combines multi-channel orchestration, brand management, legal workflows, and **AI-powered inventory planning** to transform how e-commerce businesses operate.

## Free Tier Services Used

- **Supabase**: Free tier (500MB database, 50K daily active users)
- **Vercel**: Free tier for hosting
- **Anthropic Claude API**: Pay-as-you-go (or use free tier alternatives)
- **Google Sheets API**: Free tier
- **Notion API**: Free tier

## Setup Instructions

### 1. Create Supabase Project (FREE)

1. Go to [supabase.com](https://supabase.com)
2. Sign up for free account
3. Create new project
4. Wait for project to initialize
5. Go to Settings → API
6. Copy these values:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon/public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → Keep secure for server-side only

### 2. Run Database Schema

1. In Supabase Dashboard, go to SQL Editor
2. Copy entire contents of `/supabase/schema.sql`
3. Paste and run
4. Verify all tables created successfully

### 3. Configure Environment Variables

Create `.env` file in root directory:

```env
# Supabase (REQUIRED - Free)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Vercel/Site URL (Optional)
VITE_SITE_URL=http://localhost:5173

# Anthropic Claude API (Optional - for AI features)
# Get free trial at https://console.anthropic.com
ANTHROPIC_API_KEY=your-api-key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Google Sheets API (Optional)
GOOGLE_SHEETS_API_KEY=your-api-key
GOOGLE_SHEET_ID=your-sheet-id

# Notion API (Optional)
NOTION_API_KEY=your-notion-integration-token
NOTION_DATABASE_ID=your-database-id
```

### 4. Enable Email Authentication in Supabase

1. Go to Authentication → Providers
2. Enable "Email" provider
3. Configure email templates (optional)
4. For development, disable email confirmation:
   - Go to Authentication → Settings
   - Uncheck "Enable email confirmations"

### 5. Install Dependencies & Run

```bash
npm install
npm run dev
```

## Key Features

### 📊 Dashboard Analytics
- Real-time sales performance
- Multi-channel metrics
- Category breakdowns
- Inventory health indicators

### 🤖 AI Agent
- Natural language queries about your pipeline
- Automated insights generation
- Smart recommendations
- Context-aware responses

### 📦 Inventory Planning (NEW!)
- **Demand Forecasting**: AI-powered predictions using historical data
- **Reorder Recommendations**: Automated purchase suggestions
- **Stock Optimization**: Minimize overstock and stockouts
- **Supplier Management**: Track lead times and costs
- **Inventory Alerts**: Low stock, overstock, dead stock warnings
- **Sales Analytics**: Historical trends and seasonality

### ⚖️ Legal Workflows
- NDA generation and tracking
- Document management
- Compliance automation

### 🔗 Multi-Channel Integration
- Google Sheets sync
- Notion integration
- Excel uploads
- Real-time data synchronization

## Database Schema Highlights

### Core Tables
- `workspaces` - Multi-tenant workspace management
- `profiles` - User authentication and roles
- `analytics_records` - Sales and performance data
- `data_sources` - Connected data integrations

### Inventory Planning Tables (NEW!)
- `inventory_snapshots` - Daily inventory levels
- `demand_forecasts` - AI-generated demand predictions
- `reorder_recommendations` - Automated reorder suggestions
- `suppliers` - Supplier information and lead times
- `sku_suppliers` - SKU-to-supplier relationships
- `inventory_alerts` - Real-time inventory warnings
- `sales_history` - Historical sales data for ML training

### Database Functions
- `get_dashboard_metrics()` - Aggregated KPIs
- `calculate_reorder_point()` - Dynamic safety stock calculation
- `generate_demand_forecast()` - Time-series forecasting

## Production Deployment

### Deploy to Vercel (FREE)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   Vercel     │────▶│  Supabase   │
│  Frontend   │◀────│  Serverless  │◀────│  Database   │
│             │     │   Functions  │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Claude AI   │
                    │   (Optional) │
                    └──────────────┘
```

## Next Steps

1. **Customize Branding**: Update logo and colors in `/public/` and `/src/styles/`
2. **Connect Data Sources**: Add your Google Sheets/Notion credentials
3. **Import Historical Data**: Use Excel upload or direct database import
4. **Configure AI**: Set up Claude API for intelligent insights
5. **Invite Team**: Add team members through authentication

## Support & Documentation

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- React Docs: https://react.dev
- Claude API: https://docs.anthropic.com

---

**Built with ❤️ by Opptra - Transforming E-commerce Through AI**
