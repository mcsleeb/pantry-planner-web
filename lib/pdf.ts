import type { Aisle, Diet, GroceryList, PlannedMeal, Recipe } from './types'
import { INGREDIENTS } from './data/ingredients'
import { DAY_LABELS, DIET_LABELS } from './planner'
import { formatAmount } from './units'

// =============================================================================
// PDF BUILDER — COMPACT VERSION
//
// Designed to fit a full week's plan + grocery list in 2-3 printed pages.
// No cover page. Recipes flow continuously (multiple per page when they fit).
// Grocery list uses multi-column layout to pack tight.
//
// Print target: US Letter, 0.4" margins, ~10pt body, ~12pt recipe titles.
// =============================================================================

export interface PdfPlanContext {
  plan: PlannedMeal[]
  recipes: Recipe[]
  groceryList: GroceryList
  diet: Diet
  servings: number
}

export function buildWeeklyPlanHtml(ctx: PdfPlanContext): string {
  const recipeById = new Map(ctx.recipes.map(r => [r.id, r]))
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Weekly Plan & Grocery List</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${pdfStyles()}</style>
</head>
<body>
${renderHeader(ctx, dateStr)}
<div class="recipes-flow">
  ${ctx.plan.map((meal, i) => renderRecipe(meal, recipeById.get(meal.recipeId), i + 1)).join('')}
</div>
${renderGroceryList(ctx.groceryList)}
</body>
</html>`
}

// ---- HEADER (top of page 1, replaces cover) --------------------------------
function renderHeader(ctx: PdfPlanContext, dateStr: string): string {
  const cost = ctx.groceryList.estimatedTotalCost
  return /* html */ `
<header class="doc-head">
  <div class="head-left">
    <div class="head-eyebrow">Pantry Planner — week of ${escapeHtml(dateStr)}</div>
    <h1 class="head-title">${ctx.plan.length} dinners <span class="amp">&amp;</span> grocery list</h1>
  </div>
  <div class="head-right">
    <span class="head-stat">${DIET_LABELS[ctx.diet]}</span>
    <span class="head-stat">${ctx.servings} servings</span>
    <span class="head-stat">${ctx.groceryList.totalItems} items</span>
    ${cost !== undefined ? `<span class="head-stat">~$${(cost / 100).toFixed(0)}</span>` : ''}
  </div>
</header>`
}

// ---- RECIPE BLOCK (multiple flow per page) ---------------------------------
function renderRecipe(meal: PlannedMeal, recipe: Recipe | undefined, num: number): string {
  if (!recipe) return ''
  const totalMin = recipe.prepMinutes + recipe.cookMinutes
  return /* html */ `
<article class="recipe">
  <div class="recipe-head">
    <span class="r-day">${DAY_LABELS[meal.day]}</span>
    <h2 class="r-title">${escapeHtml(recipe.name)}</h2>
    <span class="r-meta">${totalMin} min · serves ${meal.servings}</span>
  </div>
  <div class="recipe-body">
    <ul class="r-ing">
      ${recipe.ingredients.map(ri => {
        const ing = INGREDIENTS[ri.ingredientId]
        const scaled = ri.amount * (meal.servings / recipe.servings)
        return `<li><span class="iamt">${escapeHtml(formatAmount(scaled, ri.unit))}</span> ${escapeHtml(ing?.name ?? ri.ingredientId)}${ri.prepNote ? `<span class="ipn"> — ${escapeHtml(ri.prepNote)}</span>` : ''}</li>`
      }).join('')}
    </ul>
    <ol class="r-steps">
      ${recipe.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
    </ol>
  </div>
</article>`
}

// ---- GROCERY LIST (multi-column, dense) ------------------------------------
function renderGroceryList(list: GroceryList): string {
  const aisleLabels: Record<Aisle, string> = {
    produce: 'Produce', meat: 'Meat', seafood: 'Seafood',
    dairy: 'Dairy', bakery: 'Bakery', pantry: 'Pantry',
    frozen: 'Frozen', spices: 'Spices', condiments: 'Condiments'
  }
  const aisleOrder: Aisle[] = ['produce', 'meat', 'seafood', 'dairy', 'bakery', 'pantry', 'frozen', 'spices', 'condiments']
  const cost = list.estimatedTotalCost

  // Build aisle blocks
  const blocks = aisleOrder
    .filter(a => list.byAisle[a]?.length > 0)
    .map(aisle => {
      const items = list.byAisle[aisle]
      return /* html */ `
<div class="g-aisle">
  <h3 class="g-aisle-name">${aisleLabels[aisle]} <span class="g-aisle-count">${items.length}</span></h3>
  <ul class="g-list">
    ${items.map(item => `
      <li>
        <span class="g-check"></span>
        <span class="g-qty">${item.buyPackages}×</span>
        <span class="g-name">${escapeHtml(item.ingredient.name)}</span>
        <span class="g-pkg">${escapeHtml(item.ingredient.packageLabel ?? '')}</span>
        ${item.estimatedCostCents !== undefined ? `<span class="g-cost">$${(item.estimatedCostCents / 100).toFixed(2)}</span>` : ''}
      </li>`).join('')}
  </ul>
</div>`
    }).join('')

  return /* html */ `
<section class="grocery">
  <div class="grocery-head">
    <h2 class="g-title">Grocery list</h2>
    <span class="g-summary">${list.totalItems} items${cost !== undefined ? ` · ~$${(cost / 100).toFixed(0)}` : ''}${list.estimatedLeftoverPercent > 0 ? ` · ${list.estimatedLeftoverPercent}% leftover` : ''}</span>
  </div>
  <div class="grocery-cols">
    ${blocks}
  </div>
</section>`
}

// ---- STYLES (compact print CSS) --------------------------------------------
function pdfStyles(): string {
  return /* css */ `
@page {
  size: Letter;
  margin: 0.4in;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 9.5pt;
  line-height: 1.35;
  color: #1f1a14;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.italic, em { font-style: italic; }

/* ---- Document header (top of page 1) ---- */
.doc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1.5px solid #1f1a14;
  padding-bottom: 8pt;
  margin-bottom: 14pt;
}
.head-eyebrow {
  font-size: 7.5pt;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #8a7c66;
  font-weight: 600;
  margin-bottom: 3pt;
}
.head-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22pt;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1;
}
.head-title .amp {
  font-style: italic;
  color: #a8451f;
  font-weight: 400;
}
.head-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2pt;
}
.head-stat {
  font-size: 8pt;
  color: #4a3f30;
  font-weight: 500;
}

