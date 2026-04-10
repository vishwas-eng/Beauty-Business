# ⚡ Quick Start Guide - 5 Minutes to Production

## Your Supabase is Ready! ✅

**Project URL:** https://pxttfmdfmucxnzosmfcm.supabase.co  
**Project Ref:** `pxttfmdfmucxnzosmfcm`

---

## Step 1: Run Database Schema (2 minutes)

1. Open https://supabase.com/dashboard/project/pxttfmdfmucxnzosmfcm/sql/new
2. Copy entire content from: `/workspace/supabase/migrations/20240410_enable_inventory_planning.sql`
3. Paste and click **Run**
4. Done! All tables created ✅

---

## Step 2: Get Your Service Role Key (30 seconds)

1. Go to https://supabase.com/dashboard/project/pxttfmdfmucxnzosmfcm/settings/api
2. Copy the **service_role** secret (starts with `eyJ...`)
3. Save it for next step

---

## Step 3: Update Environment Variables (1 minute)

Edit `/workspace/.env.local`:

```bash
# Already has Supabase URL and Anon Key - just add these:

SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
ANTHROPIC_API_KEY=get_from_https_console_anthropic_com_or_leave_blank_for_now
```

---

## Step 4: Deploy to Vercel (2 minutes)

```bash
cd /workspace

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Follow prompts, then:
1. Go to Vercel dashboard
2. Add environment variables (same as `.env.local`)
3. Redeploy

---

## Step 5: Create Your First User

1. Go to https://supabase.com/dashboard/project/pxttfmdfmucxnzosmfcm/auth/users
2. Click **Add user** > **Create new user**
3. Enter email/password
4. Copy the User ID

Run in SQL Editor:
```sql
SELECT create_workspace('My Company', 'paste-user-id-here', 'Your Name');
```

---

## 🎉 DONE! Test It:

```bash
curl "https://your-app.vercel.app/api/inventory-metrics?workspaceId=YOUR_WORKSPACE_ID"
```

---

## What You Built:

✅ Complete Supabase backend with 11 tables  
✅ AI-powered inventory forecasting  
✅ Automated reorder recommendations  
✅ Real-time alerts system  
✅ Multi-channel inventory support  
✅ Production-ready API endpoints  
✅ TypeScript client library  

**Total Cost: $0/month** 🎊

Read `/workspace/DEPLOYMENT_GUIDE.md` for full documentation.

**The e-commerce industry is about to change! 🚀**
