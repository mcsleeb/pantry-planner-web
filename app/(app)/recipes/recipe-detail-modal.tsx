'use client'

import { useState } from 'react'
import type { Allergen, Ingredient, Recipe } from '@/lib/types'
import { ALLERGEN_LABELS } from '@/lib/types'
import { DIET_LABELS } from '@/lib/planner'
import { formatAmount } from '@/lib/units'
import { checkExclusions, recipeAllergens } from '@/lib/exclusions'
import type { Folder } from '@/lib/db/folders'
import { SaveToFolderPopover } from './save-to-folder-popover'

interface Props {
  recipe: Recipe
  dislikes: string[]
  allergens: Allergen[]
  folders: Folder[]
  catalog: Record<string, Ingredient>
  selectedFolderIds: string[]
  onFolderCreated: (folder: Folder) => void
  onMembershipChange: (folderId: string, isMember: boolean) => void
  onClose: () => void
  onAddToPlan?: () => void
  onDelete?: () => void
}

export function RecipeDetailModal({
  recipe,
  dislikes,
  allergens,
  folders,
  catalog,
  selectedFolderIds,
  onFolderCreated,
  onMembershipChange,
  onClose,
  onAddToPlan,
  onDelete
}: Props) {
  const [showFolderPopover, setShowFolderPopover] = useState(false)
  const exclusion = checkExclusions(recipe, { dislikes, allergens }, catalog)
  const allRecipeAllergens = recipeAllergens(recipe, catalog)

  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes
  const cost = recipe.estimatedCostPerServing

  // Ingredient ids the user has marked as excluded — used to highlight them in the list
  const blockedIngredientIds = new Set<string>()
  for (const r of exclusion.reasons) {
    if ('ingredientId' in r) blockedIngredientIds.add(r.ingredientId)
  }

  // Allergens this recipe contains that the user is excluding
  const triggeredAllergens = allergens.filter(a => allRecipeAllergens.includes(a))
  const folderCount = selectedFolderIds.length

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="recipe-modal-head">
          <div>
            <div className="eyebrow">Recipe</div>
            <h2 className="recipe-modal-title">{recipe.name}</h2>
            <div className="recipe-modal-meta">
              {totalMinutes} min · serves {recipe.servings} · {recipe.ingredients.length} ingredients
              {cost !== undefined && <> · ~${(cost / 100).toFixed(2)}/serving</>}
            </div>
            <div
              className="recipe-diets"
              style={{ marginTop: 'var(--s-3)', borderTop: 'none', paddingTop: 0 }}
            >
              {recipe.diets.map(d => (
                <span key={d} className="diet-tag">{DIET_LABELS[d]}</span>
              ))}
              {/* Every allergen the recipe contains — flagged if the user has marked it. */}
              {allRecipeAllergens.map(a => (
                <span
                  key={a}
                  className={`allergen-badge ${triggeredAllergens.includes(a) ? 'triggered' : ''}`}
                  title={
                    triggeredAllergens.includes(a)
                      ? `Contains ${ALLERGEN_LABELS[a]} — you've marked this as an allergen`
                      : `Contains ${ALLERGEN_LABELS[a]}`
                  }
                >
                  {triggeredAllergens.includes(a) ? '⚠ ' : ''}{ALLERGEN_LABELS[a]}
                </span>
              ))}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {exclusion.excluded && (
          <div className="exclusion-warning">
            <strong>Heads up:</strong>{' '}
            {triggeredAllergens.length > 0 && (
              <>
                This recipe contains{' '}
                <strong style={{ color: 'var(--rust-deep)' }}>
                  {triggeredAllergens.map(a => ALLERGEN_LABELS[a]).join(', ')}
                </strong>
                , which you&apos;ve marked as an allergen.{' '}
              </>
            )}
            {exclusion.reasons.some(r => r.kind === 'dislike') && (
              <>
                It also includes ingredients on your dislike list (
                {exclusion.reasons
                  .filter(r => r.kind === 'dislike')
                  .map(r => ('ingredientName' in r ? r.ingredientName : ''))
                  .join(', ')}
                ).{' '}
              </>
            )}
            The planner won&apos;t pick this for you, but you can still add it manually if you want.
          </div>
        )}

        <div className="recipe-modal-body">
          <section>
            <div className="eyebrow">Ingredients</div>
            <ul className="recipe-ingredient-list">
              {recipe.ingredients.map((ri, i) => {
                const ing = catalog[ri.ingredientId]
                const blocked = blockedIngredientIds.has(ri.ingredientId)
                return (
                  <li key={i} className={`recipe-ingredient ${blocked ? 'blocked' : ''}`}>
                    <span className="ing-amount">{formatAmount(ri.amount, ri.unit)}</span>
                    <span className="ing-name">
                      {ing?.name ?? ri.ingredientId}
                      {blocked && <span className="blocked-tag">excluded</span>}
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

        <div className="recipe-modal-foot">
          {recipe.source?.sourceUrl && (
            <a
              href={recipe.source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              Open original ↗
            </a>
          )}
          {onDelete && (
            <button
              className="btn btn-ghost"
              onClick={onDelete}
              style={{ color: 'var(--rust-deep)' }}
            >
              Delete recipe
            </button>
          )}

          {/* Save to folder — anchored popover */}
          <div className="modal-folder-action">
            <button
              className="btn btn-ghost"
              onClick={() => setShowFolderPopover(v => !v)}
              aria-expanded={showFolderPopover}
            >
              {folderCount > 0
                ? `In ${folderCount} folder${folderCount === 1 ? '' : 's'}`
                : 'Save to folder'}
            </button>
            {showFolderPopover && (
              <div className="folder-popover-anchor modal-folder-popover">
                <SaveToFolderPopover
                  recipeId={recipe.id}
                  folders={folders}
                  selectedFolderIds={selectedFolderIds}
                  onFolderCreated={onFolderCreated}
                  onMembershipChange={onMembershipChange}
                  onClose={() => setShowFolderPopover(false)}
                />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />
          {onAddToPlan && !exclusion.excluded && (
            <button className="btn btn-primary" onClick={onAddToPlan}>
              Add to plan
            </button>
          )}
          {onAddToPlan && exclusion.excluded && (
            <button
              className="btn btn-rust"
              onClick={() => {
                if (
                  confirm(
                    "This recipe contains ingredients you've excluded. Add it anyway?"
                  )
                ) {
                  onAddToPlan()
                }
              }}
            >
              Add anyway (excluded)
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
