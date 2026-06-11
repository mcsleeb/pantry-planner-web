import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDislikes, getAllergens, getEnabledMeals } from '@/lib/db/user'
import { getPackageOverrides } from '@/lib/db/ingredients'
import { loadCatalog } from '@/lib/data/catalog'
import { PreferencesClient } from './preferences-client'

// Preferences: dislikes, allergens, enabled meal slots, and per-user package
// size overrides. Server component fetches in parallel; the client handles
// interactions.
export default async function PreferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [dislikes, allergens, enabledMeals, overrides, catalog] = await Promise.all([
    getDislikes(supabase, user.id),
    getAllergens(supabase, user.id),
    getEnabledMeals(supabase, user.id),
    getPackageOverrides(supabase, user.id),
    loadCatalog(supabase, user.id)
  ])

  return (
    <PreferencesClient
      dislikes={dislikes}
      allergens={allergens}
      enabledMeals={enabledMeals}
      overrides={overrides}
      catalog={catalog}
    />
  )
}
