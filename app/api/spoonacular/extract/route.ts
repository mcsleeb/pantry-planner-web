import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractRecipeFromUrl,
  fetchRecipe,
  SpoonacularError
} from '@/lib/spoonacular'

// POST /api/spoonacular/extract
// Body: { url?: string; fromVideo?: boolean; externalId?: number }
//
// Two modes:
//   - { url } extracts from any recipe page (including Pinterest pins).
//     If fromVideo=true, Spoonacular tries to extract from a video URL (Instagram/TikTok).
//   - { externalId } pulls the full recipe for a known Spoonacular id (used after search).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { url?: string; fromVideo?: boolean; externalId?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }

  try {
    if (body.externalId) {
      const recipe = await fetchRecipe(body.externalId)
      return NextResponse.json({ recipe })
    }
    if (body.url) {
      const recipe = await extractRecipeFromUrl(body.url, {
        fromVideo: !!body.fromVideo
      })
      return NextResponse.json({ recipe })
    }
    return NextResponse.json({ error: 'missing url or externalId' }, { status: 400 })
  } catch (err) {
    const status = err instanceof SpoonacularError ? err.status ?? 500 : 500
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status })
  }
}
