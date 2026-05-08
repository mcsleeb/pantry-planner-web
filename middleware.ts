// Middleware runs on every request. It:
//   1. Refreshes the Supabase auth session (extends the cookie's lifetime)
//   2. Redirects unauthenticated users away from app routes
//   3. Redirects authenticated users away from auth routes (e.g. /login → /plan)

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // Important: getUser() actually validates the JWT against Supabase.
  // getSession() only reads the cookie and is spoofable. Always use getUser.
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')
  const isAppRoute =
    url.pathname.startsWith('/plan') ||
    url.pathname.startsWith('/recipes') ||
    url.pathname.startsWith('/pantry') ||
    url.pathname.startsWith('/grocery') ||
    url.pathname.startsWith('/preferences')

  if (!user && isAppRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/plan', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Skip static assets and image optimization
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
