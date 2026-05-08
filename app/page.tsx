import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="auth-brand">
          <div className="auth-brand-mark">P</div>
          <div className="auth-brand-name">Pantry Planner</div>
        </div>
        <div className="nav-actions">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/signup" className="btn btn-primary">Sign up</Link>
        </div>
      </nav>

      <main className="landing-hero">
        <div>
          <h1>
            Cook well.<br />
            Waste <span className="accent">less</span>.
          </h1>
          <p className="lead">
            Meal planning that respects what's already on your shelf. Pick a diet,
            generate a week, get a grocery list that knows what you have.
          </p>
          <div className="landing-cta">
            <Link href="/signup" className="btn btn-primary">Get started — it's free</Link>
            <Link href="/login" className="btn btn-ghost">I have an account</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
