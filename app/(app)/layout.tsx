import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/db/user'
import { LogoutButton } from '@/components/LogoutButton'
import { TopbarControls } from '@/components/TopbarControls'

export default async function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(supabase, user.id)

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/plan" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">Pantry Planner</div>
            <div className="brand-tag">{profile?.display_name ? `welcome, ${profile.display_name}` : 'a small, careful kitchen'}</div>
          </div>
        </Link>

        <nav className="nav">
          <Link href="/plan" className="nav-tab">The Week</Link>
          <Link href="/recipes" className="nav-tab">Recipes</Link>
          <Link href="/pantry" className="nav-tab">Pantry</Link>
          <Link href="/grocery" className="nav-tab">Grocery List</Link>
          <Link href="/preferences" className="nav-tab">Preferences</Link>
          <LogoutButton />
        </nav>

        <TopbarControls
          initialDiet={profile?.diet ?? 'omnivore'}
          initialServings={profile?.servings ?? 4}
        />
      </header>

      <main className="main">{children}</main>
    </div>
  )
}