/* ---- Recipe blocks (flow) ---- */
.recipes-flow {
  margin-bottom: 16pt;
}

.recipe {
  /* keep each recipe together when possible */
  break-inside: avoid;
  page-break-inside: avoid;
  border-top: 0.5pt solid #d8cdb8;
  padding: 9pt 0 7pt;
}
.recipe:first-child { border-top: none; padding-top: 0; }

.recipe-head {
  display: flex;
  align-items: baseline;
  gap: 8pt;
  margin-bottom: 5pt;
}
.r-day {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 8.5pt;
  font-style: italic;
  color: #a8451f;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  min-width: 60pt;
}
.r-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 13pt;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.1;
  flex: 1;
}
.r-meta {
  font-size: 7.5pt;
  color: #8a7c66;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.recipe-body {
  display: grid;
  grid-template-columns: 38% 62%;
  gap: 14pt;
  align-items: start;
}

.r-ing {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 9pt;
}
.r-ing li {
  padding: 1.5pt 0;
  border-bottom: 0.25pt dotted #d8cdb8;
  line-height: 1.3;
}
.r-ing li:last-child { border-bottom: none; }
.iamt {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  color: #a8451f;
  margin-right: 2pt;
}
.ipn {
  font-style: italic;
  color: #8a7c66;
  font-size: 8pt;
}

.r-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 9.5pt;
  counter-reset: step;
}
.r-steps li {
  position: relative;
  padding: 0 0 4pt 16pt;
  counter-increment: step;
  line-height: 1.4;
}
.r-steps li:before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  color: #a8451f;
  font-size: 9.5pt;
  width: 12pt;
}

/* ---- Grocery list ---- */
.grocery {
  break-before: page;
  page-break-before: always;
}
.grocery-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1.5px solid #1f1a14;
  padding-bottom: 6pt;
  margin-bottom: 10pt;
}
.g-title {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 18pt;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.02em;
}
.g-summary {
  font-size: 8.5pt;
  color: #4a3f30;
  font-weight: 500;
}

.grocery-cols {
  column-count: 2;
  column-gap: 18pt;
  column-rule: 0.5pt solid #d8cdb8;
}

.g-aisle {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-bottom: 9pt;
}

.g-aisle-name {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 10pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1f1a14;
  border-bottom: 1pt solid #1f1a14;
  padding-bottom: 2pt;
  margin: 0 0 4pt;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.g-aisle-count {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 400;
  font-size: 8.5pt;
  color: #8a7c66;
  text-transform: lowercase;
  letter-spacing: 0;
}

.g-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.g-list li {
  display: grid;
  grid-template-columns: 10pt 22pt 1fr auto;
  gap: 4pt;
  align-items: baseline;
  padding: 1.5pt 0;
  font-size: 8.5pt;
  line-height: 1.25;
  break-inside: avoid;
  page-break-inside: avoid;
}
.g-check {
  display: inline-block;
  width: 8pt;
  height: 8pt;
  border: 0.75pt solid #4a3f30;
  border-radius: 50%;
  margin-top: 1pt;
}
.g-qty {
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  color: #a8451f;
  font-weight: 500;
  text-align: right;
}
.g-name {
  font-weight: 500;
  color: #1f1a14;
}
.g-pkg {
  display: block;
  grid-column: 3;
  font-size: 7pt;
  color: #8a7c66;
  font-style: italic;
  margin-top: -1pt;
}
.g-cost {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 8pt;
  color: #4a3f30;
  font-weight: 500;
  text-align: right;
}
`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
