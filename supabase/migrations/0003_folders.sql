-- =============================================================================
--  Pantry Planner — Folders
--
--  Per-user folders. A recipe (custom OR system seed) can live in many folders,
--  and a folder holds many recipes. Folder ownership is per-user — system
--  seed recipes are never "in" a folder globally; they're added to a specific
--  user's personal folder via folder_recipes.
--
--  Apply with: paste into Supabase SQL Editor, OR `supabase db push`.
-- =============================================================================

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- A user can't have two folders with the same name
  unique(user_id, name)
);

create index idx_folders_user on public.folders(user_id);

-- =============================================================================
--  FOLDER_RECIPES — many-to-many between folders and recipes.
--  We don't store user_id here because the folder's user_id implies it,
--  and RLS will join through folders when checking permissions.
-- =============================================================================

create table public.folder_recipes (
  folder_id uuid not null references public.folders(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  added_at timestamptz default now(),
  primary key(folder_id, recipe_id)
);

create index idx_folder_recipes_recipe on public.folder_recipes(recipe_id);

-- =============================================================================
--  RLS — folders are private per-user.
-- =============================================================================

alter table public.folders enable row level security;
alter table public.folder_recipes enable row level security;

create policy "Users manage own folders"
  on public.folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- For folder_recipes, the user must own the folder. We don't need to check
-- recipe ownership: per the existing recipes RLS policy, the user can only
-- SELECT recipes they can see (own + system + public), and inserting into
-- folder_recipes doesn't grant them more access than they already have.
create policy "Users manage memberships of own folders"
  on public.folder_recipes for all
  using (
    exists (
      select 1 from public.folders f
      where f.id = folder_recipes.folder_id
        and f.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.folders f
      where f.id = folder_recipes.folder_id
        and f.user_id = auth.uid()
    )
  );
