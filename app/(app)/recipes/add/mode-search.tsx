'use client'

import { useState } from 'react'
import type { Recipe, Diet } from '@/lib/types'
import { DIET_LABELS } from '@/lib/planner'
import { RecipePreview } from './recipe-preview'

interface SearchResult {
  id: number
  title: string
  image?: string
  readyInMinutes?: number
  servings?: number
}

const ALL_DIETS: Diet[] = [
  'omnivore',
  'vegetarian',
  'vegan',
  'pescatarian',
  'keto',
  'mediterranean',
  'gluten-free'
]

export function ModeSearch() {
  const [query, setQuery] = useState('')
  const [dietFilter, setDietFilter] = useState<Diet | ''>('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState<number | null>(null)
  const [preview, setPreview] = useState<Recipe | null>(null)

  const handleSearch = async () => {
    setError(null)
    setResults([])
    if (!query.trim()) {
      setError('Type something to search for.')
      return
    }
    setSearching(true)
    try {
      const params = new URLSearchParams({ q: query.trim() })
      if (dietFilter) params.set('diet', dietFilter)
      const res = await fetch(`/api/spoonacular/search?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? `Search failed (HTTP ${res.status}).`)
      } else {
        setResults(data.results as SearchResult[])
        if (!data.results?.length) {
          setError('No results — try different keywords.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setSearching(false)
    }
  }

  const handleImport = async (r: SearchResult) => {
    setError(null)
    setImporting(r.id)
    try {
      const res = await fetch('/api/spoonacular/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalId: r.id })
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
      setImporting(null)
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
        Search Spoonacular&apos;s recipe library by keyword. Filter by diet to narrow results.
      </p>

      <div className="url-input-row">
        <input
          type="search"
          className="recipe-search"
          placeholder='e.g. "chicken alfredo" or "no-bake dessert"'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="diet-filter-bar" style={{ marginTop: 'var(--s-3)' }}>
        <button
          className={`diet-chip ${dietFilter === '' ? 'on' : ''}`}
          onClick={() => setDietFilter('')}
        >
          Any diet
        </button>
        {ALL_DIETS.map(d => (
          <button
            key={d}
            className={`diet-chip ${dietFilter === d ? 'on' : ''}`}
            onClick={() => setDietFilter(d)}
          >
            {DIET_LABELS[d]}
          </button>
        ))}
      </div>

      {error && <div className="form-error" style={{ marginTop: 'var(--s-3)' }}>{error}</div>}

      {results.length > 0 && (
        <div className="recipes-grid" style={{ marginTop: 'var(--s-5)' }}>
          {results.map(r => (
            <button
              key={r.id}
              className="recipe-card"
              onClick={() => handleImport(r)}
              disabled={importing !== null}
              style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
            >
              <div className="recipe-card-name">{r.title}</div>
              <div className="recipe-card-meta">
                {r.readyInMinutes ?? '?'} minutes
                {r.servings ? ` · serves ${r.servings}` : ''}
              </div>
              {importing === r.id && (
                <div className="hero-sub" style={{ marginTop: '8px', fontSize: '13px' }}>
                  Importing…
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
