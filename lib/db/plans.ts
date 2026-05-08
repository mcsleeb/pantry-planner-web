// Data access for meal plans. Used by both server components (for initial load)
// and client components (for save).

import type { Diet, PlannedMeal } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MealPlanRow {
  id: string
  name: string
  diet: Diet
  servings: number
  plan: PlannedMeal[]
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Get the user's currently active meal plan, if any. */
export async function getActivePlan(
  supabase: SupabaseClient,
  userId: string
): Promise<MealPlanRow | null> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('getActivePlan failed:', error)
    return null
  }
  return data as MealPlanRow | null
}

/** Save the user's plan, replacing the active one. */
export async function saveActivePlan(
  supabase: SupabaseClient,
  userId: string,
  diet: Diet,
  servings: number,
  plan: PlannedMeal[]
): Promise<MealPlanRow | null> {
  // Mark older plans inactive
  await supabase
    .from('meal_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  // Insert the new active plan
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      name: 'Weekly plan',
      diet,
      servings,
      plan,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('saveActivePlan failed:', error)
    return null
  }
  return data as MealPlanRow
}

/** Update the plan in place (e.g., when swapping a single meal). */
export async function updatePlan(
  supabase: SupabaseClient,
  planId: string,
  patch: Partial<Pick<MealPlanRow, 'plan' | 'diet' | 'servings'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('meal_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (error) {
    console.error('updatePlan failed:', error)
    return false
  }
  return true
}

/** Clear the active plan (mark inactive — keeps it for history). */
export async function clearActivePlan(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('meal_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  if (error) {
    console.error('clearActivePlan failed:', error)
    return false
  }
  return true
}
