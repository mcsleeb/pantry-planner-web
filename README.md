# Pantry Planner — Web app

Web-based meal planning that respects what's already on your shelf. Built on Next.js 15, Supabase, and Vercel.

## Status: Phase 1

This is the first web release. What's working:

- Email/password authentication
- The Plan page (generate, swap, persist)
- Database with Row-Level Security
- 14 seed recipes visible to all users
- Deployed to Vercel

What's not done yet:

- Recipes, Pantry, Grocery, Preferences, Add Recipe, Settings pages — these are stubs (Phase 1.5, next conversation)
- Friend system + shared recipes/lists (Phase 2)
- Email verification flow, password reset, account settings (Phase 3)

## Getting started

**Read `docs/SETUP.md` first.** It walks through Supabase setup, env vars, and deployment.

Once configured:

```bash
npm install
npm run dev      # http://localhost:3000
```

## Architecture

```
app/
├── layout.tsx              Root layout, fonts, global CSS
├── page.tsx                Logged-out landing page
├── (auth)/                 Login, signup
├── (app)/                  Authenticated routes (gated by middleware)
│   ├── layout.tsx          Topbar nav
│   ├── plan/               The Week page (Phase 1)
│   ├── recipes/            Stub
│   ├── pantry/             Stub
│   ├── grocery/            Stub
│   └── preferences/        Stub
└── api/                    Server endpoints (currently empty)

lib/
├── consolidator.ts         Waste-minimization logic (from desktop)
├── planner.ts              Pantry-aware week generation (from desktop)
├── exclusions.ts           Dislike + allergen filtering (from desktop)
├── units.ts                Unit conversion (from desktop)
├── walmart.ts              Deep-link generation (from desktop)
├── pdf.ts                  HTML → PDF builder (used by API routes)
├── spoonacular.ts          Server-side API client (NEW — was browser-side)
├── types/                  Shared TS types
├── data/                   Ingredient catalog + recipe seed
├── db/                     Supabase data access (NEW — replaces localStorage)
└── supabase/               Browser + server Supabase clients (NEW)

supabase/
└── migrations/
    ├── 0001_initial_schema.sql    Tables, indexes, RLS policies
    └── 0002_seed_recipes.sql      14 seed recipes (visibility=system)

middleware.ts               Auth gate, session refresh
```

## Key design decisions

- **Pure-logic libs** carry over from the desktop app unchanged. The consolidator, planner, etc. don't care where data comes from.
- **Spoonacular moved server-side.** The shared API key lives in `process.env.SPOONACULAR_API_KEY` and is never sent to browsers. API routes wrap it for client use.
- **Data isolation is enforced by Row-Level Security**, not just app code. A bug in our code can't leak user data.
- **System-owned recipes** (the seed library) use `owner_id = null` and `visibility = 'system'`. RLS policy makes them visible to everyone but only inserts/updates by service role.
- **Server components fetch initial data**, client components handle interactions. This means the Plan page renders fully populated on the server, no flash of loading state.

## Phase roadmap

1. **Phase 1 (this release):** Auth + Plan page on the web. ✓
2. **Phase 1.5:** Port remaining pages (Recipes, Pantry, Grocery, Preferences, Add Recipe).
3. **Phase 2:** Friends, shared recipes, shared grocery lists.
4. **Phase 3:** Email verification, password reset, account settings, polish.
