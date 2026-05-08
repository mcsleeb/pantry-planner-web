import type { Allergen, DayOfWeek, Diet, MealSlot, PantryItem, PlannedMeal, Recipe } from './types'
import { checkExclusions } from './exclusions'

export const DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
}

export function recipesForDiet(recipes: Recipe[], diet: Diet): Recipe[] {
  return recipes.filter(r => r.diets.includes(diet))
}

export interface GenerateOptions {
  pantry?: PantryItem[]
  /** Additional weight given to recipes that use these ingredient ids */
  pantryWeight?: number
  /** Heavy bonus for recipes using these ids — the "use up" list */
  useUpIds?: string[]
  /** Ingredient ids to exclude (dislikes) */
  excludeIngredients?: string[]
  /** Allergens to exclude */
  excludeAllergens?: Allergen[]
}

// Generate a week of dinners with variety + pantry-aware scoring:
//   - Don't repeat the same protein on consecutive days
//   - Don't repeat the exact same recipe within the week
//   - Reward recipes that share ingredients with already-picked recipes (overlap)
//   - Reward recipes that USE ingredients already in the pantry
//   - Heavily reward recipes that use "use up" ingredients
export function generateWeek(
  recipes: Recipe[],
  diet: Diet,
  servings: number,
  slot: MealSlot = 'dinner',
  options: GenerateOptions = {}
): PlannedMeal[] {
  // Filter recipes by diet AND by exclusions before any scoring.
  // Exclusions are hard filters — there's no "score down a sweet potato recipe",
  // it's either acceptable or it isn't.
  const dietMatches = recipesForDiet(recipes, diet)
  const candidates = dietMatches.filter(r => !checkExclusions(r, {
    dislikes: options.excludeIngredients,
    allergens: options.excludeAllergens
  }).excluded)
  if (candidates.length === 0) return []

  const pantryIds = new Set((options.pantry ?? []).map(p => p.ingredientId))
  const useUpIds = new Set(options.useUpIds ?? [])
  // Default weights — tuned from light testing.
  // Pantry: noticeable but not overwhelming (the user still wants variety)
  // Use-up: heavy enough that flagged items dominate selection for the first
  //   few days of the week, then peters out as those ingredients get consumed.
  const pantryWeight = options.pantryWeight ?? 0.6
  const useUpWeight = 4.0

  const plan: PlannedMeal[] = []
  const used = new Set<string>()
  const recentProteins: string[] = []
  // Track which use-up items have been "consumed" by the plan so we don't
  // pile every use-up item into Monday alone.
  const consumedUseUp = new Set<string>()

  for (const day of DAYS) {
    const exhausted = used.size >= candidates.length
    const recentRecipeIds = new Set(plan.slice(-2).map(p => p.recipeId))

    const pool = exhausted
      ? candidates.filter(r => !recentRecipeIds.has(r.id))
      : candidates.filter(r => !used.has(r.id))

    // Score each candidate. LOWER is better.
    const scored = pool
      .map(r => {
        let score = Math.random() * 0.5 // tiebreak randomness

        // Avoid same-protein streaks
        if (r.proteinTag) {
          if (recentProteins[recentProteins.length - 1] === r.proteinTag) score += 10
          if (recentProteins[recentProteins.length - 2] === r.proteinTag) score += 3
        }

        // Reward overlap with already-picked recipes (smaller grocery list)
        const overlap = countIngredientOverlap(r, plan, recipes)
        score -= overlap * 0.3

        // Reward use of pantry items
        let pantryHits = 0
        let useUpHits = 0
        for (const ri of r.ingredients) {
          if (pantryIds.has(ri.ingredientId)) pantryHits++
          if (useUpIds.has(ri.ingredientId) && !consumedUseUp.has(ri.ingredientId)) useUpHits++
        }
        score -= pantryHits * pantryWeight
        score -= useUpHits * useUpWeight

        return { r, score, useUpHits }
      })
      .sort((a, b) => a.score - b.score)

    const best = scored[0]
    const pick = best?.r ?? candidates[Math.floor(Math.random() * candidates.length)]!
    if (!exhausted) used.add(pick.id)

    // Mark this pick's use-up items as consumed so subsequent days don't
    // double-count them (the ingredient is already "spoken for").
    if (best && best.useUpHits > 0) {
      for (const ri of pick.ingredients) {
        if (useUpIds.has(ri.ingredientId)) consumedUseUp.add(ri.ingredientId)
      }
    }

    plan.push({
      day,
      slot,
      recipeId: pick.id,
      servings
    })
    if (pick.proteinTag) {
      recentProteins.push(pick.proteinTag)
      if (recentProteins.length > 2) recentProteins.shift()
    }
  }
  return plan
}

