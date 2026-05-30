'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ModeUrl } from './mode-url'
import { ModeSearch } from './mode-search'
import { ModeManual } from './mode-manual'
import { ManageIngredientsModal } from './manage-ingredients-modal'

type Mode = 'url' | 'search' | 'manual'

export function AddRecipeClient() {
  const [mode, setMode] = useState<Mode>('url')
  const [showManage, setShowManage] = useState(false)
  const router = useRouter()

  return (
    <div className="page">
      <div className="hero hero-tight">
        <div>
          <div className="eyebrow">Build the library</div>
          <h1>Add a <span className="accent">recipe</span></h1>
          <p className="hero-sub">
            Paste a link, search Spoonacular, or type it in by hand. All saved
            recipes appear in your library under <em>Custom</em>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setShowManage(true)}
          >
            Manage ingredients
          </button>
          <Link href="/recipes" className="btn btn-ghost">
            ← Back to library
          </Link>
        </div>
      </div>

      {/* Mode tabs — styled like the diet chip bar so the page reads consistently */}
      <div className="diet-filter-bar add-recipe-tabs">
        <button
          className={`diet-chip ${mode === 'url' ? 'on' : ''}`}
          onClick={() => setMode('url')}
        >
          🔗 Paste a link
        </button>
        <button
          className={`diet-chip ${mode === 'search' ? 'on' : ''}`}
          onClick={() => setMode('search')}
        >
          🔍 Search Spoonacular
        </button>
        <button
          className={`diet-chip ${mode === 'manual' ? 'on' : ''}`}
          onClick={() => setMode('manual')}
        >
          ✍️ Type it in
        </button>
      </div>

      {mode === 'url' && <ModeUrl />}
      {mode === 'search' && <ModeSearch />}
      {mode === 'manual' && <ModeManual />}

      {showManage && (
        <ManageIngredientsModal
          onClose={() => setShowManage(false)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  )
}
