# Pantry Planner — Web setup guide

This guide walks you through getting Phase 1 of the web app running locally and deployed to Vercel. **Read this once before opening anything else.**

The whole process takes about 30-45 minutes the first time. Most of it is account setup and waiting; the actual work is small.

## Phase 1 scope (what you'll have when done)

- A real URL anyone can visit
- Email/password signup and login
- The Plan page works end-to-end (generate week, swap meals, save persists)
- All data lives in Supabase (Postgres), not browser storage
- The 14 seed recipes are visible to all users out of the box
- Recipes/Pantry/Grocery/Preferences pages exist as stubs (next conversation ports them)

## What you'll need

- A GitHub account
- A Supabase account (free, no credit card)
- A Vercel account (free, no credit card)
- A Spoonacular API key (you should already have one)
- Your OS terminal (Mac Terminal or Windows PowerShell)

---

## Part 1 — Local development

### 1.1 — Install Node.js

Same as before. `https://nodejs.org` → LTS → install. Verify with `node --version` (need v18+).

### 1.2 — Get the code

Unzip `pantry-planner-web.zip` somewhere convenient. Open a terminal in the unzipped folder.

### 1.3 — Install dependencies

```bash
npm install
```

Takes 1-3 minutes. No Electron in this project, so it's much faster than the desktop one.

### 1.4 — Set up Supabase

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Settings:
   - **Name:** `pantry-planner` (or whatever)
   - **Database password:** generate a strong one — save it somewhere safe
   - **Region:** pick closest to you (US East works for most)
