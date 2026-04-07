# Habit Tracker — Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account
- Twilio account
- Strava developer account
- Anthropic API key
- Vercel account (for deployment)

---

## 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. From **Project Settings → API**, copy:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key — keep secret)

---

## 2. Strava OAuth Setup

1. Go to https://www.strava.com/settings/api and create an application
2. Set **Authorization Callback Domain** to your domain (e.g. `habit-tracker.vercel.app`)
3. Copy your **Client ID** and **Client Secret**
4. Set `NEXT_PUBLIC_STRAVA_REDIRECT_URI` to `https://yourdomain.com/api/auth/strava/callback`

---

## 3. Twilio Setup

1. Create a Twilio account at https://twilio.com
2. Get a phone number (SMS-capable)
3. Set the **Messaging webhook URL** for incoming messages to:
   `https://yourdomain.com/api/sms/webhook`
4. Copy your Account SID and Auth Token

---

## 4. Anthropic API Key

1. Get an API key from https://console.anthropic.com
2. This is used to parse your SMS replies in natural language

---

## 5. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

Generate a random `CRON_SECRET`:
```bash
openssl rand -hex 32
```

---

## 6. Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

**Connect Strava**: Click "Connect Strava" in the header to authorize your Strava account.

---

## 7. Vercel Deployment

```bash
npm i -g vercel
vercel
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

The `vercel.json` already configures two cron jobs:
- **Daily SMS**: 10pm PT (6am UTC) — sends nightly check-in
- **Weekly SMS**: 9pm PT Sunday (5am UTC Monday) — sends weekly summary

> **Note**: Vercel Cron Jobs require a Pro plan or higher.

Add your `CRON_SECRET` to Vercel env vars. Vercel automatically passes it as `Authorization: Bearer <secret>` header to cron routes.

---

## 8. Twilio SMS Webhook

After deploying to Vercel, update your Twilio phone number's incoming message webhook to:
```
https://your-app.vercel.app/api/sms/webhook
```

---

## How SMS Works

1. **Every night at 10pm PT**: You receive a text like:
   ```
   Hi! Daily habit check-in for 2026-04-07:
   🏃 Equiv miles: 3.2 (from Strava — correct?)
   ⏰ Wakeup: unknown
   🍔 Unhealthy meals this week: 1 so far
   🦷 Flossed tonight: TBD
   
   Reply with any corrections or missing info...
   ```

2. **You reply naturally**, e.g.:
   - `"woke up at 6:20, yes flossed"`
   - `"6:35 wakeup, had pizza so 1 unhealthy meal, no floss tonight"`
   - `"miles were actually 5.2 today, woke up 6am, clean eating, flossed"`

3. **Claude AI parses** your reply and updates the data, then confirms.

4. **Every Sunday at 9pm PT**: You receive a weekly summary.

---

## Habit Goals

| Habit | Goal |
|-------|------|
| 🏃 Equivalent miles | Runs 1:1, Bikes ÷4 |
| ⏰ Wakeup time | Before 6:30am PT |
| 🍔 Unhealthy meals | Max 2 per week |
| 🦷 Flossed | Every night |

---

## Manual Strava Sync

To manually trigger a Strava sync:
```bash
curl -X POST https://yourdomain.com/api/strava/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or click "Sync Strava" in the app header.