function countIngredientOverlap(
  candidate: Recipe,
  plan: PlannedMeal[],
  allRecipes: Recipe[]
): number {
  const planIngredients = new Set<string>()
  for (const m of plan) {
    const r = allRecipes.find(x => x.id === m.recipeId)
    if (!r) continue
    for (const ri of r.ingredients) planIngredients.add(ri.ingredientId)
  }
  let count = 0
  for (const ri of candidate.ingredients) {
    if (planIngredients.has(ri.ingredientId)) count++
  }
  return count
}

// =============================================================================
// "Cook from pantry" mode — recipes you can make right now
// =============================================================================
export interface PantryMatch {
  recipe: Recipe
  /** 0..1 — fraction of recipe ingredients covered by pantry */
  coverage: number
  /** ingredient ids missing from pantry */
  missing: string[]
  haveCount: number
  totalCount: number
}

// Find recipes that the pantry can make (or nearly make).
// minCoverage: 1.0 means "no shopping required", 0.7 means "at most 30% missing"
// Pantry-staple ingredients (spices, condiments) are always assumed available
// since the consolidator treats them that way.
export function recipesFromPantry(
  recipes: Recipe[],
  pantry: PantryItem[],
  options: {
    minCoverage?: number
    diet?: Diet
    excludeIngredients?: string[]
    excludeAllergens?: Allergen[]
  } = {}
): PantryMatch[] {
  const minCoverage = options.minCoverage ?? 0.7
  const pantryIds = new Set(pantry.map(p => p.ingredientId))
  let pool = options.diet ? recipesForDiet(recipes, options.diet) : recipes
  // Honor exclusions in pantry mode too — no point suggesting a sweet potato
  // recipe if the user dislikes them.
  pool = pool.filter(r => !checkExclusions(r, {
    dislikes: options.excludeIngredients,
    allergens: options.excludeAllergens
  }).excluded)

  const matches: PantryMatch[] = []
  for (const r of pool) {
    // Only count "real" ingredients — spices/condiments assumed present
    const realIngredients = r.ingredients.filter(ri => {
      const id = ri.ingredientId
      // Hardcoded staples list (mirror of consolidator's staple-aisle logic)
      // Better: import INGREDIENTS and check by aisle, but we keep the
      // dependency direction clean (planner doesn't depend on data).
      return !STAPLE_INGREDIENT_IDS.has(id)
    })
    const total = realIngredients.length
    if (total === 0) continue

    let have = 0
    const missing: string[] = []
    for (const ri of realIngredients) {
      if (pantryIds.has(ri.ingredientId)) have++
      else missing.push(ri.ingredientId)
    }
    const coverage = have / total
    if (coverage >= minCoverage) {
      matches.push({
        recipe: r,
        coverage,
        missing,
        haveCount: have,
        totalCount: total
      })
    }
  }

  // Sort: best coverage first, then fewer total ingredients (simpler recipes)
  matches.sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage
    return a.totalCount - b.totalCount
  })
  return matches
}

// Simple list of pantry-staple ingredient ids that the consolidator treats
// as always-available. Kept here to avoid the planner needing to import
// the ingredient catalog.
const STAPLE_INGREDIENT_IDS = new Set([
  'salt', 'black-pepper', 'cumin', 'paprika', 'oregano', 'red-pepper-flakes',
  'olive-oil', 'soy-sauce', 'tamari', 'dijon', 'vinegar-balsamic'
])

// =============================================================================
// LABELS
// =============================================================================
export const DIET_LABELS: Record<Diet, string> = {
  omnivore: 'Omnivore',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  keto: 'Keto',
  mediterranean: 'Mediterranean',
  'gluten-free': 'Gluten-Free'
}

export const DIET_DESCRIPTIONS: Record<Diet, string> = {
  omnivore: 'Anything goes — meat, fish, plants, dairy.',
  vegetarian: 'No meat or fish. Dairy and eggs welcome.',
  vegan: 'Plant-based only.',
  pescatarian: 'Vegetarian plus fish and seafood.',
  keto: 'Very low carb, high fat.',
  mediterranean: 'Olive oil, fish, legumes, vegetables, whole grains.',
  'gluten-free': 'No wheat, barley, rye.'
}