4. Click **Create new project** — takes ~2 minutes to provision
5. While you wait, find your project's API keys:
   - Dashboard → **Settings** (gear icon) → **API**
   - Copy these two values to a temporary text file:
     - **Project URL** (looks like `https://xxxxx.supabase.co`)
     - **anon public** key (long string starting with `eyJ`)
     - **service_role** key (also starts with `eyJ` — *don't share this one with anyone*)

### 1.5 — Run the database migrations

Once your Supabase project is provisioned:

1. Dashboard → **SQL Editor** (in the left sidebar)
2. Click **New query**
3. Open `supabase/migrations/0001_initial_schema.sql` from the project folder, copy the entire contents, paste into the SQL editor, click **Run**
4. You should see "Success. No rows returned." Quick check: dashboard → **Table Editor** — you should see `profiles`, `recipes`, `pantry_items`, `meal_plans`, etc.
5. New query, paste `0002_seed_recipes.sql`, run it. This adds the 14 seed recipes.
6. Verify: Table Editor → `recipes` table → you should see 12 rows with `visibility = system`

### 1.6 — Configure environment variables

In your project folder:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — your Project URL from step 1.4
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your anon public key
- `SUPABASE_SERVICE_ROLE_KEY` — your service_role key
- `SPOONACULAR_API_KEY` — your existing key

### 1.7 — Configure Supabase Auth settings

By default, Supabase requires email confirmation, which means signups won't work until you click a link in an email. For local dev, we'll disable this:

1. Dashboard → **Authentication** → **Providers** → **Email**
2. **Confirm email** — turn this OFF for now (you can re-enable later)
3. Save

(You'll re-enable email confirmation when you go to production. We'll cover that in the deployment section.)

### 1.8 — Run the dev server

```bash
npm run dev
```

Should print `Ready in XXXms` and a URL like `http://localhost:3000`. Open it in your browser.

### 1.9 — Test the flow

1. Click **Sign up**
2. Create an account with any email/password
3. You should land on `/plan` with the empty-week view
4. Click **Generate the week** — you should see 7 dinner cards
5. Refresh the browser — your plan should still be there (proves persistence works)
6. Click **Log out**, log back in — plan still there. We're solid.

---

## Part 2 — Deploy to Vercel

### 2.1 — Push to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial web app"
gh repo create pantry-planner-web --private --source=. --push
```

(If you don't have GitHub CLI, do it manually via github.com/new — same as `GITHUB-SETUP.md` from the desktop app project.)

### 2.2 — Connect Vercel

1. Go to https://vercel.com/new
2. **Import Git Repository** → pick your `pantry-planner-web` repo
3. Vercel auto-detects Next.js. The build settings are correct by default.
4. Before clicking Deploy, expand **Environment Variables** and add the same 4 from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SPOONACULAR_API_KEY`
5. Click **Deploy**

About 2 minutes later you'll have a URL like `https://pantry-planner-web.vercel.app`. That's your live site.

### 2.3 — Configure Supabase for the production URL

Back in Supabase dashboard:

1. **Authentication** → **URL Configuration**
2. **Site URL** → set to your Vercel URL (e.g. `https://pantry-planner-web.vercel.app`)
3. **Redirect URLs** → add the same URL
4. Save

This is required for password reset emails and OAuth flows to redirect correctly.

### 2.4 — Test production

Visit your Vercel URL, sign up with a new email, generate a week. If anything 500s, check Vercel's deployment logs (Vercel dashboard → Deployments → click latest → "Functions" tab).

### 2.5 — Re-enable email confirmation (recommended)

For production, you probably want email confirmation back on:

1. Supabase → Authentication → Providers → Email
2. Turn **Confirm email** ON
3. Save

Now new signups have to verify their email before they can log in.

---

## Daily workflow from here

```bash
# make changes locally
npm run dev          # see them at localhost:3000
git add .
git commit -m "Brief description"
git push             # auto-deploys to Vercel in ~2 minutes
```

Vercel sends you an email when deploys finish (or fail).

---

## What's next

- **Tell Claude in your next conversation:** "Phase 1 is deployed and working at [URL]. Port the remaining pages."
- I'll add the Recipes, Pantry, Grocery, Preferences, Add Recipe, and Settings pages, all wired to Supabase.
- After that comes Phase 2 (sharing) and Phase 3 (polish).

---

## Troubleshooting

**`npm run dev` errors about missing env vars** → you didn't create `.env.local`, or you put fake placeholder values in it. Real keys, please.

**Sign up succeeds but redirects me to login forever** → email confirmation is enabled but you didn't get the email (or clicked an old link). Disable email confirmation in Supabase Auth settings while testing.

**Plan generates but doesn't persist on refresh** → check that the seed migration ran. Supabase Table Editor → `recipes` → there should be 12 rows. If empty, re-run `0002_seed_recipes.sql`.

**TypeScript errors when running `npm run dev`** → run `npm install` again, then restart the dev server.

**Vercel deploy fails** → check the build logs. Most common: missing env var. Add it in Vercel → Settings → Environment Variables and redeploy.

**Logged in but the app redirects me to login on every page** → clear cookies for the localhost domain. The Supabase client and middleware can fight each other if there's a stale cookie from a previous run.

---

## Architecture notes for future work

- **Pure-logic libs** (`consolidator.ts`, `planner.ts`, `units.ts`, `exclusions.ts`, `walmart.ts`, `pdf.ts`) carry over from desktop unchanged. These are testable, reusable.
- **Spoonacular** is now server-only (`import 'server-only'` at the top). API routes wrap it; the browser never sees the key.
- **Data access** is in `lib/db/` with one file per domain (plans, recipes, user). Server components and client components both use these (client components import the browser supabase client, server components import the server one).
- **RLS policies** in `0001_initial_schema.sql` enforce data isolation at the database level. If our app code has a bug, RLS prevents data leaks.

---

## Checklist before next conversation

- [ ] Supabase project created
- [ ] Migrations 0001 + 0002 ran successfully
- [ ] `.env.local` filled in with real values
- [ ] `npm run dev` works, you can sign up + log in + generate a plan locally
- [ ] Pushed to GitHub
- [ ] Deployed to Vercel
- [ ] Production URL works for sign up + log in + generate a plan
- [ ] Tell Claude: "Phase 1 is deployed at [URL]"
