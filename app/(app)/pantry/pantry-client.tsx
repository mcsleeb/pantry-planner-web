'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { upsertPantryItem, removePantryItem, clearPantry } from '@/lib/db/user'
import { formatAmount } from '@/lib/units'
import type { Aisle, Ingredient, PantryItem, Unit } from '@/lib/types'

const AISLE_ORDER: Aisle[] = [
  'produce', 'meat', 'seafood', 'dairy', 'bakery', 'pantry', 'frozen', 'spices', 'condiments'
]

interface Props {
  pantry: PantryItem[]
  catalog: Record<string, Ingredient>
}

export function PantryClient({ pantry: initialPantry, catalog }: Props) {
  const router = useRouter()
  const [pantry, setPantry] = useState<PantryItem[]>(initialPantry)
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  const catalogEntries = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog]
  )
  const inPantry = useMemo(
    () => new Map(pantry.map(p => [p.ingredientId, p])),
    [pantry]
  )

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return catalogEntries
      .filter(i => i.name.toLowerCase().includes(q))
      .filter(i => !inPantry.has(i.id))
      .slice(0, 8)
  }, [search, catalogEntries, inPantry])

  // ---- Persistence helpers -------------------------------------------------
  const persist = (fn: (supabase: ReturnType<typeof createClient>, userId: string) => Promise<void>) => {
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await fn(supabase, user.id)
      router.refresh()
    })
  }

  // ---- Mutations -----------------------------------------------------------
  const addItem = (ing: Ingredient) => {
    const item: PantryItem = {
      ingredientId: ing.id,
      amount: ing.packageSize,
      unit: ing.packageUnit,
      addedAt: Date.now()
    }
    setPantry(prev => [...prev, item])
    setSearch('')
    persist((supabase, userId) =>
      upsertPantryItem(supabase, userId, item).then(() => undefined)
    )
  }

  const updateAmount = (ingredientId: string, amount: number) => {
    setPantry(prev => prev.map(p =>
      p.ingredientId === ingredientId ? { ...p, amount } : p
    ))
    const item = pantry.find(p => p.ingredientId === ingredientId)
    if (!item) return
    persist((supabase, userId) =>
      upsertPantryItem(supabase, userId, { ...item, amount }).then(() => undefined)
    )
  }

  const toggleUseUp = (ingredientId: string) => {
    const item = pantry.find(p => p.ingredientId === ingredientId)
    if (!item) return
    const nextUseUp = !item.useUp
    setPantry(prev => prev.map(p =>
      p.ingredientId === ingredientId ? { ...p, useUp: nextUseUp } : p
    ))
    persist((supabase, userId) =>
      upsertPantryItem(supabase, userId, { ...item, useUp: nextUseUp }).then(() => undefined)
    )
  }

  const removeItem = (ingredientId: string) => {
    setPantry(prev => prev.filter(p => p.ingredientId !== ingredientId))
    persist((supabase, userId) =>
      removePantryItem(supabase, userId, ingredientId).then(() => undefined)
    )
  }

  const handleClearAll = () => {
    if (!confirm('Clear all pantry items?')) return
    setPantry([])
    persist((supabase, userId) =>
      clearPantry(supabase, userId).then(() => undefined)
    )
  }

  // ---- Aisle grouping ------------------------------------------------------
  const byAisle = useMemo(() => {
    const map = {} as Record<Aisle, PantryItem[]>
    for (const a of AISLE_ORDER) map[a] = []
    for (const p of pantry) {
      const ing = catalog[p.ingredientId]
      if (ing) map[ing.aisle].push(p)
    }
    for (const a of AISLE_ORDER) {
      map[a].sort((x, y) => {
        // use-up items float to the top
        if (!!x.useUp !== !!y.useUp) return x.useUp ? -1 : 1
        const xn = catalog[x.ingredientId]?.name ?? ''
        const yn = catalog[y.ingredientId]?.name ?? ''
        return xn.localeCompare(yn)
      })
    }
    return map
  }, [pantry, catalog])

  const useUpCount = pantry.filter(p => p.useUp).length

  return (
    <div className="page">
      <div className="hero hero-tight">
        <div>
          <div className="eyebrow">What&apos;s already on the shelf</div>
          <h1>My <span className="accent">Pantry</span></h1>
          <p className="hero-sub">
            What you have on hand. The planner picks recipes that use these
            ingredients, and they&apos;re subtracted from your shopping list
            automatically.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-num">{pantry.length}</div>
            <div className="stat-label">In pantry</div>
          </div>
          {useUpCount > 0 && (
            <div className="stat">
              <div className="stat-num" style={{ color: 'var(--rust)' }}>
                {useUpCount}
              </div>
              <div className="stat-label">To use up</div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--s-6)' }}>
        <label className="field-label">Add an ingredient</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%' }}
            placeholder="Start typing — onion, rice, olive oil…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {matches.length > 0 && (
            <div className="autocomplete">
              {matches.map(ing => (
                <button
                  key={ing.id}
                  className="autocomplete-item"
                  onClick={() => addItem(ing)}
                >
                  <span className="ing-name">
                    {ing.name}
                    {ing.isCustom && <span className="custom-ing-tag">custom</span>}
                  </span>
                  <span className="ing-aisle">{ing.aisle}</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && matches.length === 0 && (
            <div className="autocomplete">
              <div className="autocomplete-empty">
                Nothing matches in your ingredient catalog. Add a custom
                ingredient via Add Recipe to expand it.
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--ink-mute)',
            marginTop: 'var(--s-3)',
            lineHeight: 1.5
          }}
        >
          <strong style={{ color: 'var(--rust)' }}>Tap the flame</strong> on
          items going bad — the planner will heavily prioritize recipes that
          use them.
        </div>
      </div>

      {pantry.length === 0 ? (
        <div className="empty-hero">
          <h2>The shelf is bare.</h2>
          <p>Add what you have and the planner will work around it.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 'var(--s-5)' }}>
            <button className="btn btn-ghost" onClick={handleClearAll}>
              Clear pantry
            </button>
          </div>
          {AISLE_ORDER.map(aisle => {
            const items = byAisle[aisle]
            if (items.length === 0) return null
            return (
              <section key={aisle} className="aisle-section">
                <div className="aisle-head">
                  <div className="aisle-name">{aisle}</div>
                  <div className="aisle-count">— {items.length}</div>
                </div>
                <div className="grocery-items">
                  {items.map(p => {
                    const ing = catalog[p.ingredientId]
                    if (!ing) return null
                    return (
                      <div
                        key={p.ingredientId}
                        className={`grocery-item pantry-item ${p.useUp ? 'use-up' : ''}`}
                      >
                        <button
                          className={`use-up-btn ${p.useUp ? 'on' : ''}`}
                          onClick={() => toggleUseUp(p.ingredientId)}
                          title={p.useUp ? 'Remove use-up flag' : 'Mark as: use up first'}
                          aria-label="Toggle use up"
                        >
                          🔥
                        </button>
                        <div className="item-body">
                          <div className="item-name">
                            {ing.name}
                            {p.useUp && <span className="use-up-tag">Use up</span>}
                          </div>
                          <div className="item-pkg">
                            Have: {formatAmount(p.amount, p.unit)}
                          </div>
                        </div>
                        <PantryAmountInput
                          amount={p.amount}
                          unit={p.unit}
                          onChange={n => updateAmount(p.ingredientId, n)}
                        />
                        <button
                          className="btn btn-ghost btn-tiny"
                          onClick={() => removeItem(p.ingredientId)}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}

function PantryAmountInput({
  amount,
  unit,
  onChange
}: {
  amount: number
  unit: Unit
  onChange: (n: number) => void
}) {
  // Local state so typing feels smooth; commit on blur / Enter.
  const [draft, setDraft] = useState(String(amount))

  const commit = () => {
    const n = Number(draft)
    if (Number.isFinite(n) && n >= 0 && n !== amount) onChange(n)
    else setDraft(String(amount))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="number"
        step="0.5"
        min="0"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="form-input"
        style={{ width: '70px', textAlign: 'right' }}
      />
      <span className="ing-aisle">{unit}</span>
    </div>
  )
}
