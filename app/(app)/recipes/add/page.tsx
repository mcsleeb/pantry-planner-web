import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddRecipeClient } from './add-recipe-client'

export default async function AddRecipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <AddRecipeClient />
}
