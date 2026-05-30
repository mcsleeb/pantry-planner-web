// Data access for the global ingredient price cache.
//
// ingredient_prices is a SHARED cache, not per-user: all authenticated users
// can read it, and only the server (service-role key) writes to it. Prices
// are an estimate, so a shared cache avoids every user re-hitting the API
// for the same ingredient.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PriceEntry } from '../types'

/** Read cached prices for the given ingredient ids. Returns a map id → entry. */
export async function getPrices(
  supabase: SupabaseClient,
  ingredientIds: string[]
): Promise<Record<string, PriceEntry>> {
  if (ingredientIds.length === 0) return {}
  const { data, error } = await supabase
    .from('ingredient_prices')
    .select('*')
    .in('ingredient_id', ingredientIds)
  if (error || !data) {
    if (error) console.error('getPrices failed:', error)
    return {}
  }
  const out: Record<string, PriceEntry> = {}
  for (const row of data as any[]) {
    out[row.ingredient_id] = {
      ingredientId: row.ingredient_id,
      pricePerPackageCents: row.price_per_package_cents,
      source: row.source ?? 'spoonacular',
      fetchedAt: new Date(row.fetched_at).getTime()
    }
  }
  return out
}

/**
 * Write prices to the shared cache. Must be called with a SERVICE-ROLE client
 * — the RLS policy only allows the server to write here.
 */
export async function upsertPrices(
  serviceClient: SupabaseClient,
  entries: PriceEntry[]
): Promise<boolean> {
  if (entries.length === 0) return true
  const rows = entries.map(e => ({
    ingredient_id: e.ingredientId,
    price_per_package_cents: e.pricePerPackageCents,
    source: e.source,
    fetched_at: new Date(e.fetchedAt).toISOString()
  }))
  const { error } = await serviceClient
    .from('ingredient_prices')
    .upsert(rows, { onConflict: 'ingredient_id' })
  if (error) console.error('upsertPrices failed:', error)
  return !error
}
