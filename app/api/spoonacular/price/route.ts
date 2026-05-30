import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { priceIngredientLines, SpoonacularError } from '@/lib/spoonacular'
import { upsertPrices } from '@/lib/db/prices'
import type { PriceEntry } from '@/lib/types'

// POST /api/spoonacular/price
// Body: { items: { ingredientId: string; line: string }[] }
//   - ingredientId: our catalog/custom id, used as the cache key
//   - line: a human-readable ingredient string, e.g. "2 lb chicken breast"
//
// Fetches price estimates from Spoonacular, writes them into the shared
// ingredient_prices cache (service-role), and returns the prices.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { items?: { ingredientId: string; line: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  const items = body.items ?? []
  if (items.length === 0) {
    return NextResponse.json({ prices: {} })
  }

  try {
    const lines = items.map(i => i.line)
    const cents = await priceIngredientLines(lines)

    // Pair results back with our ids; skip any that priced to 0 (no estimate)
    const entries: PriceEntry[] = []
    items.forEach((item, i) => {
      const c = cents[i]
      if (typeof c === 'number' && c > 0) {
        entries.push({
          ingredientId: item.ingredientId,
          pricePerPackageCents: c,
          source: 'spoonacular',
          fetchedAt: Date.now()
        })
      }
    })

    // Persist to the shared cache (best-effort — pricing still returns on failure)
    try {
      const service = createServiceClient()
      await upsertPrices(service, entries)
    } catch (cacheErr) {
      console.error('price cache write failed (non-fatal):', cacheErr)
    }

    const prices: Record<string, PriceEntry> = {}
    for (const e of entries) prices[e.ingredientId] = e
    return NextResponse.json({ prices })
  } catch (err) {
    const status = err instanceof SpoonacularError ? err.status ?? 500 : 500
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status })
  }
}
