import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAllVisibleRecipes } from '@/lib/db/recipes'
import { getDislikes, getAllergens } from '@/lib/db/user'
import { getFolders, getFolderMemberships } from '@/lib/db/folders'
import { loadCatalog } from '@/lib/data/catalog'
import { RecipesClient } from './recipes-client'

// The Recipes page mirrors the desktop "library" view: a grid of every recipe
// the user can see, with folder, diet, tag, and free-text filters.
// Server component fetches in parallel; the client component handles interactions.
export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [recipes, dislikes, allergens, folders, memberships, catalog] =
    await Promise.all([
      getAllVisibleRecipes(supabase),
      getDislikes(supabase, user.id),
      getAllergens(supabase, user.id),
      getFolders(supabase, user.id),
      getFolderMemberships(supabase, user.id),
      loadCatalog(supabase, user.id)
    ])

  return (
    <RecipesClient
      recipes={recipes}
      dislikes={dislikes}
      allergens={allergens}
      folders={folders}
      memberships={memberships}
      catalog={catalog}
    />
  )
}
