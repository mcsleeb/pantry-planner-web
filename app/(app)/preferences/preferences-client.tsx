'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  addDislike,
  removeDislike,
  setAllergens as saveAllergens
} from '@/lib/db/user'
import {
  setPackageOverride,
  clearPackageOverride,
  type PackageOverride
} from '@/lib/db/ingredients'
import { ALL_UNITS, UNIT_LABELS, formatAmount } from '@/lib/units'
import {
  ALLERGEN_LABELS,
  type Allergen,
  type Ingredient,
  type Unit
} from '@/lib/types'

const ALL_ALLERGENS: Allergen[] = [
  'peanut', 'tree-nut', 'shellfish', 'fish', 'dairy', 'egg', 'gluten', 'soy', 'sesame'
]

interface Props {
  dislikes: string[]
  allergens: Allergen[]
  overrides: PackageOverride[]
  catalog: Record<string, Ingredient>
}

export function PreferencesClient({
  dislikes: initialDislikes,
  allergens: initialAllergens,
  overrides: initialOverrides,
  catalog
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Local state mirrors the server data; every change persists + router.refresh()
  const [dislikes, setDislikes] = useState<string[]>(initialDislikes)
  const [allergens, setAllergensState] = useState<Allergen[]>(initialAllergens)
  const [overrides, setOverrides] = useState<PackageOverride[]>(initialOverrides)

  const catalogEntries = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog]
  )

  // -------------------------------------------------------------------------
  // ALLERGENS
  // -------------------------------------------------------------------------
  const toggleAllergen = (a: Allergen) => {
    const next = allergens.includes(a)
      ? allergens.filter(x => x !== a)
      : [...allergens, a]
    setAllergensState(next)
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ok = await saveAllergens(supabase, user.id, next)
      if (!ok) {
        // roll back
        setAllergensState(allergens)
      } else {
        router.refresh()
      }
    })
  }

  // -------------------------------------------------------------------------
  // DISLIKES
  // -------------------------------------------------------------------------
  const [search, setSearch] = useState('')
  const dislikeSet = useMemo(() => new Set(dislikes), [dislikes])
  const dislikeMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return catalogEntries
      .filter(i => i.name.toLowerCase().includes(q))
      .filter(i => !dislikeSet.has(i.id))
      .slice(0, 8)
  }, [search, catalogEntries, dislikeSet])

  const handleAddDislike = (ing: Ingredient) => {
    setDislikes(prev => [...prev, ing.id])
    setSearch('')
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ok = await addDislike(supabase, user.id, ing.id)
      if (!ok) setDislikes(prev => prev.filter(id => id !== ing.id))
      else router.refresh()
    })
  }

  const handleRemoveDislike = (id: string) => {
    const prev = dislikes
    setDislikes(p => p.filter(x => x !== id))
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ok = await removeDislike(supabase, user.id, id)
      if (!ok) setDislikes(prev)
      else router.refresh()
    })
  }

  // -------------------------------------------------------------------------
  // PACKAGE OVERRIDES
  // -------------------------------------------------------------------------
  const overrideMap = useMemo(
    () => new Map(overrides.map(o => [o.ingredientId, o])),
    [overrides]
  )
  const [ovEditing, setOvEditing] = useState<string | null>(null)

  const handleSaveOverride = (
    ingredientId: string,
    size: number,
    unit: Unit,
    label: string
  ) => {
    if (size <= 0) return
    const next: PackageOverride = {
      ingredientId,
      packageSize: size,
      packageUnit: unit,
      packageLabel: label.trim() || undefined
    }
    setOverrides(prev => {
      const without = prev.filter(o => o.ingredientId !== ingredientId)
      return [...without, next]
    })
    setOvEditing(null)
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await setPackageOverride(supabase, user.id, ingredientId, {
        packageSize: size,
        packageUnit: unit,
        packageLabel: label.trim() || undefined
      })
      router.refresh()
    })
  }

  const handleClearOverride = (ingredientId: string) => {
    const prev = overrides
    setOverrides(p => p.filter(o => o.ingredientId !== ingredientId))
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ok = await clearPackageOverride(supabase, user.id, ingredientId)
      if (!ok) setOverrides(prev)
      else router.refresh()
    })
  }

  return (
    <div className="page">
      <div className="hero hero-tight">
        <div>
          <div className="eyebrow">What&apos;s off the menu</div>
          <h1>Food <span className="accent">Preferences</span></h1>
          <p className="hero-sub">
            Tell the planner what to avoid and how you actually buy your groceries.
          </p>
        </div>
      </div>

      {/* ===================== ALLERGENS ===================== */}
      <section className="card allergen-card">
        <div className="pref-section-head">
          <h3 className="pref-section-title">⚠ Allergens</h3>
          <span className="pref-tag pref-tag-strict">Strict</span>
        </div>
        <p className="pref-section-sub">
          Recipes containing any selected allergen are filtered out of your plan
          completely, and flagged with a warning badge everywhere they appear.
        </p>
        <div className="allergen-grid">
          {ALL_ALLERGENS.map(a => {
            const on = allergens.includes(a)
            return (
              <button
                key={a}
                className={`allergen-chip ${on ? 'on' : ''}`}
                onClick={() => toggleAllergen(a)}
                aria-pressed={on}
              >
                <span>{ALLERGEN_LABELS[a]}</span>
                {on && <span className="allergen-x">✓</span>}
              </button>
            )
          })}
        </div>
        {allergens.length > 0 && (
          <div className="pref-excluding">
            Excluding: {allergens.map(a => ALLERGEN_LABELS[a]).join(' · ')}
          </div>
        )}
      </section>

      {/* ===================== DISLIKES ===================== */}
      <section className="card" style={{ marginTop: 'var(--s-5)' }}>
        <div className="pref-section-head">
          <h3 className="pref-section-title">Dislikes</h3>
          <span className="pref-tag">Preference</span>
        </div>
        <p className="pref-section-sub">
          Specific ingredients you&apos;d rather not eat. Any recipe containing
          one is skipped by the planner.
        </p>

        <div style={{ position: 'relative', marginBottom: 'var(--s-4)' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%' }}
            placeholder="Add an ingredient — sweet potato, mushroom, cilantro…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {dislikeMatches.length > 0 && (
            <div className="autocomplete">
              {dislikeMatches.map(ing => (
                <button
                  key={ing.id}
                  className="autocomplete-item"
                  onClick={() => handleAddDislike(ing)}
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
          {search.trim() && dislikeMatches.length === 0 && (
            <div className="autocomplete">
              <div className="autocomplete-empty">
                Nothing matches in your catalog. Try a more general term.
              </div>
            </div>
          )}
        </div>

        {dislikes.length === 0 ? (
          <p className="pref-empty">No dislikes yet. Search above to add one.</p>
        ) : (
          <div className="dislike-list">
            {dislikes.map(id => {
              const ing = catalog[id]
              return (
                <div key={id} className="dislike-pill">
                  <span>{ing?.name ?? id}</span>
                  <button
                    className="dislike-remove"
                    onClick={() => handleRemoveDislike(id)}
                    aria-label={`Remove ${ing?.name ?? id}`}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===================== PACKAGE OVERRIDES ===================== */}
      <section className="card" style={{ marginTop: 'var(--s-5)' }}>
        <div className="pref-section-head">
          <h3 className="pref-section-title">Package sizes</h3>
          <span className="pref-tag">Grocery math</span>
        </div>
        <p className="pref-section-sub">
          We assume a standard package size for each ingredient when rounding up
          your grocery list. If the size you actually buy is different, set it
          here — the grocery list will round to your size instead.
        </p>

        {overrides.length > 0 && (
          <div className="override-list">
            {overrides.map(ov => {
              const ing = catalog[ov.ingredientId]
              return (
                <div key={ov.ingredientId} className="override-row">
                  <div className="override-name">
                    {ing?.name ?? ov.ingredientId}
                  </div>
                  <div className="override-value">
                    {ov.packageLabel
                      ? ov.packageLabel
                      : formatAmount(ov.packageSize, ov.packageUnit)}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOvEditing(ov.ingredientId)}
                  >Edit</button>
                  <button
                    className="folder-row-action folder-row-action-danger"
                    onClick={() => handleClearOverride(ov.ingredientId)}
                    aria-label="Remove override"
                  >×</button>
                </div>
              )
            })}
          </div>
        )}

        <OverrideAdder
          catalogEntries={catalogEntries}
          overrideMap={overrideMap}
          editing={ovEditing}
          onEditDone={() => setOvEditing(null)}
          onSave={handleSaveOverride}
        />
      </section>
    </div>
  )
}

// ===========================================================================
// Override adder/editor — pick an ingredient, set its package size
// ===========================================================================
interface OverrideAdderProps {
  catalogEntries: Ingredient[]
  overrideMap: Map<string, PackageOverride>
  editing: string | null
  onEditDone: () => void
  onSave: (ingredientId: string, size: number, unit: Unit, label: string) => void
}

function OverrideAdder({
  catalogEntries,
  overrideMap,
  editing,
  onEditDone,
  onSave
}: OverrideAdderProps) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<Ingredient | null>(null)
  const [size, setSize] = useState(1)
  const [unit, setUnit] = useState<Unit>('oz')
  const [label, setLabel] = useState('')

  // When the parent asks to edit an existing override, load that ingredient
  const editingIngredient = editing
    ? catalogEntries.find(i => i.id === editing) ?? null
    : null
  const activeIngredient = editingIngredient ?? picked

  // Sync the form when an edit begins
  useEffect(() => {
    if (editingIngredient) {
      const ov = overrideMap.get(editingIngredient.id)
      setSize(ov?.packageSize ?? editingIngredient.packageSize)
      setUnit(ov?.packageUnit ?? editingIngredient.packageUnit)
      setLabel(ov?.packageLabel ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return catalogEntries
      .filter(i => i.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [search, catalogEntries])

  const pick = (ing: Ingredient) => {
    setPicked(ing)
    setSearch('')
    const ov = overrideMap.get(ing.id)
    setSize(ov?.packageSize ?? ing.packageSize)
    setUnit(ov?.packageUnit ?? ing.packageUnit)
    setLabel(ov?.packageLabel ?? '')
  }

  const reset = () => {
    setPicked(null)
    setSearch('')
    setLabel('')
    onEditDone()
  }

  const commit = () => {
    if (!activeIngredient) return
    onSave(activeIngredient.id, size, unit, label)
    reset()
  }

  if (activeIngredient) {
    return (
      <div className="override-editor">
        <div className="override-editor-name">
          {activeIngredient.name}
          <span className="override-default-hint">
            default: {formatAmount(activeIngredient.packageSize, activeIngredient.packageUnit)}
          </span>
        </div>
        <div className="override-editor-fields">
          <label className="form-field">
            <span className="form-label">Package size</span>
            <input
              type="number" min={0} step={0.25} value={size}
              onChange={e => setSize(parseFloat(e.target.value) || 0)}
              className="form-input"
            />
          </label>
          <label className="form-field">
            <span className="form-label">Unit</span>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as Unit)}
              className="form-input"
            >
              {ALL_UNITS.map(u => (
                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
              ))}
            </select>
          </label>
          <label className="form-field override-label-field">
            <span className="form-label">Label (optional)</span>
            <input
              type="text" value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder='e.g. "10 oz tub"'
              className="form-input"
            />
          </label>
        </div>
        <div className="override-editor-foot">
          <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={commit}>
            Save package size
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', marginTop: 'var(--s-3)' }}>
      <input
        type="text"
        className="form-input"
        style={{ width: '100%' }}
        placeholder="Set a custom package size — search for an ingredient…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {matches.length > 0 && (
        <div className="autocomplete">
          {matches.map(ing => (
            <button
              key={ing.id}
              className="autocomplete-item"
              onClick={() => pick(ing)}
            >
              <span className="ing-name">
                {ing.name}
                {overrideMap.has(ing.id) && (
                  <span className="custom-ing-tag">override set</span>
                )}
              </span>
              <span className="ing-aisle">
                {formatAmount(ing.packageSize, ing.packageUnit)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
