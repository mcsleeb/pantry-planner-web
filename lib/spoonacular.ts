// =============================================================================
//  SPOONACULAR — server-side client.
//
//  The API key is stored in process.env.SPOONACULAR_API_KEY and never sent
//  to the browser. This file is imported by API routes (app/api/...) only.
//
//  Endpoints used:
//    - GET /recipes/complexSearch        (search by name + diet, ~1 pt)
//    - GET /recipes/{id}/information     (full recipe, ~1 pt)
//    - GET /recipes/extract              (URL extract, ~1 pt; supports Pinterest)
//    - POST /recipes/parseIngredients    (price per ingredient, ~0.01/result)
// =============================================================================

import 'server-only'
import type { Aisle, Diet, Recipe, RecipeIngredient, Unit } from './types'

const BASE = 'https://api.spoonacular.com'

export class SpoonacularError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'SpoonacularError'
  }
}

function getKey(): string {
  const key = process.env.SPOONACULAR_API_KEY
  if (!key) {
    throw new SpoonacularError('SPOONACULAR_API_KEY not configured on the server.')
  }
  return key
}

async function spoonFetch(
  path: string,
  params: Record<string, string | number | undefined> = {},
  init?: RequestInit
) {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('apiKey', getKey())
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString(), init)
  if (res.status === 401) throw new SpoonacularError('Server API key is invalid.', 401)
  if (res.status === 402) throw new SpoonacularError('Daily quota used up. Try again tomorrow.', 402)
  if (res.status === 429) throw new SpoonacularError('Rate limited. Try again in a moment.', 429)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new SpoonacularError(`Spoonacular ${res.status}: ${body}`, res.status)
  }
  return res.json()
}

// ----- Search ---------------------------------------------------------------
export interface SpoonSearchResult {
  id: number
  title: string
  image?: string
  readyInMinutes?: number
  servings?: number
}

export async function searchRecipes(
  query: string,
  diet?: Diet,
  number = 10
): Promise<SpoonSearchResult[]> {
  const data = await spoonFetch('/recipes/complexSearch', {
    query,
    diet: dietToSpoonacular(diet),
    number,
    addRecipeInformation: 'true',
    fillIngredients: 'false'
  })
  return (data.results ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    image: r.image,
    readyInMinutes: r.readyInMinutes,
    servings: r.servings
  }))
}

// ----- Full recipe import --------------------------------------------------
interface SpoonRecipeFull {
  id: number
  title: string
  servings: number
  readyInMinutes: number
  preparationMinutes?: number
  cookingMinutes?: number
  vegan?: boolean
  vegetarian?: boolean
  glutenFree?: boolean
  diets?: string[]
  sourceUrl?: string
  extendedIngredients: Array<{
    id: number
    name: string
    nameClean?: string
    amount: number
    unit: string
    aisle?: string
  }>
  analyzedInstructions?: Array<{
    steps: Array<{ number: number; step: string }>
  }>
  instructions?: string
}

export async function fetchRecipe(externalId: number): Promise<Recipe> {
  const data = (await spoonFetch(`/recipes/${externalId}/information`, {
    includeNutrition: 'false'
  })) as SpoonRecipeFull
  return spoonToRecipe(data)
}

export async function extractRecipeFromUrl(
  url: string,
  options: { fromVideo?: boolean } = {}
): Promise<Recipe> {
  const data = (await spoonFetch('/recipes/extract', {
    url,
    forceExtraction: 'false',
    analyze: 'true',
    includeNutrition: 'false',
    extractFromVideo: options.fromVideo ? 'true' : 'false'
  })) as SpoonRecipeFull
  if (!data || !data.title) {
    throw new SpoonacularError('Could not extract a recipe from that URL.')
  }
  return spoonToRecipe(data)
}

export function looksLikePinterest(url: string): boolean {
  try {
    const u = new URL(url)
    return /(^|\.)pinterest\.[a-z.]+$/i.test(u.hostname) || u.hostname === 'pin.it'
  } catch {
    return false
  }
}

// ----- Price estimation -----------------------------------------------------
// Returns map of ingredient name -> price in cents.
// Caller provides a list of "Xunit Y" lines (e.g., "1 lb chicken breast").
export async function priceIngredientLines(
  lines: string[]
): Promise<number[]> {
  if (lines.length === 0) return []
  const body = new URLSearchParams({
    ingredientList: lines.join('\n'),
    servings: '1',
    includeNutrition: 'false'
  })
  const data = await spoonFetch(
    '/recipes/parseIngredients',
    {},
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    }
  )
  if (!Array.isArray(data)) return lines.map(() => 0)
  return data.map((entry: any) => {
    const cents = entry?.estimatedCost?.value
    return typeof cents === 'number' && cents > 0 ? Math.round(cents) : 0
  })
}

