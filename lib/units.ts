import type { Unit } from './types'

// Convert amounts between compatible units. Volume <-> weight is intentionally
// not supported because that requires density per ingredient, which we don't track.
// If you ever need it, add a `density` field to Ingredient and extend this.

const TO_BASE: Record<Unit, { base: 'count' | 'weight-g' | 'volume-ml'; factor: number }> = {
  whole: { base: 'count', factor: 1 },
  clove: { base: 'count', factor: 1 },     // cloves are counted, never converted to other units
  g: { base: 'weight-g', factor: 1 },
  kg: { base: 'weight-g', factor: 1000 },
  oz: { base: 'weight-g', factor: 28.3495 },
  lb: { base: 'weight-g', factor: 453.592 },
  ml: { base: 'volume-ml', factor: 1 },
  l: { base: 'volume-ml', factor: 1000 },
  tsp: { base: 'volume-ml', factor: 4.92892 },
  tbsp: { base: 'volume-ml', factor: 14.7868 },
  cup: { base: 'volume-ml', factor: 236.588 }
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

// Pick a sensible display unit given an amount in a base family.
// e.g. 24 tsp -> 0.5 cup, 1500 g -> 1.5 kg
export function prettyUnit(amount: number, unit: Unit): { amount: number; unit: Unit } {
  if (unit === 'tsp' && amount >= 3) return { amount: amount / 3, unit: 'tbsp' }
  if (unit === 'tbsp' && amount >= 16) return { amount: amount / 16, unit: 'cup' }
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
  return `${num} ${unit}`
}
