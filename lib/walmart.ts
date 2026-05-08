import type { GroceryList, GroceryLineItem } from './types'

// =============================================================================
// WALMART EXPORT
//
// Until you have OPD partner credentials, we offer three concrete things:
//   1. CSV download — print/share/use on phone while shopping
//   2. Search-link list — each item becomes a deep link to walmart.com
//      pre-populated with that search; click to jump straight to the product
//   3. OPD-shaped cart payload — the JSON we WILL send to Walmart's OPD API
//      once you have partner access. The structure is right, so swapping in
//      the real endpoint is a one-function change.
// =============================================================================

export interface WalmartCartItem {
  searchQuery: string
  quantity: number
  notes?: string
  walmartSearchUrl: string
}

export interface WalmartCart {
  items: WalmartCartItem[]
  storeId?: string
  fulfillmentType: 'pickup' | 'delivery'
}

export function buildWalmartCart(list: GroceryList): WalmartCart {
  const items: WalmartCartItem[] = []
  for (const lineItems of Object.values(list.byAisle)) {
    for (const item of lineItems) {
      items.push({
        searchQuery: item.ingredient.name,
        quantity: item.buyPackages,
        notes: item.ingredient.packageLabel,
        walmartSearchUrl: walmartSearchUrl(item.ingredient.name)
      })
    }
  }
  return {
    items,
    fulfillmentType: 'pickup'
  }
}

// Open walmart.com search for a single ingredient. Useful when shopping live.
export function walmartSearchUrl(query: string): string {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`
}

export function exportToCsv(list: GroceryList): string {
  const rows: string[] = ['Aisle,Item,Quantity,Package,Used in,Leftover note,Est cost']
  for (const [aisle, items] of Object.entries(list.byAisle)) {
    for (const item of items) {
      const cost = item.estimatedCostCents !== undefined
        ? `$${(item.estimatedCostCents / 100).toFixed(2)}`
        : ''
      const row = [
        aisle,
        escapeCsv(item.ingredient.name),
        item.buyPackages,
        escapeCsv(item.ingredient.packageLabel ?? ''),
        escapeCsv(item.usedIn.join('; ')),
        escapeCsv(item.leftoverSuggestion ?? ''),
        cost
      ].join(',')
      rows.push(row)
    }
  }
  return rows.join('\n')
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// Once you have OPD partner credentials, this is where the real submission goes.
export async function submitCart(_cart: WalmartCart): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: 'Walmart OPD integration pending partner approval. Cart payload generated for preview.'
  }
}

export function lineItemDisplay(item: GroceryLineItem): string {
  const pkg = item.buyPackages > 1 ? `${item.buyPackages}× ` : ''
  const label = item.ingredient.packageLabel ?? `${item.buyAmount} ${item.buyUnit}`
  return `${pkg}${item.ingredient.name} (${label})`
}
