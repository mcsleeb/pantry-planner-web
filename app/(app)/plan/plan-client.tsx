'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateWeek, DAY_LABELS, DIET_LABELS, recipesForDiet } from '@/lib/planner'
import type { Allergen, PantryItem, Recipe } from '@/lib/types'
import type { MealPlanRow } from '@/lib/db/plans'
import type { Profile } from '@/lib/db/user'

interface Props {
  profile: Profile
  initialPlan: MealPlanRow | null
  recipes: Recipe[]
  pantry: PantryItem[]
  dislikes: string[]
  allergens: Allergen[]
}

export function PlanClient({ profile, initialPlan, recipes, pantry, dislikes, allergens }: Props) {
  const router = useRouter()
  const [plan, setPlan] = useState(initialPlan)
  const [generating, startGenerating] = useTransition()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [swapMode, setSwapMode] = useState(false)

  const recipeById = new Map(recipes.map(r => [r.id, r]))
  const useUpCount = pantry.filter(p => p.useUp).length

  const generate = () => {
    const useUpIds = pantry.filter(p => p.useUp).map(p => p.ingredientId)
    const newPlan = generateWeek(
      recipes,
      profile.diet,
      profile.servings,
      'dinner',
      {
        pantry,
        useUpIds,
        excludeIngredients: dislikes,
        excludeAllergens: allergens
      }
    )
    startGenerating(async () => {
      const supabase = createClient()
      // Mark old plans inactive
      await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('user_id', profile.id)
        .eq('is_active', true)
      // Insert new plan
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: profile.id,
          name: 'Weekly plan',
          diet: profile.diet,
          servings: profile.servings,
          plan: newPlan,
          is_active: true
        })
        .select()
        .single()
      if (error) {
        console.error('Save plan failed', error)
        return
      }
      setPlan(data as MealPlanRow)
      router.refresh()
    })
  }

  const swapMeal = (index: number, recipeId: string) => {
    if (!plan) return
    const next = plan.plan.map((m, i) => i === index ? { ...m, recipeId } : m)
    setPlan({ ...plan, plan: next })
    startGenerating(async () => {
      const supabase = createClient()
      await supabase
        .from('meal_plans')
        .update({ plan: next, updated_at: new Date().toISOString() })
        .eq('id', plan.id)
    })
  }

  const clear = () => {
    if (!plan) return
    startGenerating(async () => {
      const supabase = createClient()
      await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('id', plan.id)
      setPlan(null)
      router.refresh()
    })
  }

  // ---- empty state ----
  if (!plan || plan.plan.length === 0) {
    return (
      <div className="page">
        <div className="hero hero-centered">
          <div>
            <div className="eyebrow">Plan a week</div>
            <h1>
              Cook well.<br />
              Waste <span className="accent">less</span>.
            </h1>
            <p className="hero-sub">
              Pick a diet and we&apos;ll arrange seven dinners that share ingredients —
              and use up what&apos;s already on your shelf.
            </p>
          </div>
        </div>

        <div className="empty-hero">
          <h2>An empty week, full of possibility.</h2>
          <p>
            Currently set to <em>{DIET_LABELS[profile.diet]}</em>
            {pantry.length > 0 && (
              <> — with {pantry.length} pantry {pantry.length === 1 ? 'item' : 'items'}
              {useUpCount > 0 && <> ({useUpCount} marked to use up)</>}</>
            )}.
          </p>
          <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'center', marginTop: 'var(--s-5)' }}>
            <button className="btn btn-primary" onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate the week →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- loaded state ----
  const totalRecipes = plan.plan.length
  const uniqueIngredients = new Set<string>()
  let totalMinutes = 0
  for (const meal of plan.plan) {
    const r = recipeById.get(meal.recipeId)
    if (!r) continue
    totalMinutes += r.prepMinutes + r.cookMinutes
    for (const ri of r.ingredients) uniqueIngredients.add(ri.ingredientId)
  }

  const useUpIds = new Set(pantry.filter(p => p.useUp).map(p => p.ingredientId))

  return (
    <div className="page">
      <div className="hero hero-tight">
        <div>
          <div className="eyebrow">Week of dinners — {DIET_LABELS[plan.diet]}</div>
          <h1>The <span className="accent">Week</span> Ahead</h1>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-num">{totalRecipes}</div>
            <div className="stat-label">Meals</div>
          </div>
          <div className="stat">
            <div className="stat-num">{uniqueIngredients.size}</div>
            <div className="stat-label">Ingredients</div>
          </div>
          <div className="stat">
            <div className="stat-num">{Math.round(totalMinutes / 60)}<span style={{fontSize:'20px',color:'var(--ink-mute)'}}>h</span></div>
            <div className="stat-label">Total time</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s-3)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={generate} disabled={generating}>
          {generating ? 'Working…' : '↻ Regenerate'}
        </button>
        <button className="btn btn-ghost" onClick={clear} disabled={generating}>
          Clear
        </button>
      </div>

      <div className="plan-grid">
        {plan.plan.map((meal, i) => {
          const recipe = recipeById.get(meal.recipeId)
          if (!recipe) return null
          const usesUseUp = recipe.ingredients.some(ri => useUpIds.has(ri.ingredientId))
          return (
            <button
              key={`${meal.day}-${i}`}
              className={`day-card ${usesUseUp ? 'uses-use-up' : ''}`}
              onClick={() => { setOpenIndex(i); setSwapMode(false) }}
            >
              <div className="day-head">
                <div className="day-name">{DAY_LABELS[meal.day].slice(0, 3)}</div>
                {usesUseUp ? <div className="day-num use-up-pin">🔥</div> : <div className="day-num">no. {i + 1}</div>}
              </div>
              <div className="meal">
                <div className="meal-name">{recipe.name}</div>
                <div className="meal-tags">
                  {recipe.tags?.slice(0, 2).map(t => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
                <div className="meal-meta">
                  <span>{recipe.prepMinutes + recipe.cookMinutes} min</span>
                  <span>serves {meal.servings}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Swap modal — simplified for Phase 1, can refine later */}
      {openIndex !== null && (
        <SwapModal
          currentRecipeId={plan.plan[openIndex]?.recipeId}
          options={recipesForDiet(recipes, plan.diet)}
          onPick={r => {
            swapMeal(openIndex, r.id)
            setOpenIndex(null)
          }}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  )
}

function SwapModal({ currentRecipeId, options, onPick, onClose }: {
  currentRecipeId?: string
  options: Recipe[]
  onPick: (r: Recipe) => void
  onClose: () => void
}) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>Swap or view this meal</div>
        <h2>Choose a recipe</h2>
        <div style={{ marginTop: 'var(--s-4)' }}>
          {options.map(r => (
            <button
              key={r.id}
              className="recipe-pick"
              onClick={() => onPick(r)}
              disabled={r.id === currentRecipeId}
              style={r.id === currentRecipeId ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              <div className="meal-name">{r.name}</div>
              <div className="meta-row">
                {r.prepMinutes + r.cookMinutes} min · serves {r.servings}
                {r.tags && r.tags.length > 0 && ` · ${r.tags.join(', ')}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
