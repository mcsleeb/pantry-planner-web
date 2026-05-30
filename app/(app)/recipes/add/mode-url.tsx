'use client'

import { useState } from 'react'
import type { Recipe } from '@/lib/types'
import { RecipePreview } from './recipe-preview'

function isInstagramUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return /(^|\.)instagram\.[a-z.]+$/i.test(u.hostname)
  } catch {
    return false
  }
}

function isTikTokUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return /(^|\.)tiktok\.[a-z.]+$/i.test(u.hostname)
  } catch {
    return false
  }
}

export function ModeUrl() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Recipe | null>(null)

  const looksLikeVideo = isInstagramUrl(url) || isTikTokUrl(url)

  const handleImport = async () => {
    setError(null)
    if (!url.trim()) {
      setError('Paste a URL first.')
      return
    }
    try {
      new URL(url)
    } catch {
      setError("That doesn't look like a valid URL.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/spoonacular/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), fromVideo: looksLikeVideo })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? `Import failed (HTTP ${res.status}).`)
      } else {
        setPreview(data.recipe as Recipe)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setLoading(false)
    }
  }

  if (preview) {
    return (
      <RecipePreview
        recipe={preview}
        onCancel={() => setPreview(null)}
      />
    )
  }

  return (
    <div className="add-recipe-section">
      <p className="hero-sub" style={{ maxWidth: '640px' }}>
        Paste a link to a recipe page, a Pinterest pin, or an Instagram or TikTok video.
        Most standard recipe sites work directly. For Pinterest, paste the pin URL.
        For Instagram &amp; TikTok, we&apos;ll try to extract the recipe from the caption and
        on-screen text — results vary.
      </p>

      <div className="url-input-row">
        <input
          type="url"
          className="recipe-search"
          placeholder="https://…"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleImport() }}
        />
        <button
          className="btn btn-primary"
          onClick={handleImport}
          disabled={loading || !url.trim()}
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>

      {looksLikeVideo && (
        <p className="hero-sub" style={{ fontSize: '13px', marginTop: 'var(--s-2)' }}>
          📹 Detected a video URL — we&apos;ll use video-extraction mode.
        </p>
      )}

      {error && <div className="form-error" style={{ marginTop: 'var(--s-3)' }}>{error}</div>}

      <details className="add-recipe-hint">
        <summary>Where can I paste from?</summary>
        <ul>
          <li><strong>Any recipe site</strong> — NYT Cooking, Bon Appétit, AllRecipes, Smitten Kitchen, etc.</li>
          <li><strong>Pinterest</strong> — paste a pin URL; we&apos;ll follow it to the source.</li>
          <li><strong>Instagram &amp; TikTok</strong> — paste the post URL; we&apos;ll extract from caption/transcript.</li>
        </ul>
      </details>
    </div>
  )
}
