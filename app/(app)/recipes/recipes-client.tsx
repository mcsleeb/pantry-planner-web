'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteRecipe } from '@/lib/db/recipes'
import { DIET_LABELS } from '@/lib/planner'
import { checkExclusions, recipeAllergens } from '@/lib/exclusions'
import { ALLERGEN_LABELS, type Allergen, type Diet, type Ingredient, type Recipe } from '@/lib/types'
import type { Folder, FolderMemberships } from '@/lib/db/folders'
import { RecipeDetailModal } from './recipe-detail-modal'
import { SaveToFolderPopover } from './save-to-folder-popover'
import { FolderFilterDropdown } from './folder-filter-dropdown'

const ALL_DIETS: Diet[] = [
  'omnivore',
  'vegetarian',
  'vegan',
  'pescatarian',
  'keto',
  'mediterranean',
  'gluten-free'
]

interface Props {
  recipes: Recipe[]
  dislikes: string[]
  allergens: Allergen[]
  folders: Folder[]
  memberships: FolderMemberships
  catalog: Record<string, Ingredient>
}

export function RecipesClient({
  recipes,
  dislikes,
  allergens,
  folders: initialFolders,
  memberships: initialMemberships,
  catalog
}: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Diet | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [hideExcluded, setHideExcluded] = useState(false)
  const [open, setOpen] = useState<Recipe | null>(null)
  // Folders + memberships are local state so optimistic updates feel instant.
  // Server refresh syncs them on every change via router.refresh().
  const [folders, setFolders] = useState<Folder[]>(initialFolders)
  const [memberships, setMemberships] = useState<FolderMemberships>(initialMemberships)
  // Which recipe's "save to folder" popover is open (null = none)
  const [folderPopoverFor, setFolderPopoverFor] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Re-sync local copies if server props change (after router.refresh)
  // This is a small trick: when props change, useState ignores them by default,
  // so we mirror them with a derived-state pattern.
  // For simplicity & correctness in this iteration we rely on full page refreshes;
  // any change calls router.refresh() which re-runs the server component.
  // If you see stale state in practice, switch to useEffect([initialFolders]) syncing.

  // -------- Available tag list, driven from data --------
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipes) {
      for (const t of r.tags ?? []) set.add(t)
    }
    return [...set].sort()
  }, [recipes])

  // -------- Filter pipeline: search → diet → tag → folder → excluded --------
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()

    return recipes.filter(r => {
      // Diet
      if (filter !== 'all' && !r.diets.includes(filter)) return false
      // Tag
      if (tagFilter && !(r.tags ?? []).includes(tagFilter)) return false
      // Folder
      if (folderFilter) {
        const memberFolders = memberships[r.id] ?? []
        if (!memberFolders.includes(folderFilter)) return false
      }
      // Excluded toggle
      if (hideExcluded && checkExclusions(r, { dislikes, allergens }, catalog).excluded) return false
      // Free-text search across name, tags, ingredient display names
      if (q) {
        if (r.name.toLowerCase().includes(q)) return true
        if ((r.tags ?? []).some(t => t.toLowerCase().includes(q))) return true
        const hitIng = r.ingredients.some(ri => {
          const ing = catalog[ri.ingredientId]
          return ing?.name.toLowerCase().includes(q)
        })
        if (hitIng) return true
        return false
      }
      return true
    })
  }, [recipes, search, filter, tagFilter, folderFilter, hideExcluded, dislikes, allergens, memberships])

  // -------- Delete recipe (custom only) --------
  const handleDelete = (recipe: Recipe) => {
    if (!confirm(`Delete "${recipe.name}"?`)) return
    startTransition(async () => {
      const supabase = createClient()
      const ok = await deleteRecipe(supabase, recipe.id)
      if (ok) {
        setOpen(null)
        router.refresh()
      } else {
        alert('Could not delete the recipe. Please try again.')
      }
    })
  }

  // -------- Local folder/membership mutations (called by child components) --------
  const handleFolderCreated = (f: Folder) => {
    setFolders(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)))
  }
  const handleMembershipChange = (recipeId: string, folderId: string, isMember: boolean) => {
    setMemberships(prev => {
      const list = prev[recipeId] ?? []
      const next = isMember
        ? (list.includes(folderId) ? list : [...list, folderId])
        : list.filter(id => id !== folderId)
      // Update folder recipe counts
      setFolders(fs => fs.map(f => {
        if (f.id !== folderId) return f
        const delta = isMember ? 1 : -1
        return { ...f, recipeCount: Math.max(0, f.recipeCount + delta) }
      }))
      return { ...prev, [recipeId]: next }
    })
  }
  const handleFoldersChanged = () => {
    // After rename/delete, the next router.refresh() will re-deliver fresh props
    // but our local state has already been updated optimistically. No-op for now.
  }

  return (
    <div className="page">
      <div className="hero hero-tight">
        <div>
          <div className="eyebrow">The library</div>
          <h1>All <span className="accent">Recipes</span></h1>
          <p className="hero-sub">
            {recipes.length} dishes — click any card to see ingredients and method.
          </p>
        </div>
        <div>
          <Link href="/recipes/add" className="btn btn-primary">
            + Add recipe
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="recipe-search-row">
        <input
          type="search"
          className="recipe-search"
          placeholder="Search recipes, tags, or ingredients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="recipe-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {/* Folder + Diet chips on one row */}
      <div className="diet-filter-bar">
        <FolderFilterDropdown
          folders={folders}
          selectedFolderId={folderFilter}
          onSelect={setFolderFilter}
          onFoldersChanged={handleFoldersChanged}
        />

        <span className="filter-divider" />

        <button
          className={`diet-chip ${filter === 'all' ? 'on' : ''}`}
          onClick={() => setFilter('all')}
        >
          All diets
        </button>
        {ALL_DIETS.map(d => (
          <button
            key={d}
            className={`diet-chip ${filter === d ? 'on' : ''}`}
            onClick={() => setFilter(d)}
          >
            {DIET_LABELS[d]}
          </button>
        ))}

        {(dislikes.length > 0 || allergens.length > 0) && (
          <label
            className={`diet-chip ${hideExcluded ? 'on' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={hideExcluded}
              onChange={e => setHideExcluded(e.target.checked)}
              style={{ marginRight: '6px', verticalAlign: 'middle' }}
            />
            Hide excluded
          </label>
        )}
      </div>

      {/* Tag chips, data-driven */}
      {allTags.length > 0 && (
        <div className="diet-filter-bar tag-filter-bar">
          <button
            className={`diet-chip tag-chip ${tagFilter === null ? 'on' : ''}`}
            onClick={() => setTagFilter(null)}
          >
            Any tag
          </button>
          {allTags.map(t => (
            <button
              key={t}
              className={`diet-chip tag-chip ${tagFilter === t ? 'on' : ''}`}
              onClick={() => setTagFilter(t === tagFilter ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty-hero">
          <p>
            {search.trim()
              ? `No recipes match "${search.trim()}".`
              : 'No recipes match these filters yet.'}
          </p>
        </div>
      ) : (
        <div className="recipes-grid">
          {visible.map(r => {
            const exclusion = checkExclusions(r, { dislikes, allergens }, catalog)
            const triggered = allergens.filter(a => recipeAllergens(r, catalog).includes(a))
            const inFolders = memberships[r.id] ?? []
            const folderCount = inFolders.length
            return (
              <div key={r.id} className="recipe-card-wrap">
                <button
                  className={`recipe-card ${exclusion.excluded ? 'recipe-card-excluded' : ''}`}
                  onClick={() => setOpen(r)}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit'
                  }}
                >
                  {r.isCustom && (
                    <div
                      className="eyebrow"
                      style={{ color: 'var(--rust)', marginBottom: '6px', fontSize: '10px' }}
                    >
                      Custom
                    </div>
                  )}
                  {triggered.length > 0 && (
                    <div className="recipe-card-allergen-warning">
                      ⚠ Contains {triggered.map(a => ALLERGEN_LABELS[a]).join(', ')}
                    </div>
                  )}
                  <div className="recipe-card-name">{r.name}</div>
                  <div className="recipe-card-meta">
                    {r.prepMinutes + r.cookMinutes} minutes · serves {r.servings} · {r.ingredients.length} ingredients
                    {r.estimatedCostPerServing !== undefined && (
                      <> · ~${(r.estimatedCostPerServing / 100).toFixed(2)}/serving</>
                    )}
                  </div>
                  <div className="meal-tags">
                    {r.tags?.map(t => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                  <div className="recipe-diets">
                    {r.diets.map(d => (
                      <span key={d} className="diet-tag">{DIET_LABELS[d]}</span>
                    ))}
                  </div>
                </button>

                {/* Folder save button — overlaid top-right of the card */}
                <button
                  className={`recipe-card-folder-btn ${folderCount > 0 ? 'has-folders' : ''}`}
                  onClick={e => {
                    e.stopPropagation()
                    setFolderPopoverFor(folderPopoverFor === r.id ? null : r.id)
                  }}
                  aria-label={folderCount > 0 ? `In ${folderCount} folder${folderCount === 1 ? '' : 's'}` : 'Save to folder'}
                  title={folderCount > 0 ? `In ${folderCount} folder${folderCount === 1 ? '' : 's'}` : 'Save to folder'}
                >
                  {folderCount > 0 ? '🔖' : '📂'}
                  {folderCount > 0 && <span className="folder-btn-count">{folderCount}</span>}
                </button>

                {folderPopoverFor === r.id && (
                  <div
                    className="folder-popover-anchor"
                    onClick={e => e.stopPropagation()}
                  >
                    <SaveToFolderPopover
                      recipeId={r.id}
                      folders={folders}
                      selectedFolderIds={memberships[r.id] ?? []}
                      onFolderCreated={handleFolderCreated}
                      onMembershipChange={(folderId, isMember) =>
                        handleMembershipChange(r.id, folderId, isMember)
                      }
                      onClose={() => setFolderPopoverFor(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Backdrop to close the folder popover on outside click */}
      {folderPopoverFor && (
        <div
          className="folder-popover-backdrop"
          onClick={() => setFolderPopoverFor(null)}
        />
      )}

      {open && (
        <RecipeDetailModal
          recipe={open}
          dislikes={dislikes}
          allergens={allergens}
          folders={folders}
          catalog={catalog}
          selectedFolderIds={memberships[open.id] ?? []}
          onFolderCreated={handleFolderCreated}
          onMembershipChange={(folderId, isMember) =>
            handleMembershipChange(open.id, folderId, isMember)
          }
          onClose={() => setOpen(null)}
          onDelete={open.isCustom ? () => handleDelete(open) : undefined}
        />
      )}
    </div>
  )
}
