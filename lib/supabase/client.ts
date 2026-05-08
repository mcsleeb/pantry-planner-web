// Client-side Supabase. Used in 'use client' components for auth and reads.
// Only the anon key is exposed (this is fine — RLS protects the data).

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
