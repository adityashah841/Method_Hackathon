// Suggested mix + linked sliders
// ---------------------------------------------------------------
// Plain idea: Maya picks what she'd like to invest in. We then search for
// the split between those investments that gives her goals the best odds
// across the simulated futures, inside guardrails the family would expect
// (small caps on risky or hard-to-sell assets). Everything is deterministic:
// same choices -> same suggested plan.

import { simulatePlan, ASSETS } from './engine.js'

// What Maya can choose from, in display order.
export const INVESTMENT_OPTIONS = [
  { id: 'stocks', label: 'Stocks', blurb: 'Shares in companies. Grow over time, swing year to year.', tag: 'Growth', kind: 'core', color: '#23262b' },
  { id: 'bonds', label: 'Bonds', blurb: 'Loans to governments and companies. Steady, lower growth.', tag: 'Steady', kind: 'core', color: '#6b7078' },
  { id: 'realEstate', label: 'Real estate', blurb: 'Property and buildings. Rental income plus growth.', tag: 'Income', kind: 'core', color: '#a6aab1' },
  { id: 'cash', label: 'Cash', blurb: 'Savings you can use any time. Safe, barely grows.', tag: 'Very steady', kind: 'core', color: '#d6d8dc' },
  { id: 'privateEquity', label: 'Private equity', blurb: 'Stakes in private companies. Higher growth, money locked up.', tag: 'Locked up', kind: 'alt', color: '#5a3d00' },
  { id: 'art', label: 'Fine art', blurb: 'Paintings and sculpture. Can appreciate; hard to sell fast.', tag: 'Hard to sell', kind: 'alt', color: '#8f6200' },
  { id: 'cars', label: 'Vintage cars', blurb: 'Classic cars as collectibles. A passion asset, slow to sell.', tag: 'Hard to sell', kind: 'alt', color: '#c98a00' },
  { id: 'gold', label: 'Gold', blurb: 'A store of value that often holds up in a crisis.', tag: 'Crisis hedge', kind: 'alt', color: '#f0c75e' },
  { id: 'crypto', label: 'Crypto', blurb: 'Digital currencies. Very large swings both ways.', tag: 'Very large swings', kind: 'alt', color: '#2f7d4f' },
]
export const OPTION_BY_ID = Object.fromEntries(INVESTMENT_OPTIONS.map((o) => [o.id, o]))
export const DEFAULT_PICKS = ['stocks', 'bonds', 'realEstate']

// Guardrails (percent of the plan). Illustrative family rules.
export const CAPS = { stocks: 90, bonds: 90, realEstate: 30, cash: 20, privateEquity: 15, art: 10, cars: 10, gold: 10, crypto: 5 }
export const ALT_TOTAL_CAP = 25
export const SAFE_FLOOR = 15 // bonds + cash stay at 15% or more when picked
export const MIN_PICKED = 5 // anything Maya picks gets at least 5%
const STEP = 5

const IMPORTANCE = { High: 2, Medium: 1, Low: 0.5 }
const isAlt = (k) => OPTION_BY_ID[k]?.kind === 'alt'

export function toWeights(alloc) {
  const total = Object.values(alloc).reduce((a, b) => a + b, 0) || 1
  return Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, v / total]))
}

const safeShare = (alloc) => ('bonds' in alloc || 'cash' in alloc ? (alloc.bonds || 0) + (alloc.cash || 0) : null)

export function withinGuardrails(alloc) {
  const alt = Object.entries(alloc).filter(([k]) => isAlt(k)).reduce((a, [, v]) => a + v, 0)
  const safe = safeShare(alloc)
  return Object.entries(alloc).every(([k, v]) => v <= (CAPS[k] ?? 100)) && alt <= ALT_TOTAL_CAP && (safe == null || safe >= SAFE_FLOOR)
}

export function guardrailIssues(alloc) {
  const issues = []
  for (const [k, v] of Object.entries(alloc)) {
    if (v > (CAPS[k] ?? 100)) issues.push(`${ASSETS[k].label} is above the ${CAPS[k]}% guardrail`)
  }
  const alt = Object.entries(alloc).filter(([k]) => isAlt(k)).reduce((a, [, v]) => a + v, 0)
  if (alt > ALT_TOTAL_CAP) issues.push(`Alternatives total ${alt}%, above the ${ALT_TOTAL_CAP}% guardrail`)
  const safe = safeShare(alloc)
  if (safe != null && safe < SAFE_FLOOR) issues.push(`Bonds and cash total ${safe}%, below the ${SAFE_FLOOR}% safety floor`)
  return issues
}

