import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActivePlan } from '@/lib/db/plans'
import { getAllVisibleRecipes } from '@/lib/db/recipes'
import { getPantry } from '@/lib/db/user'
import { getPrices } from '@/lib/db/prices'
import { loadCatalog } from '@/lib/data/catalog'
import { buildGroceryList } from '@/lib/consolidator'
import { GroceryClient } from './grocery-client'

// The Grocery page turns the active meal plan into a consolidated, waste-aware
// shopping list. All the heavy lifting is in lib/consolidator.ts — this page
// just gathers inputs and hands them over.
export default async function GroceryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [plan, recipes, pantry, catalog] = await Promise.all([
    getActivePlan(supabase, user.id),
    getAllVisibleRecipes(supabase),
    getPantry(supabase, user.id),
    loadCatalog(supabase, user.id)
  ])

  // No active plan → the client renders a friendly empty state.
  if (!plan || plan.plan.length === 0) {
    return <GroceryClient empty />
  }

  // Pull any cached prices for ingredients that appear in this plan.
  const ingredientIds = new Set<string>()
  const recipeById = new Map(recipes.map(r => [r.id, r]))
  for (const meal of plan.plan) {
    const r = recipeById.get(meal.recipeId)
    if (!r) continue
    for (const ri of r.ingredients) ingredientIds.add(ri.ingredientId)
  }
  const prices = await getPrices(supabase, [...ingredientIds])

  const groceryList = buildGroceryList(plan.plan, recipes, {
    pantry,
    prices,
    catalog
  })

  return (
    <GroceryClient
      groceryList={groceryList}
      planMeals={plan.plan}
      recipes={recipes}
      diet={plan.diet}
      servings={plan.servings}
      pantryCount={pantry.length}
      catalog={catalog}
    />
  )
}
