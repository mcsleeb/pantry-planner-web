// Per-user data: pantry, preferences, profile.

import type { Allergen, Diet, MealSlot, PantryItem, Unit } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
//  PROFILE
// =============================================================================

export interface Profile {
  id: string
  email: string
  display_name: string
  diet: Diet
  servings: number
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('getProfile failed:', error)
    return null
  }
  return data as Profile
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'diet' | 'servings'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return !error
}

// =============================================================================
//  PANTRY
// =============================================================================

export async function getPantry(
  supabase: SupabaseClient,
  userId: string
): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
  if (error) return []
  return (data ?? []).map((row: any) => ({
    ingredientId: row.ingredient_id,
    amount: Number(row.amount),
    unit: row.unit as Unit,
    addedAt: new Date(row.created_at).getTime(),
    useUp: row.use_up
  }))
}

export async function upsertPantryItem(
  supabase: SupabaseClient,
  userId: string,
  item: PantryItem
): Promise<boolean> {
  const { error } = await supabase
    .from('pantry_items')
    .upsert(
      {
        user_id: userId,
        ingredient_id: item.ingredientId,
        amount: item.amount,
        unit: item.unit,
        use_up: item.useUp ?? false
      },
      { onConflict: 'user_id,ingredient_id' }
    )
  return !error
}

export async function removePantryItem(
  supabase: SupabaseClient,
  userId: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('user_id', userId)
    .eq('ingredient_id', ingredientId)
  return !error
}

/** Remove every pantry item for the user. */
export async function clearPantry(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('user_id', userId)
  return !error
}

// =============================================================================
//  PREFERENCES (dislikes & allergens)
// =============================================================================

export async function getDislikes(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('dislikes')
    .select('ingredient_id')
    .eq('user_id', userId)
  if (error) return []
  return (data ?? []).map((r: any) => r.ingredient_id)
}

export async function addDislike(
  supabase: SupabaseClient,
  userId: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('dislikes')
    .insert({ user_id: userId, ingredient_id: ingredientId })
  return !error || error.code === '23505' // ignore unique violation
}

export async function removeDislike(
  supabase: SupabaseClient,
  userId: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('dislikes')
    .delete()
    .eq('user_id', userId)
    .eq('ingredient_id', ingredientId)
  return !error
}

export async function getAllergens(
  supabase: SupabaseClient,
  userId: string
): Promise<Allergen[]> {
  const { data, error } = await supabase
    .from('allergens')
    .select('allergen')
    .eq('user_id', userId)
  if (error) return []
  return (data ?? []).map((r: any) => r.allergen as Allergen)
}

export async function setAllergens(
  supabase: SupabaseClient,
  userId: string,
  allergens: Allergen[]
): Promise<boolean> {
  // Replace whole set: delete then insert
  await supabase.from('allergens').delete().eq('user_id', userId)
  if (allergens.length === 0) return true
  const { error } = await supabase
    .from('allergens')
    .insert(allergens.map(a => ({ user_id: userId, allergen: a })))
  return !error
}

// =============================================================================
//  ENABLED MEALS — which meal slots the user wants planned
// =============================================================================

/**
 * Read the user's enabled meal slots. Falls back to all three (which is also
 * the DB default for newly-created rows post-migration).
 */
export async function getEnabledMeals(
  supabase: SupabaseClient,
  userId: string
): Promise<MealSlot[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('enabled_meals')
    .eq('id', userId)
    .single()
  if (error || !data?.enabled_meals) {
    if (error) console.error('getEnabledMeals failed:', error)
    return ['breakfast', 'lunch', 'dinner']
  }
  return data.enabled_meals as MealSlot[]
}

/**
 * Write the user's enabled meal slots. At least one slot must remain enabled
 * (we don't allow an empty plan).
 */
export async function setEnabledMeals(
  supabase: SupabaseClient,
  userId: string,
  meals: MealSlot[]
): Promise<boolean> {
  const cleaned = meals.length === 0 ? (['dinner'] as MealSlot[]) : meals
  const { error } = await supabase
    .from('profiles')
    .update({ enabled_meals: cleaned })
    .eq('id', userId)
  if (error) console.error('setEnabledMeals failed:', error)
  return !error
}
