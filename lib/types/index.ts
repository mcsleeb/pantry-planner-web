// The vocabulary the whole app shares. Keep this stable.

export type Diet =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'keto'
  | 'mediterranean'
  | 'gluten-free'

export type Aisle =
  | 'produce'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'pantry'
  | 'bakery'
  | 'frozen'
  | 'spices'
  | 'condiments'

// Major allergen categories. We map ingredients to these so that excluding
// "shellfish" automatically excludes shrimp, crab, lobster, etc.
export type Allergen =
  | 'peanut'
  | 'tree-nut'
  | 'shellfish'
  | 'fish'
  | 'dairy'
  | 'egg'
  | 'gluten'
  | 'soy'
  | 'sesame'

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  peanut: 'Peanuts',
  'tree-nut': 'Tree nuts',
  shellfish: 'Shellfish',
  fish: 'Fish',
  dairy: 'Dairy',
  egg: 'Eggs',
  gluten: 'Gluten',
  soy: 'Soy',
  sesame: 'Sesame'
}

// Units we know how to convert between.
// Volume and weight live in separate families — converting between them
// requires per-ingredient density (see Ingredient.density). Most ingredients
// have no density, so cross-family conversion stays unavailable.
export type Unit =
  // count
  | 'whole'
  | 'clove'
  // weight
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  // volume — metric
  | 'ml'
  | 'l'
  // volume — US customary, by ascending size
  | 'fl_dr'   // fluid dram (small; sometimes seen on bitters or extracts)
  | 'tsp'
  | 'tbsp'
  | 'fl_oz'   // US fluid ounce (1 cup = 8 fl_oz)
  | 'cup'
  | 'pt'      // pint (2 cups)
  | 'qt'      // quart (4 cups)
  | 'gal'     // gallon (16 cups)

export interface Ingredient {
  id: string              // canonical id, e.g. "yellow-onion"
  name: string            // display name
  aisle: Aisle
  // What you actually have to buy at the store. Used to round up.
  packageSize: number
  packageUnit: Unit
  // For nice display: "1 lb package", "5 lb bag"
  packageLabel?: string
  // Allergen categories this ingredient belongs to (used by exclusion logic).
  // Most ingredients have none; only set this for ingredients in a major
  // allergen group.
  allergens?: Allergen[]
  // Grams per milliliter — required to convert between volume and weight.
  // Only set for ingredients where volume↔weight conversion is meaningful
  // (e.g. flour, butter, honey). Approximate values are fine for grocery math.
  density?: number
  // True for user-created ingredients (id begins "user:"). Catalog items omit it.
  isCustom?: boolean
  // Nutrition — RESERVED for a future nutrition round. All optional, all on a
  // per-100g basis. Not collected in the UI yet; defined here so adding
  // nutrition later needs no type migration.
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
}

export interface RecipeIngredient {
  ingredientId: string
  amount: number
  unit: Unit
  // Optional: "1/2 onion, diced" — purely for display
  prepNote?: string
}

export interface Recipe {
  id: string
  name: string
  diets: Diet[]            // which diets this recipe satisfies
  servings: number
  prepMinutes: number
  cookMinutes: number
  ingredients: RecipeIngredient[]
  steps: string[]
  // Used for variety constraints: don't pick two beef dishes in a row
  proteinTag?: 'beef' | 'chicken' | 'pork' | 'fish' | 'tofu' | 'beans' | 'eggs' | 'none'
  tags?: string[]          // freeform: "quick", "comfort", "summer"
  // Optional price-per-serving estimate (cents) — populated by the price API
  estimatedCostPerServing?: number
  // True if user added this recipe; helps separate seed data from user content
  isCustom?: boolean
  // For recipes pulled from an external source
  source?: { provider: 'spoonacular'; externalId: number; sourceUrl?: string }
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export interface PlannedMeal {
  day: DayOfWeek
  slot: MealSlot
  recipeId: string
  servings: number   // scale recipe to this many servings
}

export interface GroceryLineItem {
  ingredient: Ingredient
  // What the recipes called for, in canonical units
  neededAmount: number
  neededUnit: Unit
  // What you actually buy (rounded to packages)
  buyPackages: number
  buyAmount: number
  buyUnit: Unit
  // How much extra you'll have after cooking — the waste signal
  leftoverAmount: number
  leftoverUnit: Unit
  // Recipes this ingredient is used in (so user sees: "for: pasta, stir fry")
  usedIn: string[]   // recipe names
  // If the leftover could be used in another recipe in the plan, suggest it
  leftoverSuggestion?: string
  // Optional price estimate (cents) for the rounded-up purchase quantity
  estimatedCostCents?: number
}

export interface GroceryList {
  byAisle: Record<Aisle, GroceryLineItem[]>
  totalItems: number
  // Estimated total leftover weight as a waste indicator
  estimatedLeftoverPercent: number
  // Optional total cost estimate (cents) — populated when prices are available
  estimatedTotalCost?: number
}

// What the user already has in their kitchen.
// Keyed by ingredientId → amount in the ingredient's package unit (or any
// compatible unit; the consolidator converts).
export interface PantryItem {
  ingredientId: string
  amount: number
  unit: Unit
  addedAt: number  // ms timestamp
  /** When true, the planner treats this as a "use up first" priority */
  useUp?: boolean
}

// Cached price lookup result from the pricing API
export interface PriceEntry {
  ingredientId: string
  // Cents per package (so $2.99 -> 299)
  pricePerPackageCents: number
  source: 'spoonacular' | 'manual'
  fetchedAt: number  // ms timestamp
}
