import type {
  Aisle,
  GroceryLineItem,
  GroceryList,
  Ingredient,
  PantryItem,
  PlannedMeal,
  PriceEntry,
  Recipe
} from './types'
import { INGREDIENTS } from './data/ingredients'
import { convert, convertWithDensity, unitsCompatible } from './units'

// =============================================================================
// THE CONSOLIDATOR — waste-minimization brain.
//
// Given a meal plan + recipe library, produces a single grocery list that:
//   1. Merges identical ingredients across recipes
//   2. Scales recipe amounts to actual planned servings
//   3. Subtracts what the user already has (pantry)
//   4. Rounds up to realistic store package sizes (waste signal)
//   5. Suggests reuse of leftovers across other recipes in the plan
//   6. Calculates estimated total cost when prices are available
//   7. Groups by store aisle for efficient shopping
// =============================================================================

export interface ConsolidatorOptions {
  pantry?: PantryItem[]
  prices?: Record<string, PriceEntry>
  /**
   * The ingredient catalog to use. Defaults to the static base catalog.
   * Pass a merged per-user catalog (loadCatalog) to support custom
   * ingredients and per-user package overrides.
   */
  catalog?: Record<string, Ingredient>
}

export function buildGroceryList(
  plan: PlannedMeal[],
  recipes: Recipe[],
  options: ConsolidatorOptions = {}
): GroceryList {
  const recipeById = new Map(recipes.map(r => [r.id, r]))
  const pantry = options.pantry ?? []
  const prices = options.prices ?? {}
  const catalog = options.catalog ?? INGREDIENTS

  // Step 1: accumulate raw ingredient demands across the plan.
  // Key by ingredientId; store amount in the ingredient's PACKAGE unit
  // (so we can round to packages cleanly later).
  type Demand = {
    amountInPackageUnit: number
    usedIn: Set<string> // recipe names
  }
  const demands = new Map<string, Demand>()

  for (const meal of plan) {
    const recipe = recipeById.get(meal.recipeId)
    if (!recipe) continue
    const scale = meal.servings / recipe.servings

    for (const ri of recipe.ingredients) {
      const ing = catalog[ri.ingredientId]
      if (!ing) {
        console.warn(`Unknown ingredient: ${ri.ingredientId}`)
        continue
      }

      let amountInPkgUnit: number
      if (unitsCompatible(ri.unit, ing.packageUnit)) {
        amountInPkgUnit = convert(ri.amount * scale, ri.unit, ing.packageUnit)
      } else {
        // Different unit families. Try density-aware conversion (e.g. cup of
        // flour → grams via density 0.53 → lb). Falls back to the spice/condiment
        // stub for ingredients without density (those are pantry staples the
        // user almost certainly already has).
        const bridged = convertWithDensity(
          ri.amount * scale,
          ri.unit,
          ing.packageUnit,
          ing.density
        )
        if (bridged !== null) {
          amountInPkgUnit = bridged
        } else if (ing.aisle === 'spices' || ing.aisle === 'condiments') {
          // Effectively zero — assumed to be on hand
          amountInPkgUnit = 0
        } else {
          amountInPkgUnit = ri.amount * scale
        }
      }

      const existing = demands.get(ri.ingredientId)
      if (existing) {
        existing.amountInPackageUnit += amountInPkgUnit
        existing.usedIn.add(recipe.name)
      } else {
        demands.set(ri.ingredientId, {
          amountInPackageUnit: amountInPkgUnit,
          usedIn: new Set([recipe.name])
        })
      }
    }
  }

  // Step 2: subtract pantry stock.
  for (const item of pantry) {
    const demand = demands.get(item.ingredientId)
    const ing = catalog[item.ingredientId]
    if (!demand || !ing) continue
    let stockInPkgUnit = 0
    if (unitsCompatible(item.unit, ing.packageUnit)) {
      stockInPkgUnit = convert(item.amount, item.unit, ing.packageUnit)
    } else {
      // Same density bridge as above. If we can't bridge, leave stock at 0
      // so we don't incorrectly mark the demand as satisfied.
      const bridged = convertWithDensity(
        item.amount,
        item.unit,
        ing.packageUnit,
        ing.density
      )
      if (bridged !== null) stockInPkgUnit = bridged
    }
    demand.amountInPackageUnit = Math.max(
      0,
      demand.amountInPackageUnit - stockInPkgUnit
    )
    if (demand.amountInPackageUnit === 0) demands.delete(item.ingredientId)
  }

  // Step 3: round to whole packages and compute leftover.
  const lineItems: GroceryLineItem[] = []
  for (const [ingId, demand] of demands) {
    const ing = catalog[ingId]!
    const needed = demand.amountInPackageUnit
    if (needed <= 0) continue   // skip phantom or fully-pantry-covered items
    const packages = Math.ceil(needed / ing.packageSize)
    const buyAmount = packages * ing.packageSize
    const leftover = Math.max(0, buyAmount - needed)

    const price = prices[ingId]
    const estimatedCostCents = price
      ? price.pricePerPackageCents * packages
      : undefined

    lineItems.push({
      ingredient: ing,
      neededAmount: round2(needed),
      neededUnit: ing.packageUnit,
      buyPackages: packages,
      buyAmount: round2(buyAmount),
      buyUnit: ing.packageUnit,
      leftoverAmount: round2(leftover),
      leftoverUnit: ing.packageUnit,
      usedIn: Array.from(demand.usedIn),
      estimatedCostCents
    })
  }

  // Step 4: leftover-reuse suggestions.
  const plannedRecipeIds = new Set(plan.map(p => p.recipeId))
  for (const item of lineItems) {
    const leftoverRatio = item.leftoverAmount / item.buyAmount
    if (leftoverRatio < 0.2) continue
    const matches = recipes.filter(r =>
      !plannedRecipeIds.has(r.id) &&
      r.ingredients.some(ri => ri.ingredientId === item.ingredient.id)
    )
    if (matches.length > 0) {
      const names = matches.slice(0, 2).map(r => r.name).join(', ')
      item.leftoverSuggestion = `Use leftover in: ${names}`
    }
  }

  // Step 5: group by aisle.
  const byAisle = {} as Record<Aisle, GroceryLineItem[]>
  const aisleOrder: Aisle[] = [
    'produce', 'meat', 'seafood', 'dairy', 'bakery',
    'pantry', 'frozen', 'spices', 'condiments'
  ]
  for (const a of aisleOrder) byAisle[a] = []
  for (const item of lineItems) byAisle[item.ingredient.aisle].push(item)
  for (const a of aisleOrder) {
    byAisle[a].sort((x, y) => x.ingredient.name.localeCompare(y.ingredient.name))
  }

  // Step 6: aggregate stats.
  let totalBuy = 0
  let totalLeftover = 0
  let totalCostCents = 0
  let costsKnown = 0
  for (const item of lineItems) {
    totalBuy += item.buyAmount
    totalLeftover += item.leftoverAmount
    if (item.estimatedCostCents !== undefined) {
      totalCostCents += item.estimatedCostCents
      costsKnown++
    }
  }
  const estimatedLeftoverPercent =
    totalBuy === 0 ? 0 : Math.round((totalLeftover / totalBuy) * 100)

  return {
    byAisle,
    totalItems: lineItems.length,
    estimatedLeftoverPercent,
    estimatedTotalCost: costsKnown > 0 ? totalCostCents : undefined
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
