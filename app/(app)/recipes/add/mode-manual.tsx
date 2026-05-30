'use client'

import { useState, useMemo } from 'react'
import { INGREDIENTS } from '@/lib/data/ingredients'
import { DIET_LABELS } from '@/lib/planner'
import { ALL_UNITS, UNIT_LABELS } from '@/lib/units'
import { createClient } from '@/lib/supabase/client'
import { createCustomIngredient } from '@/lib/db/ingredients'
import type {
  Aisle,
  Allergen,
  Diet,
  Ingredient,
  Recipe,
  RecipeIngredient,
  Unit
} from '@/lib/types'
import { ALLERGEN_LABELS } from '@/lib/types'
import { RecipePreview } from './recipe-preview'

const ALL_DIETS: Diet[] = [
  'omnivore',
  'vegetarian',
  'vegan',
  'pescatarian',
  'keto',
  'mediterranean',
  'gluten-free'
]

const ALL_AISLES: Aisle[] = [
  'produce', 'meat', 'seafood', 'dairy', 'pantry',
  'bakery', 'frozen', 'spices', 'condiments'
]

const ALL_ALLERGENS: Allergen[] = [
  'peanut', 'tree-nut', 'shellfish', 'fish',
  'dairy', 'egg', 'gluten', 'soy', 'sesame'
]

const CATALOG_ENTRIES = Object.values(INGREDIENTS).sort((a, b) =>
  a.name.localeCompare(b.name)
)

