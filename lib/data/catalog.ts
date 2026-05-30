// The merged ingredient catalog for a given user.
//
// The static base catalog (INGREDIENTS) is the same for everyone. On top of it,
// each user can have:
//   - custom ingredients   (rows in user_ingredients, id "user:<uuid>")
//   - package overrides    (rows in user_package_overrides — change the
//                           package size/unit of any ingredient, catalog or custom)
//
// loadCatalog() assembles all three into a single Record<string, Ingredient>
// that downstream code (consolidator, exclusions, recipe views) can treat
// exactly like the old static catalog.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Aisle, Allergen, Ingredient, Unit } from '../types'
import { INGREDIENTS } from './ingredients'

/** A user's full catalog: base + custom, with overrides applied. */
export type Catalog = Record<string, Ingredient>

interface UserIngredientRow {
  id: string
  name: string
  aisle: string
  package_size: number
  package_unit: string
  package_label: string | null
  allergens: string[] | null
  density: number | null
  calories_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
}

interface OverrideRow {
  ingredient_id: string
  package_size: number
  package_unit: string
  package_label: string | null
}

/** The id prefix that marks a custom (user-created) ingredient. */
export const CUSTOM_PREFIX = 'user:'

export function isCustomId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX)
}

function rowToIngredient(row: UserIngredientRow): Ingredient {
  return {
    id: `${CUSTOM_PREFIX}${row.id}`,
    name: row.name,
    aisle: row.aisle as Aisle,
    packageSize: row.package_size,
    packageUnit: row.package_unit as Unit,
    packageLabel: row.package_label ?? undefined,
    allergens: (row.allergens ?? undefined) as Allergen[] | undefined,
    density: row.density ?? undefined,
    isCustom: true,
    caloriesPer100g: row.calories_per_100g ?? undefined,
    proteinPer100g: row.protein_per_100g ?? undefined,
    carbsPer100g: row.carbs_per_100g ?? undefined,
    fatPer100g: row.fat_per_100g ?? undefined
  }
}

/**
 * Load the full merged catalog for a user.
 * Falls back gracefully: if the user has no customs/overrides (or the tables
 * don't exist yet), this just returns the base catalog.
 */
export async function loadCatalog(
  supabase: SupabaseClient,
  userId: string
): Promise<Catalog> {
  // Start from a shallow copy of the base catalog so we never mutate the import.
  const catalog: Catalog = {}
  for (const [id, ing] of Object.entries(INGREDIENTS)) {
    catalog[id] = { ...ing }
  }

  // Custom ingredients
  const { data: customRows, error: customErr } = await supabase
    .from('user_ingredients')
    .select('*')
    .eq('user_id', userId)
  if (customErr) {
    console.error('loadCatalog: user_ingredients fetch failed:', customErr)
  } else {
    for (const row of (customRows ?? []) as UserIngredientRow[]) {
      const ing = rowToIngredient(row)
      catalog[ing.id] = ing
    }
  }

  // Package overrides — applied last, on top of catalog OR custom entries
  const { data: overrideRows, error: ovErr } = await supabase
    .from('user_package_overrides')
    .select('ingredient_id, package_size, package_unit, package_label')
    .eq('user_id', userId)
  if (ovErr) {
    console.error('loadCatalog: user_package_overrides fetch failed:', ovErr)
  } else {
    for (const ov of (overrideRows ?? []) as OverrideRow[]) {
      const target = catalog[ov.ingredient_id]
      if (!target) continue // override for an ingredient we don't know — skip
      catalog[ov.ingredient_id] = {
        ...target,
        packageSize: ov.package_size,
        packageUnit: ov.package_unit as Unit,
        packageLabel: ov.package_label ?? target.packageLabel
      }
    }
  }

  return catalog
}