// ----- Mapping helpers ------------------------------------------------------
function dietToSpoonacular(d: Diet | undefined): string | undefined {
  if (!d) return undefined
  switch (d) {
    case 'vegan': return 'vegan'
    case 'vegetarian': return 'vegetarian'
    case 'pescatarian': return 'pescetarian'
    case 'keto': return 'ketogenic'
    case 'mediterranean': return 'mediterranean'
    case 'gluten-free': return 'gluten free'
    case 'omnivore': return undefined
    default: return undefined
  }
}

function aisleFromSpoon(aisle?: string): Aisle {
  const a = (aisle ?? '').toLowerCase()
  if (a.includes('produce')) return 'produce'
  if (a.includes('meat')) return 'meat'
  if (a.includes('seafood') || a.includes('fish')) return 'seafood'
  if (a.includes('milk') || a.includes('cheese') || a.includes('dairy') || a.includes('egg')) return 'dairy'
  if (a.includes('bakery') || a.includes('bread')) return 'bakery'
  if (a.includes('frozen')) return 'frozen'
  if (a.includes('spice')) return 'spices'
  if (a.includes('condiment') || a.includes('oil') || a.includes('vinegar')) return 'condiments'
  return 'pantry'
}

function unitFromSpoon(u?: string): Unit {
  const s = (u ?? '').toLowerCase().trim()
  switch (s) {
    case '': case 'piece': case 'pieces': case 'whole': return 'whole'
    case 'clove': case 'cloves': return 'clove'
    case 'g': case 'gram': case 'grams': return 'g'
    case 'kg': case 'kilogram': case 'kilograms': return 'kg'
    case 'oz': case 'ounce': case 'ounces': return 'oz'
    case 'lb': case 'lbs': case 'pound': case 'pounds': return 'lb'
    case 'ml': case 'milliliter': case 'milliliters': return 'ml'
    case 'l': case 'liter': case 'liters': return 'l'
    case 'tsp': case 'teaspoon': case 'teaspoons': return 'tsp'
    case 'tbsp': case 'tablespoon': case 'tablespoons': return 'tbsp'
    case 'cup': case 'cups': return 'cup'
    default: return 'whole'
  }
}

function spoonToRecipe(data: SpoonRecipeFull): Recipe {
  const ingredients: RecipeIngredient[] = []
  for (const ei of data.extendedIngredients ?? []) {
    const id = `spoon-${ei.id ?? slug(ei.name)}`
    const unit = unitFromSpoon(ei.unit)
    ingredients.push({
      ingredientId: id,
      amount: ei.amount,
      unit
    })
  }

  const steps: string[] = []
  if (data.analyzedInstructions?.[0]?.steps?.length) {
    for (const s of data.analyzedInstructions[0].steps) steps.push(s.step)
  } else if (data.instructions) {
    const plain = data.instructions.replace(/<[^>]+>/g, '').trim()
    steps.push(...plain.split(/(?<=\.)\s+/).filter(Boolean))
  }

  const diets: Diet[] = []
  if (data.vegan) diets.push('vegan')
  if (data.vegetarian) diets.push('vegetarian')
  if (data.glutenFree) diets.push('gluten-free')
  if (data.diets?.includes('pescetarian')) diets.push('pescatarian')
  if (data.diets?.includes('mediterranean')) diets.push('mediterranean')
  if (data.diets?.includes('ketogenic')) diets.push('keto')
  if (diets.length === 0) diets.push('omnivore')

  const totalMinutes = data.readyInMinutes ?? 30
  const prep = data.preparationMinutes ?? Math.round(totalMinutes * 0.3)
  const cook = data.cookingMinutes ?? totalMinutes - prep

  return {
    id: `spoon-${data.id}`,
    name: data.title,
    diets,
    servings: data.servings ?? 4,
    prepMinutes: Math.max(prep, 0),
    cookMinutes: Math.max(cook, 0),
    ingredients,
    steps,
    isCustom: false,
    source: { provider: 'spoonacular', externalId: data.id, sourceUrl: data.sourceUrl }
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
