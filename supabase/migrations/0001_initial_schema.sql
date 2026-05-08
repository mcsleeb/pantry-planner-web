-- =============================================================================
--  Pantry Planner — Initial schema
--
--  Run this once after creating your Supabase project.
--  Either paste it into the SQL Editor (Supabase dashboard → SQL → New query)
--  or run it via the Supabase CLI: `supabase db push`
--
--  This schema is designed for Phase 1 (accounts) but anticipates Phase 2
--  (sharing) so we don't have to rewrite it later.
-- =============================================================================

-- =============================================================================
--  PROFILES — extends Supabase Auth's auth.users with our app data.
--  Auth users are managed by Supabase; we mirror them here for joins.
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  -- The user's preferred diet, default servings, etc.
  diet text default 'omnivore' check (diet in (
    'omnivore', 'vegetarian', 'vegan', 'pescatarian',
    'keto', 'mediterranean', 'gluten-free'
  )),
  servings smallint default 4 check (servings between 1 and 12),
  -- Optional: allow users to customize Spoonacular usage later
  spoonacular_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger: when a new auth.user is created, automatically create their profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
--  RECIPES — owned by users OR system (public seed library).
-- =============================================================================

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  -- Null owner_id = system-owned (the seed library, visible to everyone)
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  diets text[] not null default '{}',
  servings smallint not null default 4,
  prep_minutes int not null default 0,
  cook_minutes int not null default 0,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  tags text[] default '{}',
  protein_tag text,
  -- Recipe attribution for imports
  source_provider text,           -- 'spoonacular', 'url', null
  source_external_id text,
  source_url text,
  -- Cost tracking
  estimated_cost_per_serving int,  -- in cents
  -- Visibility for sharing (Phase 2): private, public (any logged-in user can see), or system (seed)
  visibility text not null default 'private'
    check (visibility in ('private', 'public', 'system')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_recipes_owner on public.recipes(owner_id);
create index idx_recipes_visibility on public.recipes(visibility);

-- =============================================================================
--  PANTRY ITEMS — what the user has on hand.
-- =============================================================================

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ingredient_id text not null,            -- canonical id from our catalog
  amount numeric not null default 1,
  unit text not null,
  use_up boolean not null default false,  -- "use this up first" flag
  created_at timestamptz default now(),
  -- A user can only have one pantry entry per ingredient
  unique(user_id, ingredient_id)
);

create index idx_pantry_user on public.pantry_items(user_id);

-- =============================================================================
--  MEAL PLANS — a generated week of dinners.
--  We allow multiple plans per user (the active one + history).
-- =============================================================================

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Weekly plan',
  diet text not null,
  servings smallint not null,
  -- The plan itself: array of { day, slot, recipe_id, servings }
  plan jsonb not null default '[]'::jsonb,
  -- Marks the user's "current" plan for the dashboard view
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_plans_user_active on public.meal_plans(user_id, is_active);

-- =============================================================================
--  PREFERENCES — dislikes and allergens
-- =============================================================================

create table public.dislikes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ingredient_id text not null,
  created_at timestamptz default now(),
  primary key(user_id, ingredient_id)
);

create table public.allergens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  allergen text not null check (allergen in (
    'peanut', 'tree-nut', 'shellfish', 'fish', 'dairy',
    'egg', 'gluten', 'soy', 'sesame'
  )),
  created_at timestamptz default now(),
  primary key(user_id, allergen)
);

-- =============================================================================
--  PRICE CACHE — Spoonacular pricing results
-- =============================================================================

create table public.ingredient_prices (
  ingredient_id text primary key,
  price_per_package_cents int not null,
  source text not null default 'spoonacular',
  fetched_at timestamptz default now()
);

-- =============================================================================
--  PHASE 2 TABLES (sharing) — created now to avoid migration churn later.
--  Empty until Phase 2 features are built.
-- =============================================================================

create table public.friendships (
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  -- Who initiated the friendship request
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  primary key(user_a_id, user_b_id),
  -- Always store with smaller uuid first to avoid duplicate (a,b)/(b,a) rows
  check (user_a_id < user_b_id)
);

create table public.recipe_shares (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  shared_with uuid not null references public.profiles(id) on delete cascade,
  shared_by uuid not null references public.profiles(id) on delete cascade,
  can_edit boolean not null default false,
  shared_at timestamptz default now(),
  primary key(recipe_id, shared_with)
);

-- =============================================================================
--  ROW LEVEL SECURITY (RLS) — the data-isolation safety net.
--  With RLS on, the database itself enforces "users can only see their own data"
--  even if our application code has a bug. This is critical.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.pantry_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.dislikes enable row level security;
alter table public.allergens enable row level security;
alter table public.ingredient_prices enable row level security;
alter table public.friendships enable row level security;
alter table public.recipe_shares enable row level security;

-- ----- Profiles -----
-- Users can read their own profile, update their own profile.
-- (Phase 2 will extend this to read accepted-friend profiles for display names.)
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ----- Recipes -----
-- A recipe is visible if:
--   - the user owns it, OR
--   - it's marked visibility='system' (seed library), OR
--   - it's marked visibility='public' (Phase 2 friend sharing).
create policy "Recipes visible if owned or public"
  on public.recipes for select
  using (
    auth.uid() = owner_id
    or visibility = 'system'
    or visibility = 'public'
  );

create policy "Users insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = owner_id);

create policy "Users update own recipes"
  on public.recipes for update
  using (auth.uid() = owner_id);

create policy "Users delete own recipes"
  on public.recipes for delete
  using (auth.uid() = owner_id);

-- ----- Pantry -----
create policy "Users manage own pantry"
  on public.pantry_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----- Meal plans -----
create policy "Users manage own plans"
  on public.meal_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----- Dislikes -----
create policy "Users manage own dislikes"
  on public.dislikes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----- Allergens -----
create policy "Users manage own allergens"
  on public.allergens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----- Price cache -----
-- Prices are global (not per-user). All authenticated users can read.
-- Only the server (with service_role key) writes them.
create policy "All users can read prices"
  on public.ingredient_prices for select
  to authenticated
  using (true);

-- ----- Phase 2 stubs (no policies yet — sharing not built) -----
-- Friendships and recipe_shares will get policies when Phase 2 ships.
