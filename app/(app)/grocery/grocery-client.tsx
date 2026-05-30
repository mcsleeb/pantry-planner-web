'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { buildWalmartCart, walmartSearchUrl, exportToCsv } from '@/lib/walmart'
import { buildWeeklyPlanHtml } from '@/lib/pdf'
import { formatAmount } from '@/lib/units'
import type { Aisle, Diet, GroceryList, Ingredient, PlannedMeal, PriceEntry, Recipe } from '@/lib/types'

const AISLE_LABELS: Record<Aisle, string> = {
  produce: 'Produce',
  meat: 'Meat',
  seafood: 'Seafood',
  dairy: 'Dairy',
  bakery: 'Bakery',
  pantry: 'Pantry',
  frozen: 'Frozen',
  spices: 'Spices',
  condiments: 'Condiments'
}

interface Props {
  empty?: boolean
  groceryList?: GroceryList
  planMeals?: PlannedMeal[]
  recipes?: Recipe[]
  diet?: Diet
  servings?: number
  pantryCount?: number
  catalog?: Record<string, Ingredient>
}

export function GroceryClient(props: Props) {
  if (props.empty || !props.groceryList) {
    return (
      <div className="page">
        <div className="empty-hero">
          <h2>No plan, no list.</h2>
          <p>
            Generate a meal plan first and we&apos;ll build the grocery list from it.{' '}
            <Link href="/plan" className="accent">Go to The Week →</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <GroceryView
      groceryList={props.groceryList}
      planMeals={props.planMeals ?? []}
      recipes={props.recipes ?? []}
      diet={props.diet ?? 'omnivore'}
      servings={props.servings ?? 2}
      pantryCount={props.pantryCount ?? 0}
      catalog={props.catalog ?? {}}
    />
  )
}

interface ViewProps {
  groceryList: GroceryList
  planMeals: PlannedMeal[]
  recipes: Recipe[]
  diet: Diet
  servings: number
  pantryCount: number
  catalog: Record<string, Ingredient>
}

function GroceryView({
  groceryList,
  planMeals,
  recipes,
  diet,
  servings,
  pantryCount,
  catalog
}: ViewProps) {
  const [list, setList] = useState<GroceryList>(groceryList)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [pricing, setPricing] = useState<{ loading: boolean; error?: string }>({ loading: false })
  const [showWalmart, setShowWalmart] = useState(false)

  const allItems = useMemo(() => Object.values(list.byAisle).flat(), [list])
  const checkedCount = allItems.filter(i => checked.has(i.ingredient.id)).length
  const totalCost = list.estimatedTotalCost

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---- Pricing -------------------------------------------------------------
  const fetchPrices = async () => {
    setPricing({ loading: true })
    try {
      // Build "amount unit name" lines for ingredients we don't have priced
      const items = allItems
        .filter(i => i.estimatedCostCents === undefined)
        .map(i => ({
          ingredientId: i.ingredient.id,
          line: `${formatAmount(i.buyAmount, i.buyUnit)} ${i.ingredient.name}`
        }))
      if (items.length === 0) {
        setPricing({ loading: false })
        return
      }
      const res = await fetch('/api/spoonacular/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })
      const data = await res.json()
      if (!res.ok) {
        setPricing({ loading: false, error: data?.error ?? `Pricing failed (HTTP ${res.status}).` })
        return
      }
      // Merge prices into the list and recompute the cost summary
      const prices: Record<string, PriceEntry> = data.prices ?? {}
      setList(prev => mergePrices(prev, prices))
      setPricing({ loading: false })
    } catch (err) {
      setPricing({
        loading: false,
        error: err instanceof Error ? err.message : 'Network error.'
      })
    }
  }

  // ---- CSV download --------------------------------------------------------
  const downloadCsv = () => {
    const csv = exportToCsv(list)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `grocery-list-${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ---- PDF via print window ------------------------------------------------
  const printPdf = () => {
    const html = buildWeeklyPlanHtml({
      plan: planMeals,
      recipes,
      groceryList: list,
      diet,
      servings,
      catalog
    })
    const w = window.open('', '_blank')
    if (!w) {
      alert('Please allow pop-ups to export a PDF.')
      return
    }
    w.document.write(html)
    w.document.close()
    // Give the new document a moment to lay out before invoking print
    w.onload = () => {
      w.focus()
      w.print()
    }
  }

  return (
    <div className="page">
      <div className="hero hero-tight">
        <div>
          <div className="eyebrow">For the week of cooking</div>
          <h1>The <span className="accent">List</span></h1>
          {pantryCount > 0 && (
            <p className="hero-sub" style={{ fontSize: '14px' }}>
              {pantryCount} pantry {pantryCount === 1 ? 'item' : 'items'} subtracted from this list.
            </p>
          )}
        </div>
      </div>

      <div className="grocery-summary">
        <div className="summary-stat">
          <div className="stat-num">{list.totalItems}</div>
          <div className="stat-label">Items to buy</div>
        </div>
        <div className="summary-stat">
          <div className="stat-num">
            {checkedCount}
            <span style={{ color: 'var(--ink-mute)', fontSize: '20px' }}>
              /{list.totalItems}
            </span>
          </div>
          <div className="stat-label">Checked off</div>
        </div>
        <div className="summary-stat">
          <div
            className="stat-num"
            style={{ color: list.estimatedLeftoverPercent > 30 ? 'var(--rust)' : 'var(--moss-deep)' }}
          >
            {list.estimatedLeftoverPercent}%
          </div>
          <div className="stat-label">Est. leftover</div>
        </div>
        <div className="summary-stat">
          {totalCost !== undefined ? (
            <>
              <div className="stat-num">${(totalCost / 100).toFixed(0)}</div>
              <div className="stat-label">Est. total cost</div>
            </>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={fetchPrices}
              disabled={pricing.loading}
              style={{ fontSize: '12px' }}
            >
              {pricing.loading ? 'Pricing…' : '$ Estimate prices'}
            </button>
          )}
        </div>
        <div className="grocery-actions">
          <button className="btn btn-primary" onClick={printPdf}>
            🖨 Save as PDF
          </button>
          <button className="btn btn-rust" onClick={() => setShowWalmart(true)}>
            Open in Walmart
          </button>
          <button className="btn btn-ghost" onClick={downloadCsv}>
            Download CSV
          </button>
        </div>
      </div>

      {pricing.error && (
        <div className="form-error" style={{ marginBottom: 'var(--s-4)' }}>
          {pricing.error}
        </div>
      )}

      {Object.entries(list.byAisle).map(([aisle, items]) => {
        if (items.length === 0) return null
        return (
          <section key={aisle} className="aisle-section">
            <div className="aisle-head">
              <div className="aisle-name">{AISLE_LABELS[aisle as Aisle]}</div>
              <div className="aisle-count">
                — {items.length} {items.length === 1 ? 'item' : 'items'}
              </div>
            </div>
            <div className="grocery-items">
              {items.map(item => {
                const isChecked = checked.has(item.ingredient.id)
                return (
                  <div
                    key={item.ingredient.id}
                    className={`grocery-item ${isChecked ? 'checked' : ''}`}
                  >
                    <button
                      className={`check ${isChecked ? 'on' : ''}`}
                      onClick={() => toggleCheck(item.ingredient.id)}
                      aria-label={`Toggle ${item.ingredient.name}`}
                    />
                    <div className="item-body">
                      <div className="item-name">{item.ingredient.name}</div>
                      <div className="item-pkg">
                        {item.ingredient.packageLabel ??
                          formatAmount(item.buyAmount, item.buyUnit)}
                      </div>
                      <div className="item-used-in">For: {item.usedIn.join(' · ')}</div>
                      {item.leftoverSuggestion && (
                        <div className="item-leftover">{item.leftoverSuggestion}</div>
                      )}
                    </div>
                    <div>
                      <div className="item-qty">{item.buyPackages}×</div>
                      <div className="item-qty-label">
                        {item.estimatedCostCents !== undefined
                          ? `$${(item.estimatedCostCents / 100).toFixed(2)}`
                          : 'buy'}
                      </div>
                    </div>
                    <a
                      className="btn btn-ghost btn-tiny"
                      title="Find on Walmart"
                      href={walmartSearchUrl(item.ingredient.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔎
                    </a>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {showWalmart && (
        <WalmartLinksModal list={list} onClose={() => setShowWalmart(false)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recompute a grocery list's cost fields after fetching prices.
// ---------------------------------------------------------------------------
function mergePrices(
  list: GroceryList,
  prices: Record<string, PriceEntry>
): GroceryList {
  const byAisle = {} as GroceryList['byAisle']
  let totalCostCents = 0
  let costsKnown = 0

  for (const [aisle, items] of Object.entries(list.byAisle)) {
    byAisle[aisle as Aisle] = items.map(item => {
      const price = prices[item.ingredient.id]
      const estimatedCostCents = price
        ? price.pricePerPackageCents * item.buyPackages
        : item.estimatedCostCents
      if (estimatedCostCents !== undefined) {
        totalCostCents += estimatedCostCents
        costsKnown++
      }
      return { ...item, estimatedCostCents }
    })
  }

  return {
    ...list,
    byAisle,
    estimatedTotalCost: costsKnown > 0 ? totalCostCents : undefined
  }
}

// ---------------------------------------------------------------------------
// Walmart "one link per item" modal
// ---------------------------------------------------------------------------
function WalmartLinksModal({
  list,
  onClose
}: {
  list: GroceryList
  onClose: () => void
}) {
  const cart = buildWalmartCart(list)
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="eyebrow" style={{ marginBottom: '8px' }}>One link per item</div>
        <h2 className="recipe-modal-title">Open items at Walmart</h2>
        <p className="hero-sub" style={{ marginTop: 'var(--s-3)' }}>
          Click any ingredient to open a pre-filled Walmart search in a new tab.
        </p>
        <div style={{ marginTop: 'var(--s-4)', maxHeight: '50vh', overflowY: 'auto' }}>
          {cart.items.map((item, i) => (
            <a
              key={i}
              className="recipe-pick"
              href={item.walmartSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none'
              }}
            >
              <div>
                <div className="item-name">{item.searchQuery}</div>
                <div className="item-used-in">
                  {item.quantity}× {item.notes ? `· ${item.notes}` : ''}
                </div>
              </div>
              <span style={{ color: 'var(--rust)', fontSize: '14px' }}>↗</span>
            </a>
          ))}
        </div>
        <div className="recipe-modal-foot" style={{ marginTop: 'var(--s-4)' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
