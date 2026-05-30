// Folder data access. Folders are per-user; the SQL RLS policies enforce
// "users only see their own folders" so app code can't accidentally leak.
//
// A folder is a labeled bag of recipes. A recipe can be in many folders.
// System (seed) recipes can be filed into a user's folders just like custom
// recipes — the membership lives in folder_recipes, not on the recipe row.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface Folder {
  id: string
  name: string
  recipeCount: number
}

/**
 * Map of recipeId → folderIds containing it.
 * Used to render folder badges on cards and pre-check the right
 * checkboxes in the "Add to folder" popover.
 */
export type FolderMemberships = Record<string, string[]>

/** List the user's folders, with recipe counts. Alphabetized. */
export async function getFolders(
  supabase: SupabaseClient,
  userId: string
): Promise<Folder[]> {
  // Fetch folders, then counts. Two cheap queries — easier than a brittle join.
  const { data: folderRows, error: fErr } = await supabase
    .from('folders')
    .select('id, name')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (fErr || !folderRows) {
    if (fErr) console.error('getFolders failed:', fErr)
    return []
  }
  if (folderRows.length === 0) return []

  const ids = folderRows.map((f: any) => f.id as string)
  const { data: memberships } = await supabase
    .from('folder_recipes')
    .select('folder_id')
    .in('folder_id', ids)

  const counts = new Map<string, number>()
  for (const m of (memberships ?? []) as { folder_id: string }[]) {
    counts.set(m.folder_id, (counts.get(m.folder_id) ?? 0) + 1)
  }
  return folderRows.map((f: any) => ({
    id: f.id,
    name: f.name,
    recipeCount: counts.get(f.id) ?? 0
  }))
}

/**
 * Get every membership for the user, keyed by recipe id.
 * Cheap call — folders are small. Sized in the dozens at most.
 */
export async function getFolderMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<FolderMemberships> {
  // We have to filter through folders since folder_recipes doesn't store user_id.
  // RLS would do it for us, but being explicit avoids one extra round-trip
  // if the user has many folders.
  const { data, error } = await supabase
    .from('folder_recipes')
    .select('recipe_id, folder_id, folders!inner(user_id)')
    .eq('folders.user_id', userId)
  if (error || !data) {
    if (error) console.error('getFolderMemberships failed:', error)
    return {}
  }
  const out: FolderMemberships = {}
  for (const row of data as { recipe_id: string; folder_id: string }[]) {
    if (!out[row.recipe_id]) out[row.recipe_id] = []
    out[row.recipe_id].push(row.folder_id)
  }
  return out
}

export async function createFolder(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<Folder | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: userId, name: trimmed })
    .select('id, name')
    .single()
  if (error) {
    console.error('createFolder failed:', error)
    return null
  }
  return { id: data.id, name: data.name, recipeCount: 0 }
}

export async function renameFolder(
  supabase: SupabaseClient,
  folderId: string,
  newName: string
): Promise<boolean> {
  const trimmed = newName.trim()
  if (!trimmed) return false
  const { error } = await supabase
    .from('folders')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', folderId)
  return !error
}

export async function deleteFolder(
  supabase: SupabaseClient,
  folderId: string
): Promise<boolean> {
  // folder_recipes rows cascade away via the FK
  const { error } = await supabase.from('folders').delete().eq('id', folderId)
  return !error
}

export async function addRecipeToFolder(
  supabase: SupabaseClient,
  folderId: string,
  recipeId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('folder_recipes')
    .insert({ folder_id: folderId, recipe_id: recipeId })
  // Unique-violation = "already in this folder", treat as success
  return !error || error.code === '23505'
}

export async function removeRecipeFromFolder(
  supabase: SupabaseClient,
  folderId: string,
  recipeId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('folder_recipes')
    .delete()
    .eq('folder_id', folderId)
    .eq('recipe_id', recipeId)
  return !error
}
