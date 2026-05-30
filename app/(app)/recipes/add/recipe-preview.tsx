'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createRecipe } from '@/lib/db/recipes'
import { INGREDIENTS } from '@/lib/data/ingredients'
import { DIET_LABELS } from '@/lib/planner'
import { formatAmount } from '@/lib/units'
import type { Ingredient, Recipe } from '@/lib/types'

interface Props {
  recipe: Recipe
  onCancel: () => void
  /**
   * Extra ingredient definitions not in the base catalog — e.g. custom
   * ingredients created during manual entry. Merged over the base catalog
   * so the preview can resolve their names.
   */
  extraCatalog?: Record<string, Ingredient>
}

/**
 * Shows a recipe (just imported or just typed) and a Save button.
 * Saving creates the recipe under the user's account (visibility=private)
 * and navigates back to /recipes.
 */
export function RecipePreview({ recipe, onCancel, extraCatalog }: Props) {
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const catalog: Record<string, Ingredient> = extraCatalog
    ? { ...INGREDIENTS, ...extraCatalog }
    : INGREDIENTS

  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes
  // "Unknown" = not in the base catalog AND not a custom ingredient we know about.
  const unknownIngredients = recipe.ingredients.filter(
    ri => !catalog[ri.ingredientId]
  )

  const handleSave = () => {
    setError(null)
    startSaving(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You need to be signed in to save recipes.')
        return
      }
      // Strip the id — DB assigns a fresh uuid
      const { id: _drop, isCustom: _drop2, ...rest } = recipe
      const saved = await createRecipe(supabase, user.id, rest)
      if (!saved) {
        setError('Could not save the recipe. Please try again.')
        return
      }
      router.push('/recipes')
      router.refresh()
    })
  }

  return (
    <div className="recipe-preview">
      <div className="recipe-preview-head">
        <div className="eyebrow">Ready to save</div>
        <h2 className="recipe-modal-title">{recipe.name}</h2>
        <div className="recipe-modal-meta">
          {totalMinutes} min · serves {recipe.servings} · {recipe.ingredients.length} ingredients
        </div>
        <div className="recipe-diets" style={{ marginTop: 'var(--s-3)', borderTop: 'none', paddingTop: 0 }}>
          {recipe.diets.map(d => (
            <span key={d} className="diet-tag">{DIET_LABELS[d]}</span>
          ))}
        </div>
      </div>

      {unknownIngredients.length > 0 && (
        <div className="exclusion-warning" style={{ marginTop: 'var(--s-4)' }}>
          <strong>Heads up:</strong> {unknownIngredients.length} ingredient
          {unknownIngredients.length === 1 ? ' is' : 's are'} not in our catalog:{' '}
          <em>{unknownIngredients.slice(0, 4).map(ri => ri.ingredientId.replace(/^spoon-/, '')).join(', ')}</em>
          {unknownIngredients.length > 4 && ` + ${unknownIngredients.length - 4} more`}
          . The recipe still saves fine, but these ingredients won&apos;t contribute to
          grocery list rounding or waste estimates. (Imported recipes sometimes
          include ingredients we don&apos;t recognize.)
        </div>
      )}

      <div className="recipe-modal-body" style={{ marginTop: 'var(--s-4)' }}>
        <section>
          <div className="eyebrow">Ingredients</div>
          <ul className="recipe-ingredient-list">
            {recipe.ingredients.map((ri, i) => {
              const ing = catalog[ri.ingredientId]
              return (
                <li key={i} className="recipe-ingredient">
                  <span className="ing-amount">{formatAmount(ri.amount, ri.unit)}</span>
                  <span className="ing-name">
                    {ing?.name ?? ri.ingredientId.replace(/^spoon-/, '')}
                    {ing?.isCustom && <span className="custom-ing-tag">custom</span>}
                  </span>
                  {ri.prepNote && <span className="ing-note">{ri.prepNote}</span>}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <div className="eyebrow">Method</div>
          <ol className="recipe-step-list">
            {recipe.steps.map((step, i) => (
              <li key={i} className="recipe-step">
                <span className="step-num">{i + 1}</span>
                <span className="step-text">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {error && (
        <div className="form-error" style={{ marginTop: 'var(--s-4)' }}>{error}</div>
      )}

      <div className="recipe-modal-foot" style={{ marginTop: 'var(--s-5)' }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </div>
  )
}
