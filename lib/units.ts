import type { Unit } from './types'

// Convert amounts between compatible units.
//
// Within-family conversions (volume↔volume, weight↔weight) are simple and
// always available. Cross-family conversions (volume↔weight) require knowing
// the ingredient's density (grams per ml) — see convertWithDensity.

const TO_BASE: Record<Unit, { base: 'count' | 'weight-g' | 'volume-ml'; factor: number }> = {
  whole: { base: 'count', factor: 1 },
  clove: { base: 'count', factor: 1 },     // cloves are counted, never converted to other units
  // weight
  g: { base: 'weight-g', factor: 1 },
  kg: { base: 'weight-g', factor: 1000 },
  oz: { base: 'weight-g', factor: 28.3495 },
  lb: { base: 'weight-g', factor: 453.592 },
  // volume — US customary (factors are ml per unit)
  fl_dr: { base: 'volume-ml', factor: 3.6967 },  // 1 US fluid dram ≈ 3.70 ml
  tsp: { base: 'volume-ml', factor: 4.92892 },
  tbsp: { base: 'volume-ml', factor: 14.7868 },
  fl_oz: { base: 'volume-ml', factor: 29.5735 }, // 1 cup = 8 fl_oz
  cup: { base: 'volume-ml', factor: 236.588 },
  pt: { base: 'volume-ml', factor: 473.176 },    // 2 cups
  qt: { base: 'volume-ml', factor: 946.353 },    // 4 cups
  gal: { base: 'volume-ml', factor: 3785.41 },   // 16 cups
  // volume — metric
  ml: { base: 'volume-ml', factor: 1 },
  l: { base: 'volume-ml', factor: 1000 }
}

export function unitFamily(u: Unit): 'count' | 'weight-g' | 'volume-ml' {
  return TO_BASE[u].base
}

export function unitsCompatible(a: Unit, b: Unit): boolean {
  // Cloves and "whole" are both `count` but you can't substitute one for the other,
  // so treat them as their own families for safety.
  if (a === 'clove' || b === 'clove') return a === b
  if (a === 'whole' || b === 'whole') return a === b
  return unitFamily(a) === unitFamily(b)
}

export function convert(amount: number, from: Unit, to: Unit): number {
  if (!unitsCompatible(from, to)) {
    throw new Error(`Cannot convert ${from} to ${to} (incompatible families)`)
  }
  if (from === to) return amount
  const fromBase = TO_BASE[from]
  const toBase = TO_BASE[to]
  const inBase = amount * fromBase.factor
  return inBase / toBase.factor
}

/**
 * Convert between volume and weight using an ingredient's density.
 * `density` is grams per milliliter (e.g. 0.91 for olive oil).
 * Returns null if the conversion is impossible (e.g. counted units).
 */
export function convertWithDensity(
  amount: number,
  from: Unit,
  to: Unit,
  density: number | undefined
): number | null {
  // Same-family: density not needed, fall back to simple convert
  if (unitsCompatible(from, to)) return convert(amount, from, to)
  // Counted units can't be bridged by density
  if (from === 'whole' || from === 'clove') return null
  if (to === 'whole' || to === 'clove') return null
  if (!density || density <= 0) return null

  const fromFam = unitFamily(from)
  const toFam = unitFamily(to)
  // Bridge volume → weight: convert to ml, multiply by density to get g, then to target weight
  if (fromFam === 'volume-ml' && toFam === 'weight-g') {
    const ml = amount * TO_BASE[from].factor
    const grams = ml * density
    return grams / TO_BASE[to].factor
  }
  // Bridge weight → volume: convert to g, divide by density to get ml, then to target volume
  if (fromFam === 'weight-g' && toFam === 'volume-ml') {
    const grams = amount * TO_BASE[from].factor
    const ml = grams / density
    return ml / TO_BASE[to].factor
  }
  return null
}

/** True if `from` and `to` can be converted, possibly via density. */
export function unitsConvertibleWithDensity(
  from: Unit,
  to: Unit,
  density: number | undefined
): boolean {
  if (unitsCompatible(from, to)) return true
  if (from === 'whole' || from === 'clove' || to === 'whole' || to === 'clove') return false
  if (!density || density <= 0) return false
  const fromFam = unitFamily(from)
  const toFam = unitFamily(to)
  return (
    (fromFam === 'volume-ml' && toFam === 'weight-g') ||
    (fromFam === 'weight-g' && toFam === 'volume-ml')
  )
}

// Pick a sensible display unit given an amount in a base family.
// e.g. 24 tsp -> 0.5 cup, 1500 g -> 1.5 kg
export function prettyUnit(amount: number, unit: Unit): { amount: number; unit: Unit } {
  if (unit === 'tsp' && amount >= 3) return { amount: amount / 3, unit: 'tbsp' }
  if (unit === 'tbsp' && amount >= 16) return { amount: amount / 16, unit: 'cup' }
  if (unit === 'fl_oz' && amount >= 8) return { amount: amount / 8, unit: 'cup' }
  if (unit === 'cup' && amount >= 2) return { amount: amount / 2, unit: 'pt' }
  if (unit === 'pt' && amount >= 2) return { amount: amount / 2, unit: 'qt' }
  if (unit === 'qt' && amount >= 4) return { amount: amount / 4, unit: 'gal' }
  if (unit === 'ml' && amount >= 1000) return { amount: amount / 1000, unit: 'l' }
  if (unit === 'g' && amount >= 1000) return { amount: amount / 1000, unit: 'kg' }
  if (unit === 'oz' && amount >= 16) return { amount: amount / 16, unit: 'lb' }
  return { amount, unit }
}

export function formatAmount(amount: number, unit: Unit): string {
  // Round to 2 decimals, drop trailing zeros
  const rounded = Math.round(amount * 100) / 100
  const num = Number.isInteger(rounded) ? rounded.toString() : rounded.toString()
  // Pluralize "whole" as ""
  if (unit === 'whole') return num
  if (unit === 'clove') return `${num} ${rounded === 1 ? 'clove' : 'cloves'}`
  if (unit === 'fl_oz') return `${num} fl oz`
  if (unit === 'fl_dr') return `${num} fl dr`
  if (unit === 'pt') return `${num} ${rounded === 1 ? 'pint' : 'pints'}`
  if (unit === 'qt') return `${num} ${rounded === 1 ? 'quart' : 'quarts'}`
  if (unit === 'gal') return `${num} ${rounded === 1 ? 'gallon' : 'gallons'}`
  return `${num} ${unit}`
}

/** Display label for a unit (for dropdowns) */
export const UNIT_LABELS: Record<Unit, string> = {
  whole: 'whole / each',
  clove: 'cloves',
  g: 'grams (g)',
  kg: 'kilograms (kg)',
  oz: 'ounces (oz, weight)',
  lb: 'pounds (lb)',
  ml: 'milliliters (ml)',
  l: 'liters (l)',
  fl_dr: 'fluid drams',
  tsp: 'teaspoons (tsp)',
  tbsp: 'tablespoons (tbsp)',
  fl_oz: 'fluid ounces (fl oz)',
  cup: 'cups',
  pt: 'pints',
  qt: 'quarts',
  gal: 'gallons'
}

/** Every unit, in a sensible order for dropdowns. */
export const ALL_UNITS: Unit[] = [
  'whole', 'clove',
  'g', 'kg', 'oz', 'lb',
  'ml', 'l',
  'fl_dr', 'tsp', 'tbsp', 'fl_oz', 'cup', 'pt', 'qt', 'gal'
]
