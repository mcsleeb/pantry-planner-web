import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActivePlan } from '@/lib/db/plans'
import { getAllVisibleRecipes } from '@/lib/db/recipes'
import { getProfile, getPantry, getDislikes, getAllergens } from '@/lib/db/user'
import { PlanClient } from './plan-client'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch everything the page needs in parallel
  const [profile, plan, recipes, pantry, dislikes, allergens] = await Promise.all([
    getProfile(supabase, user.id),
    getActivePlan(supabase, user.id),
    getAllVisibleRecipes(supabase),
    getPantry(supabase, user.id),
    getDislikes(supabase, user.id),
    getAllergens(supabase, user.id)
  ])

  return (
    <PlanClient
      profile={profile!}
      initialPlan={plan}
      recipes={recipes}
      pantry={pantry}
      dislikes={dislikes}
      allergens={allergens}
    />
  )
}
