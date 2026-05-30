import type { Allergen, Ingredient, Recipe } from './types'
import { INGREDIENTS } from './data/ingredients'

// =============================================================================
// EXCLUSION LOGIC
// What kinds of recipes the user can't (or won't) eat.
//
// Two flavors:
//   - dislikes:  ingredient ids to avoid (preference). Strict but soft.
//   - allergens: categories ('shellfish', 'dairy'). Strict and unmistakable
//                — the UI shows red badges, blocks adding to plan, etc.
//
// Both work the same way under the hood: a recipe is rejected if ANY
// of its ingredients matches the exclusion.
//
// CATALOG: every function takes an optional `catalog` argument. It defaults
// to the static base catalog so existing callers keep working unchanged.
// Callers that support custom ingredients pass the merged per-user catalog
// (see lib/data/catalog.ts → loadCatalog).
// =============================================================================

type Catalog = Record<string, Ingredient>

export interface ExclusionContext {
  /** Ingredient ids to exclude (dislikes) */
  dislikes?: string[]
  /** Allergen categories to exclude */
  allergens?: Allergen[]
}

export interface ExclusionResult {
  /** True if the recipe should be excluded */
  excluded: boolean
  /** Why it was excluded — for showing badges/messages */
  reasons: ExclusionReason[]
}

export type ExclusionReason =
  | { kind: 'dislike'; ingredientId: string; ingredientName: string }
  | { kind: 'allergen'; allergen: Allergen; ingredientId: string; ingredientName: string }
  | { kind: 'recipe-allergen'; allergen: Allergen }  // declared by recipe directly

export function checkExclusions(
  recipe: Recipe,
  ctx: ExclusionContext,
  catalog: Catalog = INGREDIENTS
): ExclusionResult {
  const reasons: ExclusionReason[] = []
  const dislikes = new Set(ctx.dislikes ?? [])
  const allergenSet = new Set(ctx.allergens ?? [])

  for (const ri of recipe.ingredients) {
    const ing = catalog[ri.ingredientId]
    if (!ing) continue

    if (dislikes.has(ri.ingredientId)) {
      reasons.push({
        kind: 'dislike',
        ingredientId: ri.ingredientId,
        ingredientName: ing.name
      })
    }

    if (ing.allergens && allergenSet.size > 0) {
      for (const a of ing.allergens) {
        if (allergenSet.has(a)) {
          reasons.push({
            kind: 'allergen',
            allergen: a,
            ingredientId: ri.ingredientId,
            ingredientName: ing.name
          })
        }
      }
    }
  }

  // Recipe-level allergens (e.g. set explicitly on imported recipes that
  // declare "this is a peanut recipe" without us knowing the ingredient list).
  // Currently not surfaced in our recipe shape; left as an extension point.

  return { excluded: reasons.length > 0, reasons }
}

/** Returns the subset of allergens this recipe contains, even when allergens isn't filtering. */
export function recipeAllergens(
  recipe: Recipe,
  catalog: Catalog = INGREDIENTS
): Allergen[] {
  const set = new Set<Allergen>()
  for (const ri of recipe.ingredients) {
    const ing = catalog[ri.ingredientId]
    if (!ing?.allergens) continue
    for (const a of ing.allergens) set.add(a)
  }
  return [...set]
}
