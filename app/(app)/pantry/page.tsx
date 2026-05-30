import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPantry } from '@/lib/db/user'
import { loadCatalog } from '@/lib/data/catalog'
import { PantryClient } from './pantry-client'

// The Pantry page tracks what the user already has on hand. Items here are
// subtracted from the grocery list, and "use up" flags tell the planner to
// prioritize recipes that consume them.
export default async function PantryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [pantry, catalog] = await Promise.all([
    getPantry(supabase, user.id),
    loadCatalog(supabase, user.id)
  ])

  return <PantryClient pantry={pantry} catalog={catalog} />
}
