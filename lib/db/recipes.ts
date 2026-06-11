// Recipe data access. RLS handles visibility filtering automatically:
//   - System (seed) recipes always visible
//   - User's own recipes visible to them
//   - Public recipes (Phase 2 friend sharing) visible per RLS policy

import type { Recipe } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface RecipeRow {
  id: string
  owner_id: string | null
  name: string
  diets: string[]
  servings: number
  prep_minutes: number
  cook_minutes: number
  ingredients: any[]
  steps: string[]
  tags: string[] | null
  protein_tag: string | null
  source_provider: string | null
  source_external_id: string | null
  source_url: string | null
  estimated_cost_per_serving: number | null
  suitable_meals: string[] | null
  visibility: 'private' | 'public' | 'system'
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    diets: row.diets as any,
    servings: row.servings,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    ingredients: row.ingredients,
    steps: row.steps,
    tags: row.tags ?? undefined,
    proteinTag: (row.protein_tag ?? undefined) as any,
    estimatedCostPerServing: row.estimated_cost_per_serving ?? undefined,
    suitableMeals: (row.suitable_meals && row.suitable_meals.length > 0
      ? row.suitable_meals
      : ['dinner']) as Recipe['suitableMeals'],
    isCustom: row.visibility !== 'system',
    source: row.source_provider
      ? {
          provider: row.source_provider as 'spoonacular',
          externalId: Number(row.source_external_id),
          sourceUrl: row.source_url ?? undefined
        }
      : undefined
  }
}

/** Get all recipes the user can see (own + system + accepted-public from friends). */
export async function getAllVisibleRecipes(supabase: SupabaseClient): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('visibility', { ascending: false })  // system first, then public, then private
    .order('name', { ascending: true })
  if (error) {
    console.error('getAllVisibleRecipes failed:', error)
    return []
  }
  return (data as RecipeRow[]).map(rowToRecipe)
}

/** Get only the user's own recipes (excluding seed). */
export async function getOwnRecipes(
  supabase: SupabaseClient,
  userId: string
): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('owner_id', userId)
    .order('name', { ascending: true })
  if (error) return []
  return (data as RecipeRow[]).map(rowToRecipe)
}

/** Save a user-created or imported recipe. */
export async function createRecipe(
  supabase: SupabaseClient,
  userId: string,
  recipe: Omit<Recipe, 'id'>
): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      owner_id: userId,
      name: recipe.name,
      diets: recipe.diets,
      servings: recipe.servings,
      prep_minutes: recipe.prepMinutes,
      cook_minutes: recipe.cookMinutes,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      tags: recipe.tags ?? [],
      protein_tag: recipe.proteinTag ?? null,
      source_provider: recipe.source?.provider ?? null,
      source_external_id: recipe.source?.externalId
        ? String(recipe.source.externalId)
        : null,
      source_url: recipe.source?.sourceUrl ?? null,
      suitable_meals: recipe.suitableMeals ?? ['dinner'],
      visibility: 'private'
    })
    .select()
    .single()
  if (error) {
    console.error('createRecipe failed:', error)
    return null
  }
  return rowToRecipe(data as RecipeRow)
}

/** Delete one of the user's own recipes. RLS prevents deleting system/others'. */
export async function deleteRecipe(
  supabase: SupabaseClient,
  recipeId: string
): Promise<boolean> {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
  return !error
}
