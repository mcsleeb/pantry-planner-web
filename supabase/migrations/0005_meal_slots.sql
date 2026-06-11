-- =============================================================================
--  Pantry Planner — Breakfast & Lunch slots
--
--  Adds:
--    recipes.suitable_meals    text[]  — which meal slots this recipe fits.
--                                        Defaults to {'dinner'} for back-compat.
--    profiles.enabled_meals    text[]  — which meal slots the user wants planned.
--                                        Defaults to {'breakfast','lunch','dinner'}.
--
--  Apply with: paste into Supabase SQL Editor, OR `supabase db push`.
-- =============================================================================

alter table public.recipes
  add column suitable_meals text[] not null default '{"dinner"}';

alter table public.profiles
  add column enabled_meals text[] not null default '{"breakfast","lunch","dinner"}';

-- Curate the 14 seed recipes so breakfast/lunch slots have real options.
-- Defaulted to {dinner}; below we widen the small subset that's clearly
-- suitable for other meals.

update public.recipes set suitable_meals = '{"breakfast","lunch"}'
  where visibility = 'system'
    and name in (
      'Caprese avocado toast',
      'Keto sausage and spinach egg bake'
    );

update public.recipes set suitable_meals = '{"lunch","dinner"}'
  where visibility = 'system'
    and name in (
      'Mediterranean grain bowl',
      'Hearty lentil soup',
      'Coconut chickpea curry'
    );
