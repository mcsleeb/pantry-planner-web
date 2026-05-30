-- =============================================================================
--  Pantry Planner — Custom ingredients & per-user package overrides
--
--  user_ingredients:        ingredients a user defines that aren't in the
--                           static base catalog. Referenced from recipes
--                           by id "user:<uuid>".
--  user_package_overrides:  per-user package size for ANY ingredient
--                           (catalog OR custom). The grocery list rounds
--                           to the override when present.
--
--  Nutrition columns are included now but unused by the app UI — reserved
--  for a future nutrition round so we don't need another migration then.
--
--  Apply with: paste into Supabase SQL Editor, OR `supabase db push`.
-- =============================================================================

create table public.user_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  aisle text not null,
  package_size numeric not null check (package_size > 0),
  package_unit text not null,
  package_label text,
  allergens text[] default '{}',
  -- grams per ml; reserved for future volume<->weight math, optional
  density numeric,
  -- nutrition: reserved for a future round, all optional, all per-100g basis
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  created_at timestamptz default now(),
  unique(user_id, name)
);

create index idx_user_ingredients_user on public.user_ingredients(user_id);

-- =============================================================================
--  user_package_overrides — per-user package size for any ingredient id.
--  ingredient_id is a free-text id: either a catalog id ("cream-cheese")
--  or a custom id ("user:<uuid>"). We don't FK it because catalog ids
--  don't live in a table.
-- =============================================================================

create table public.user_package_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ingredient_id text not null,
  package_size numeric not null check (package_size > 0),
  package_unit text not null,
  package_label text,
  updated_at timestamptz default now(),
  primary key(user_id, ingredient_id)
);

-- =============================================================================
--  RLS — both tables are strictly per-user.
-- =============================================================================

alter table public.user_ingredients enable row level security;
alter table public.user_package_overrides enable row level security;

create policy "Users manage own custom ingredients"
  on public.user_ingredients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own package overrides"
  on public.user_package_overrides for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
