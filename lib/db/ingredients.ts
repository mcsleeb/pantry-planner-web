// Data access for user-created ingredients and per-user package overrides.
// RLS keeps every row scoped to its owner; app code can't leak across users.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Aisle, Allergen, Ingredient, Unit } from '../types'

export interface NewCustomIngredient {
  name: string
  aisle: Aisle
  packageSize: number
  packageUnit: Unit
  packageLabel?: string
  allergens?: Allergen[]
  density?: number
}

/**
 * Create a custom ingredient for the user.
 * Returns the new Ingredient (with its "user:<uuid>" id) or null on failure.
 */
export async function createCustomIngredient(
  supabase: SupabaseClient,
  userId: string,
  input: NewCustomIngredient
): Promise<Ingredient | null> {
  const name = input.name.trim()
  if (!name) return null

  const { data, error } = await supabase
    .from('user_ingredients')
    .insert({
      user_id: userId,
      name,
      aisle: input.aisle,
      package_size: input.packageSize,
      package_unit: input.packageUnit,
      package_label: input.packageLabel ?? null,
      allergens: input.allergens ?? [],
      density: input.density ?? null
    })
    .select('*')
    .single()

  if (error) {
    console.error('createCustomIngredient failed:', error)
    return null
  }

  return {
    // The DB returns a bare uuid; the app references customs as "user:<uuid>"
    id: `user:${data.id}`,
    name: data.name,
    aisle: data.aisle as Aisle,
    packageSize: data.package_size,
    packageUnit: data.package_unit as Unit,
    packageLabel: data.package_label ?? undefined,
    allergens: (data.allergens ?? undefined) as Allergen[] | undefined,
    density: data.density ?? undefined,
    isCustom: true
  }
}

/** List the user's custom ingredients. */
export async function getCustomIngredients(
  supabase: SupabaseClient,
  userId: string
): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('user_ingredients')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (error || !data) {
    if (error) console.error('getCustomIngredients failed:', error)
    return []
  }
  return data.map((row: any) => ({
    id: `user:${row.id}`,
    name: row.name,
    aisle: row.aisle as Aisle,
    packageSize: row.package_size,
    packageUnit: row.package_unit as Unit,
    packageLabel: row.package_label ?? undefined,
    allergens: (row.allergens ?? undefined) as Allergen[] | undefined,
    density: row.density ?? undefined,
    isCustom: true
  }))
}

/** Set (or replace) a package override for any ingredient id. */
export async function setPackageOverride(
  supabase: SupabaseClient,
  userId: string,
  ingredientId: string,
  override: { packageSize: number; packageUnit: Unit; packageLabel?: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('user_package_overrides')
    .upsert({
      user_id: userId,
      ingredient_id: ingredientId,
      package_size: override.packageSize,
      package_unit: override.packageUnit,
      package_label: override.packageLabel ?? null,
      updated_at: new Date().toISOString()
    })
  if (error) console.error('setPackageOverride failed:', error)
  return !error
}

/** Remove a package override, reverting to the catalog/custom default. */
export async function clearPackageOverride(
  supabase: SupabaseClient,
  userId: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_package_overrides')
    .delete()
    .eq('user_id', userId)
    .eq('ingredient_id', ingredientId)
  if (error) console.error('clearPackageOverride failed:', error)
  return !error
}

/** A user's package override for one ingredient. */
export interface PackageOverride {
  ingredientId: string
  packageSize: number
  packageUnit: Unit
  packageLabel?: string
}

/** Read all of a user's package overrides (for displaying in Preferences). */
export async function getPackageOverrides(
  supabase: SupabaseClient,
  userId: string
): Promise<PackageOverride[]> {
  const { data, error } = await supabase
    .from('user_package_overrides')
    .select('ingredient_id, package_size, package_unit, package_label')
    .eq('user_id', userId)
  if (error || !data) {
    if (error) console.error('getPackageOverrides failed:', error)
    return []
  }
  return data.map((row: any) => ({
    ingredientId: row.ingredient_id,
    packageSize: Number(row.package_size),
    packageUnit: row.package_unit as Unit,
    packageLabel: row.package_label ?? undefined
  }))
}

// ---------------------------------------------------------------------------
// Editing & removing custom ingredients
//
// Custom ingredient ids are "user:<uuid>" in app code, but the DB row id is
// the bare uuid. stripCustomPrefix bridges the two.
// ---------------------------------------------------------------------------

function stripCustomPrefix(id: string): string {
  return id.startsWith('user:') ? id.slice('user:'.length) : id
}

/** Update an existing custom ingredient. `id` may be prefixed or bare. */
export async function updateCustomIngredient(
  supabase: SupabaseClient,
  id: string,
  patch: NewCustomIngredient
): Promise<boolean> {
  const name = patch.name.trim()
  if (!name) return false
  const { error } = await supabase
    .from('user_ingredients')
    .update({
      name,
      aisle: patch.aisle,
      package_size: patch.packageSize,
      package_unit: patch.packageUnit,
      package_label: patch.packageLabel ?? null,
      allergens: patch.allergens ?? [],
      density: patch.density ?? null
    })
    .eq('id', stripCustomPrefix(id))
  if (error) console.error('updateCustomIngredient failed:', error)
  return !error
}

/**
 * Delete a custom ingredient. `id` may be prefixed or bare.
 * NOTE: callers must check for recipe usage first — there is no FK from
 * recipes to user_ingredients, so the DB will not block this on its own.
 */
export async function deleteCustomIngredient(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const bare = stripCustomPrefix(id)
  // Also clear any package override keyed on the prefixed id
  await supabase
    .from('user_package_overrides')
    .delete()
    .eq('ingredient_id', id)
  const { error } = await supabase
    .from('user_ingredients')
    .delete()
    .eq('id', bare)
  if (error) console.error('deleteCustomIngredient failed:', error)
  return !error
}
