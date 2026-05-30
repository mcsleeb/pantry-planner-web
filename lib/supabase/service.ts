// Service-role Supabase client. BYPASSES Row-Level Security.
//
// Use ONLY in server-side code (API routes) for operations that legitimately
// need to write data no normal user may write — e.g. the shared
// ingredient_prices cache, whose RLS policy blocks all client writes.
//
// NEVER import this into a 'use client' component. The service-role key must
// never reach the browser. It is read from a server-only env var.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Service client unavailable: NEXT_PUBLIC_SUPABASE_URL or ' +
      'SUPABASE_SERVICE_ROLE_KEY is not set.'
    )
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
