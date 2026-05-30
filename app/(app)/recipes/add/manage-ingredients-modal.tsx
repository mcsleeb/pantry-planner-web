'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCustomIngredients, updateCustomIngredient, deleteCustomIngredient } from '@/lib/db/ingredients'
import { getOwnRecipes } from '@/lib/db/recipes'
import { ALL_UNITS, UNIT_LABELS, formatAmount } from '@/lib/units'
import {
  ALLERGEN_LABELS,
  type Aisle,
  type Allergen,
  type Ingredient,
  type Recipe,
  type Unit
} from '@/lib/types'

const ALL_AISLES: Aisle[] = [
  'produce', 'meat', 'seafood', 'dairy', 'pantry',
  'bakery', 'frozen', 'spices', 'condiments'
]
const ALL_ALLERGENS: Allergen[] = [
  'peanut', 'tree-nut', 'shellfish', 'fish', 'dairy', 'egg', 'gluten', 'soy', 'sesame'
]

interface Props {
  onClose: () => void
  /** Called after any change so the parent can refresh its own catalog copy. */
  onChanged?: () => void
}

export function ManageIngredientsModal({ onClose, onChanged }: Props) {
  const [loading, setLoading] = useState(true)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You need to be signed in.')
      setLoading(false)
      return
    }
    const [ings, recs] = await Promise.all([
      getCustomIngredients(supabase, user.id),
      getOwnRecipes(supabase, user.id)
    ])
    setIngredients(ings)
    setRecipes(recs)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // How many of the user's recipes reference this ingredient id
  const usageCount = (ingredientId: string) =>
    recipes.filter(r =>
      r.ingredients.some(ri => ri.ingredientId === ingredientId)
    ).length

  const recipesUsing = (ingredientId: string) =>
    recipes
      .filter(r => r.ingredients.some(ri => ri.ingredientId === ingredientId))
      .map(r => r.name)

  const handleDelete = async (ing: Ingredient) => {
    const count = usageCount(ing.id)
    if (count > 0) {
      const names = recipesUsing(ing.id).slice(0, 3).join(', ')
      alert(
        `Can't delete "${ing.name}" — it's used by ${count} ` +
        `${count === 1 ? 'recipe' : 'recipes'} (${names}${count > 3 ? '…' : ''}).\n\n` +
        `Remove it from those recipes first, then delete it here.`
      )
      return
    }
    if (!confirm(`Delete "${ing.name}"? This can't be undone.`)) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const ok = await deleteCustomIngredient(supabase, ing.id)
    setBusy(false)
    if (!ok) {
      setError(`Could not delete "${ing.name}". Please try again.`)
      return
    }
    setIngredients(prev => prev.filter(i => i.id !== ing.id))
    onChanged?.()
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="recipe-modal-head">
          <div>
            <div className="eyebrow">Your ingredients</div>
            <h2 className="recipe-modal-title">Manage custom ingredients</h2>
            <div className="recipe-modal-meta">
              Ingredients you&apos;ve created. Edit details or remove ones you no longer need.
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="form-error" style={{ marginTop: 'var(--s-3)' }}>{error}</div>}

        <div style={{ marginTop: 'var(--s-4)', maxHeight: '56vh', overflowY: 'auto' }}>
          {loading ? (
            <p className="pref-empty">Loading…</p>
          ) : ingredients.length === 0 ? (
            <p className="pref-empty">
              No custom ingredients yet. Create one while adding a recipe.
            </p>
          ) : (
            ingredients.map(ing => {
              const count = usageCount(ing.id)
              if (editing === ing.id) {
                return (
                  <EditIngredientForm
                    key={ing.id}
                    ingredient={ing}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={async patch => {
                      setBusy(true)
                      setError(null)
                      const supabase = createClient()
                      const ok = await updateCustomIngredient(supabase, ing.id, patch)
                      setBusy(false)
                      if (!ok) {
                        setError('Could not save changes. The name may be in use.')
                        return
                      }
                      setIngredients(prev =>
                        prev.map(i => i.id === ing.id
                          ? { ...i, ...patch, id: ing.id, isCustom: true }
                          : i)
                      )
                      setEditing(null)
                      onChanged?.()
                    }}
                  />
                )
              }
              return (
                <div key={ing.id} className="manage-ing-row">
                  <div className="manage-ing-body">
                    <div className="item-name">{ing.name}</div>
                    <div className="item-pkg">
                      {ing.aisle} · {ing.packageLabel ?? formatAmount(ing.packageSize, ing.packageUnit)}
                      {count > 0 && (
                        <span className="manage-ing-usage">
                          {' '}· used in {count} {count === 1 ? 'recipe' : 'recipes'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditing(ing.id)}
                    disabled={busy}
                  >Edit</button>
                  <button
                    className="folder-row-action folder-row-action-danger"
                    onClick={() => handleDelete(ing)}
                    disabled={busy}
                    aria-label={`Delete ${ing.name}`}
                    title={count > 0 ? 'In use — remove from recipes first' : 'Delete'}
                  >×</button>
                </div>
              )
            })
          )}
        </div>

        <div className="recipe-modal-foot" style={{ marginTop: 'var(--s-4)' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// Edit form — reuses the new-ingredient field layout
// ===========================================================================
interface EditFormProps {
  ingredient: Ingredient
  busy: boolean
  onCancel: () => void
  onSave: (patch: {
    name: string
    aisle: Aisle
    packageSize: number
    packageUnit: Unit
    packageLabel?: string
    allergens?: Allergen[]
    density?: number
  }) => void
}

function EditIngredientForm({ ingredient, busy, onCancel, onSave }: EditFormProps) {
  const [name, setName] = useState(ingredient.name)
  const [aisle, setAisle] = useState<Aisle>(ingredient.aisle)
  const [pkgSize, setPkgSize] = useState(ingredient.packageSize)
  const [pkgUnit, setPkgUnit] = useState<Unit>(ingredient.packageUnit)
  const [pkgLabel, setPkgLabel] = useState(ingredient.packageLabel ?? '')
  const [allergens, setAllergens] = useState<Set<Allergen>>(
    new Set(ingredient.allergens ?? [])
  )

  const toggleAllergen = (a: Allergen) => {
    setAllergens(prev => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a)
      else next.add(a)
      return next
    })
  }

  const save = () => {
    if (!name.trim() || pkgSize <= 0) return
    onSave({
      name: name.trim(),
      aisle,
      packageSize: pkgSize,
      packageUnit: pkgUnit,
      packageLabel: pkgLabel.trim() || undefined,
      allergens: allergens.size > 0 ? Array.from(allergens) : undefined,
      density: ingredient.density
    })
  }

  return (
    <div className="new-ingredient-form">
      <div className="new-ingredient-head">
        <span className="form-label">Edit ingredient</span>
      </div>
      <div className="new-ingredient-grid">
        <label className="form-field">
          <span className="form-label">Name</span>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" />
        </label>
        <label className="form-field">
          <span className="form-label">Aisle</span>
          <select value={aisle} onChange={e => setAisle(e.target.value as Aisle)} className="form-input">
            {ALL_AISLES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span className="form-label">Package size</span>
          <input
            type="number" min={0} step={0.25} value={pkgSize}
            onChange={e => setPkgSize(parseFloat(e.target.value) || 0)}
            className="form-input"
          />
        </label>
        <label className="form-field">
          <span className="form-label">Package unit</span>
          <select value={pkgUnit} onChange={e => setPkgUnit(e.target.value as Unit)} className="form-input">
            {ALL_UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </label>
        <label className="form-field new-ingredient-wide">
          <span className="form-label">Package label (optional)</span>
          <input
            type="text" value={pkgLabel}
            onChange={e => setPkgLabel(e.target.value)}
            placeholder='e.g. "8 oz block"'
            className="form-input"
          />
        </label>
      </div>
      <div className="form-section" style={{ marginTop: 'var(--s-3)' }}>
        <div className="form-label">Allergens (optional)</div>
        <div className="diet-filter-bar" style={{ marginBottom: 0 }}>
          {ALL_ALLERGENS.map(a => (
            <button
              key={a}
              type="button"
              className={`diet-chip ${allergens.has(a) ? 'on' : ''}`}
              onClick={() => toggleAllergen(a)}
            >
              {ALLERGEN_LABELS[a]}
            </button>
          ))}
        </div>
      </div>
      <div className="new-ingredient-foot">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