export function ModeManual() {
  const [name, setName] = useState('')
  const [servings, setServings] = useState(4)
  const [prepMin, setPrepMin] = useState(10)
  const [cookMin, setCookMin] = useState(20)
  const [diets, setDiets] = useState<Set<Diet>>(new Set(['omnivore']))
  const [tags, setTags] = useState<string>('')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [steps, setSteps] = useState<string[]>([''])
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Recipe | null>(null)
  // Custom ingredients created during this session, so the autocomplete and
  // the preview can resolve their names. Persisted to the DB on creation.
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([])

  // The catalog the autocomplete searches: base + session customs
  const searchableEntries = useMemo(
    () => [...CATALOG_ENTRIES, ...customIngredients].sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    [customIngredients]
  )
  // Map for resolving ids → ingredient (used by preview)
  const localCatalog = useMemo(() => {
    const m: Record<string, Ingredient> = { ...INGREDIENTS }
    for (const ci of customIngredients) m[ci.id] = ci
    return m
  }, [customIngredients])

  const toggleDiet = (d: Diet) => {
    setDiets(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      if (next.size === 0) next.add('omnivore')
      return next
    })
  }

  const addIngredient = () => {
    setIngredients(prev => [...prev, { ingredientId: '', amount: 1, unit: 'whole' }])
  }
  const updateIngredient = (i: number, patch: Partial<RecipeIngredient>) => {
    setIngredients(prev => prev.map((ri, idx) => idx === i ? { ...ri, ...patch } : ri))
  }
  const removeIngredient = (i: number) => {
    setIngredients(prev => prev.filter((_, idx) => idx !== i))
  }

  const addStep = () => setSteps(prev => [...prev, ''])
  const updateStep = (i: number, text: string) => {
    setSteps(prev => prev.map((s, idx) => idx === i ? text : s))
  }
  const removeStep = (i: number) => {
    setSteps(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
  }

  const handleCustomCreated = (ing: Ingredient) => {
    setCustomIngredients(prev => [...prev, ing])
  }

  const handlePreview = () => {
    setError(null)
    if (!name.trim()) { setError('Give the recipe a name.'); return }
    if (ingredients.length === 0) { setError('Add at least one ingredient.'); return }
    const badIng = ingredients.findIndex(ri => !ri.ingredientId)
    if (badIng !== -1) {
      setError(`Pick an ingredient for row ${badIng + 1}.`)
      return
    }
    const cleanSteps = steps.map(s => s.trim()).filter(Boolean)
    if (cleanSteps.length === 0) { setError('Add at least one method step.'); return }

    const cleanTags = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)

    const recipe: Recipe = {
      id: 'manual-draft',
      name: name.trim(),
      diets: Array.from(diets),
      servings,
      prepMinutes: prepMin,
      cookMinutes: cookMin,
      ingredients,
      steps: cleanSteps,
      tags: cleanTags.length > 0 ? cleanTags : undefined,
      isCustom: true
    }
    setPreview(recipe)
  }

  if (preview) {
    return (
      <RecipePreview
        recipe={preview}
        extraCatalog={localCatalog}
        onCancel={() => setPreview(null)}
      />
    )
  }

  return (
    <div className="add-recipe-section">
      <p className="hero-sub" style={{ maxWidth: '640px' }}>
        Type a recipe by hand. Pick ingredients from the catalog — or create your
        own if something isn&apos;t listed. Custom ingredients are saved to your
        account and can be reused in other recipes.
      </p>

      <div className="form-grid">
        <label className="form-field">
          <span className="form-label">Recipe name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Grandma's tomato sauce"
            className="form-input"
          />
        </label>
        <label className="form-field">
          <span className="form-label">Servings</span>
          <input
            type="number" min={1} max={24} value={servings}
            onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
            className="form-input"
          />
        </label>
        <label className="form-field">
          <span className="form-label">Prep minutes</span>
          <input
            type="number" min={0} value={prepMin}
            onChange={e => setPrepMin(Math.max(0, parseInt(e.target.value) || 0))}
            className="form-input"
          />
        </label>
        <label className="form-field">
          <span className="form-label">Cook minutes</span>
          <input
            type="number" min={0} value={cookMin}
            onChange={e => setCookMin(Math.max(0, parseInt(e.target.value) || 0))}
            className="form-input"
          />
        </label>
      </div>

      <div className="form-section">
        <div className="form-label">Diets this satisfies</div>
        <div className="diet-filter-bar" style={{ marginBottom: 0 }}>
          {ALL_DIETS.map(d => (
            <button
              key={d}
              type="button"
              className={`diet-chip ${diets.has(d) ? 'on' : ''}`}
              onClick={() => toggleDiet(d)}
            >
              {DIET_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="form-section">
        <label className="form-field">
          <span className="form-label">Tags (comma-separated, optional)</span>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="quick, weeknight, comfort"
            className="form-input"
          />
        </label>
      </div>

      <div className="form-section">
        <div className="form-label">Ingredients</div>
        {ingredients.length === 0 && (
          <p className="hero-sub" style={{ fontSize: '13px', margin: '0 0 var(--s-3) 0' }}>
            No ingredients yet — add one below.
          </p>
        )}
        {ingredients.map((ri, i) => (
          <IngredientRow
            key={i}
            ri={ri}
            entries={searchableEntries}
            localCatalog={localCatalog}
            onChange={patch => updateIngredient(i, patch)}
            onRemove={() => removeIngredient(i)}
            onCustomCreated={handleCustomCreated}
          />
        ))}
        <button type="button" className="folder-new-trigger" onClick={addIngredient}>
          + Add ingredient
        </button>
      </div>

      <div className="form-section">
        <div className="form-label">Method</div>
        {steps.map((s, i) => (
          <div key={i} className="step-input-row">
            <span className="step-num">{i + 1}</span>
            <textarea
              value={s}
              onChange={e => updateStep(i, e.target.value)}
              placeholder={i === 0 ? 'Describe step 1…' : `Step ${i + 1}…`}
              className="form-textarea"
              rows={2}
            />
            {steps.length > 1 && (
              <button
                type="button"
                className="folder-row-action folder-row-action-danger"
                onClick={() => removeStep(i)}
                aria-label={`Remove step ${i + 1}`}
              >×</button>
            )}
          </div>
        ))}
        <button type="button" className="folder-new-trigger" onClick={addStep}>
          + Add step
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="recipe-modal-foot" style={{ marginTop: 'var(--s-5)' }}>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handlePreview}>
          Preview →
        </button>
      </div>
    </div>
  )
}

// ===========================================================================
// Ingredient row — autocomplete over catalog + customs, with inline creation
// ===========================================================================
interface IngredientRowProps {
  ri: RecipeIngredient
  entries: Ingredient[]
  localCatalog: Record<string, Ingredient>
  onChange: (patch: Partial<RecipeIngredient>) => void
  onRemove: () => void
  onCustomCreated: (ing: Ingredient) => void
}

function IngredientRow({
  ri,
  entries,
  localCatalog,
  onChange,
  onRemove,
  onCustomCreated
}: IngredientRowProps) {
  const [query, setQuery] = useState(
    ri.ingredientId ? (localCatalog[ri.ingredientId]?.name ?? '') : ''
  )
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [creating, setCreating] = useState(false)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries.slice(0, 12)
    return entries
      .filter(ing =>
        ing.name.toLowerCase().includes(q) || ing.id.toLowerCase().includes(q))
      .slice(0, 12)
  }, [query, entries])

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.some(ing => ing.name.toLowerCase() === q)
  }, [query, entries])

  const pickIngredient = (id: string) => {
    onChange({ ingredientId: id })
    setQuery(localCatalog[id]?.name ?? entries.find(e => e.id === id)?.name ?? id)
    setShowSuggestions(false)
  }

  if (creating) {
    return (
      <NewIngredientForm
        initialName={query.trim()}
        onCancel={() => setCreating(false)}
        onCreated={ing => {
          onCustomCreated(ing)
          onChange({ ingredientId: ing.id })
          setQuery(ing.name)
          setCreating(false)
        }}
      />
    )
  }

  return (
    <div className="ingredient-row">
      <input
        type="number" min={0} step={0.25} value={ri.amount}
        onChange={e => onChange({ amount: parseFloat(e.target.value) || 0 })}
        className="form-input ingredient-amount"
      />
      <select
        value={ri.unit}
        onChange={e => onChange({ unit: e.target.value as Unit })}
        className="form-input ingredient-unit"
      >
        {ALL_UNITS.map(u => (
          <option key={u} value={u}>{UNIT_LABELS[u]}</option>
        ))}
      </select>
      <div className="ingredient-autocomplete-wrap">
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setShowSuggestions(true)
            const ing = localCatalog[ri.ingredientId]
            if (ing && ing.name !== e.target.value) onChange({ ingredientId: '' })
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="ingredient (start typing…)"
          className="form-input"
        />
        {showSuggestions && (
          <ul className="autocomplete-list">
            {suggestions.map(ing => (
              <li key={ing.id}>
                <button
                  type="button"
                  className="autocomplete-item"
                  onMouseDown={() => pickIngredient(ing.id)}
                >
                  <span className="ing-name">
                    {ing.name}
                    {ing.isCustom && <span className="custom-ing-tag">custom</span>}
                  </span>
                  <span className="ing-note">{ing.aisle}</span>
                </button>
              </li>
            ))}
            {query.trim() && !exactMatch && (
              <li>
                <button
                  type="button"
                  className="autocomplete-item autocomplete-create"
                  onMouseDown={() => setCreating(true)}
                >
                  <span className="ing-name">+ Create &ldquo;{query.trim()}&rdquo;</span>
                  <span className="ing-note">new ingredient</span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      <input
        type="text"
        value={ri.prepNote ?? ''}
        onChange={e => onChange({ prepNote: e.target.value || undefined })}
        placeholder="prep note (optional)"
        className="form-input ingredient-prep"
      />
      <button
        type="button"
        className="folder-row-action folder-row-action-danger"
        onClick={onRemove}
        aria-label="Remove ingredient"
      >×</button>
    </div>
  )
}

// ===========================================================================
// Inline "create a new ingredient" form
// ===========================================================================
interface NewIngredientFormProps {
  initialName: string
  onCancel: () => void
  onCreated: (ing: Ingredient) => void
}

function NewIngredientForm({ initialName, onCancel, onCreated }: NewIngredientFormProps) {
  const [name, setName] = useState(initialName)
  const [aisle, setAisle] = useState<Aisle>('pantry')
  const [pkgSize, setPkgSize] = useState(1)
  const [pkgUnit, setPkgUnit] = useState<Unit>('whole')
  const [pkgLabel, setPkgLabel] = useState('')
  const [allergens, setAllergens] = useState<Set<Allergen>>(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggleAllergen = (a: Allergen) => {
    setAllergens(prev => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a)
      else next.add(a)
      return next
    })
  }

  const save = async () => {
    setErr(null)
    if (!name.trim()) { setErr('Name is required.'); return }
    if (pkgSize <= 0) { setErr('Package size must be greater than zero.'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setErr('You need to be signed in.'); setSaving(false); return }
      const created = await createCustomIngredient(supabase, user.id, {
        name: name.trim(),
        aisle,
        packageSize: pkgSize,
        packageUnit: pkgUnit,
        packageLabel: pkgLabel.trim() || undefined,
        allergens: allergens.size > 0 ? Array.from(allergens) : undefined
      })
      if (!created) {
        setErr('Could not save. You may already have an ingredient with that name.')
        setSaving(false)
        return
      }
      onCreated(created)
    } catch {
      setErr('Something went wrong saving the ingredient.')
      setSaving(false)
    }
  }

  return (
    <div className="new-ingredient-form">
      <div className="new-ingredient-head">
        <span className="form-label">New ingredient</span>
        <button
          type="button"
          className="folder-row-action"
          onClick={onCancel}
          aria-label="Cancel"
        >×</button>
      </div>

      <div className="new-ingredient-grid">
        <label className="form-field">
          <span className="form-label">Name</span>
          <input
            type="text" value={name}
            onChange={e => setName(e.target.value)}
            className="form-input"
            autoFocus
          />
        </label>
        <label className="form-field">
          <span className="form-label">Aisle</span>
          <select
            value={aisle}
            onChange={e => setAisle(e.target.value as Aisle)}
            className="form-input"
          >
            {ALL_AISLES.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
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
          <select
            value={pkgUnit}
            onChange={e => setPkgUnit(e.target.value as Unit)}
            className="form-input"
          >
            {ALL_UNITS.map(u => (
              <option key={u} value={u}>{UNIT_LABELS[u]}</option>
            ))}
          </select>
        </label>
        <label className="form-field new-ingredient-wide">
          <span className="form-label">Package label (optional)</span>
          <input
            type="text" value={pkgLabel}
            onChange={e => setPkgLabel(e.target.value)}
            placeholder='e.g. "8 oz block", "1 lb bag"'
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

      {err && <div className="form-error" style={{ marginTop: 'var(--s-3)' }}>{err}</div>}

      <div className="new-ingredient-foot">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Create & use'}
        </button>
      </div>
    </div>
  )
}