// Importance-weighted average chance of reaching the goals.
export function goalScore({ alloc, goals, startWealth, nPaths = 400 }) {
  const { probabilities } = simulatePlan({ startWealth, weights: toWeights(alloc), goals, nPaths })
  let num = 0, den = 0
  for (const g of goals) {
    const w = IMPORTANCE[g.importance] ?? 1
    num += w * probabilities[g.id]
    den += w
  }
  return den ? num / den : 0
}

// A feasible starting mix: picked alternatives at the minimum, the rest
// split across picked core assets in a traditional proportion.
function startingMix(picks) {
  const base = { stocks: 55, bonds: 30, realEstate: 10, cash: 5 }
  const alloc = Object.fromEntries(picks.map((k) => [k, 0]))
  const alts = picks.filter(isAlt)
  const cores = picks.filter((k) => !isAlt(k))
  for (const k of alts) alloc[k] = MIN_PICKED
  let left = 100 - alts.length * MIN_PICKED
  if (!cores.length) {
    // Only alternatives picked: split evenly (guardrails can't all hold; the UI says so)
    const each = Math.floor(100 / alts.length / STEP) * STEP
    alts.forEach((k) => (alloc[k] = each))
    alloc[alts[0]] += 100 - each * alts.length
    return alloc
  }
  const baseSum = cores.reduce((a, k) => a + (base[k] ?? 10), 0)
  let given = 0
  cores.forEach((k) => {
    const v = Math.floor(((base[k] ?? 10) / baseSum) * left / STEP) * STEP
    alloc[k] = Math.max(MIN_PICKED, v)
    given += alloc[k]
  })
  alloc[cores[0]] += left - given
  return alloc
}

// Greedy search: repeatedly move 5% from one picked investment to another
// if it raises the goal score, staying inside guardrails, until no move helps.
// Ties are broken by keeping the earlier (more conservative) mix.
export function suggestAllocation({ picks, goals, startWealth, maxRounds = 30 }) {
  let alloc = startingMix(picks)
  if (picks.length < 2) return alloc
  let best = goalScore({ alloc, goals, startWealth })
  for (let round = 0; round < maxRounds; round++) {
    let move = null
    for (const from of picks) {
      if (alloc[from] - STEP < MIN_PICKED) continue
      for (const to of picks) {
        if (to === from) continue
        const next = { ...alloc, [from]: alloc[from] - STEP, [to]: alloc[to] + STEP }
        if (!withinGuardrails(next)) continue
        const score = goalScore({ alloc: next, goals, startWealth })
        if (score > best + 1e-9 && (!move || score > move.score)) move = { next, score }
      }
    }
    if (!move) break
    alloc = move.next
    best = move.score
  }
  return alloc
}

// Linked sliders: set one investment to `value`, then scale the others so
// the total stays 100%, in 5% steps. Others keep their proportions.
export function rebalance(alloc, key, value) {
  const keys = Object.keys(alloc)
  const others = keys.filter((k) => k !== key)
  value = Math.max(0, Math.min(100, Math.round(value / STEP) * STEP))
  if (!others.length) return { [key]: 100 }
  const remaining = 100 - value
  const otherSum = others.reduce((a, k) => a + alloc[k], 0)
  const raw = others.map((k) => ({
    k,
    v: otherSum > 0 ? (alloc[k] / otherSum) * remaining : remaining / others.length,
  }))
  // Round to 5% steps, handing leftover steps to the largest remainders
  const out = { [key]: value }
  let used = 0
  raw.forEach((r) => { out[r.k] = Math.floor(r.v / STEP) * STEP; used += out[r.k] })
  const order = [...raw].sort((a, b) => (b.v - Math.floor(b.v / STEP) * STEP) - (a.v - Math.floor(a.v / STEP) * STEP) || keys.indexOf(a.k) - keys.indexOf(b.k))
  let left = remaining - used
  for (let i = 0; left >= STEP; i = (i + 1) % order.length) { out[order[i].k] += STEP; left -= STEP }
  return Object.fromEntries(keys.map((k) => [k, out[k]]))
}

export function describeMix(alloc) {
  return Object.entries(alloc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v}% ${ASSETS[k].label.toLowerCase()}`)
    .join(', ')
}
