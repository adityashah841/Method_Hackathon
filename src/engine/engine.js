// Heirloom simulation engine
// ---------------------------------------------------------------
// Plain idea: we don't predict ONE future. We generate 1,000 possible
// futures by "rolling the dice" for each year's market return, then count
// how often things work out. That count is the probability we show.
//
// Everything here is deterministic for a given seed, so the same inputs
// always give the same numbers (no AI, no randomness between renders).

// ---- Asset assumptions (illustrative long-run figures, NOT forecasts) ----
export const ASSETS = {
  stocks:     { label: 'Stocks',            mu: 0.08, sigma: 0.16 },
  bonds:      { label: 'Bonds',             mu: 0.04, sigma: 0.06 },
  realEstate: { label: 'Real estate',       mu: 0.06, sigma: 0.12 },
  cash:       { label: 'Cash',              mu: 0.03, sigma: 0.01 },
  familyCo:   { label: 'Family company stock', mu: 0.09, sigma: 0.35 },
}
export const ASSET_KEYS = Object.keys(ASSETS)

// How much assets move together (illustrative). Order = ASSET_KEYS.
const CORR = [
  // stocks bonds  RE   cash  famCo
  [1.0,   0.1,  0.6,  0.0,  0.6], // stocks
  [0.1,   1.0,  0.2,  0.1,  0.05], // bonds
  [0.6,   0.2,  1.0,  0.0,  0.4], // real estate
  [0.0,   0.1,  0.0,  1.0,  0.0], // cash
  [0.6,   0.05, 0.4,  0.0,  1.0], // family company
]

export const DEFAULT_PATHS = 1000
export const DEFAULT_SEED = 42

// ---- Random numbers -------------------------------------------------------
// Small seeded generator (mulberry32) so results are reproducible.
export function makeRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Standard normal draw (Box–Muller).
function normal(rng) {
  let u = 0
  while (u === 0) u = rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Cholesky decomposition, used to turn independent draws into correlated ones.
export function cholesky(m) {
  const n = m.length
  const L = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = m[i][j]
      for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k]
      L[i][j] = i === j ? Math.sqrt(sum) : sum / L[j][j]
    }
  }
  return L
}
const CHOL = cholesky(CORR)

// ---- Step 1-3: generate the futures --------------------------------------
// returns[path][year][assetIndex] = that asset's return in that year.
// Cached by (paths, years, seed): reusing the SAME futures every time a
// slider moves ("common random numbers") means only the decision changes,
// so bars move smoothly instead of jittering.
const cache = new Map()
export function generateReturns(nPaths = DEFAULT_PATHS, years = 30, seed = DEFAULT_SEED) {
  const key = `${nPaths}|${years}|${seed}`
  if (cache.has(key)) return cache.get(key)
  const rng = makeRng(seed)
  const n = ASSET_KEYS.length
  const out = new Array(nPaths)
  for (let p = 0; p < nPaths; p++) {
    const path = new Array(years)
    for (let y = 0; y < years; y++) {
      const z = new Array(n)
      for (let i = 0; i < n; i++) z[i] = normal(rng)
      const r = new Array(n)
      for (let i = 0; i < n; i++) {
        let c = 0
        for (let k = 0; k <= i; k++) c += CHOL[i][k] * z[k]
        const a = ASSETS[ASSET_KEYS[i]]
        // Returns can't go below -100% (you can't lose more than you have).
        r[i] = Math.max(-0.95, a.mu + a.sigma * c)
      }
      path[y] = r
    }
    out[p] = path
  }
  cache.set(key, out)
  return out
}

// Portfolio return for one year given weights {stocks: 0.6, bonds: 0.4, ...}
export function portfolioReturn(yearReturns, weights) {
  let r = 0
  for (let i = 0; i < ASSET_KEYS.length; i++) {
    const w = weights[ASSET_KEYS[i]] || 0
    if (w) r += w * yearReturns[i]
  }
  return r
}

// Average return of a mix: μ = Σ wᵢ μᵢ
export function expectedReturn(weights) {
  return ASSET_KEYS.reduce((s, k) => s + (weights[k] || 0) * ASSETS[k].mu, 0)
}

// Volatility of a mix, using correlations: σ² = Σᵢ Σⱼ wᵢ wⱼ σᵢ σⱼ ρᵢⱼ
export function expectedVolatility(weights) {
  let v = 0
  for (let i = 0; i < ASSET_KEYS.length; i++) {
    for (let j = 0; j < ASSET_KEYS.length; j++) {
      const wi = weights[ASSET_KEYS[i]] || 0
      const wj = weights[ASSET_KEYS[j]] || 0
      v += wi * wj * ASSETS[ASSET_KEYS[i]].sigma * ASSETS[ASSET_KEYS[j]].sigma * CORR[i][j]
    }
  }
  return Math.sqrt(v)
}

// Future value with yearly contributions:
// FV = PV(1+r)^n + C × ((1+r)^n − 1) / r
export function futureValue(pv, r, n, c = 0) {
  if (r === 0) return pv + c * n
  const g = Math.pow(1 + r, n)
  return pv * g + c * ((g - 1) / r)
}

export function percentile(sorted, q) {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[idx]
}
const sortNum = (a) => [...a].sort((x, y) => x - y)

// ---- Step 4: goal probabilities (the Planner) -----------------------------
// goals: [{ id, name, kind: 'annual'|'lump'|'floor', amount, year, importance }]
//  - annual: spend `amount` every year (a year without enough money = goal missed)
//  - lump:   spend `amount` once in `year`
//  - floor:  have at least `amount` left at the end (long-term family wealth)
// Chance of success = futures where the goal was met ÷ all futures.
export function simulatePlan({
  startWealth,
  weights,
  years = 30,
  goals = [],
  contribution = 0,
  nPaths = DEFAULT_PATHS,
  seed = DEFAULT_SEED,
}) {
  const returns = generateReturns(nPaths, years, seed)
  const met = Object.fromEntries(goals.map((g) => [g.id, 0]))
  const yearly = Array.from({ length: years + 1 }, () => new Array(nPaths))
  const ending = new Array(nPaths)

  // Within a year, goals are paid in order of importance.
  const rank = { High: 0, Medium: 1, Low: 2 }
  const ordered = [...goals].sort((a, b) => (rank[a.importance] ?? 1) - (rank[b.importance] ?? 1))

  for (let p = 0; p < nPaths; p++) {
    let wealth = startWealth
    const ok = Object.fromEntries(goals.map((g) => [g.id, true]))
    yearly[0][p] = wealth
    for (let y = 0; y < years; y++) {
      // Wealth next year = wealth × (1 + r) + contributions − spending on goals
      wealth = wealth * (1 + portfolioReturn(returns[p][y], weights)) + contribution
      for (const g of ordered) {
        const due = g.kind === 'annual' || (g.kind === 'lump' && g.year === y + 1)
        if (!due) continue
        if (wealth >= g.amount) wealth -= g.amount
        else ok[g.id] = false
      }
      wealth = Math.max(0, wealth)
      yearly[y + 1][p] = wealth
    }
    for (const g of goals) {
      if (g.kind === 'floor' && wealth < g.amount) ok[g.id] = false
      if (ok[g.id]) met[g.id]++
    }
    ending[p] = wealth
  }

  const fan = yearly.map((vals, year) => {
    const s = sortNum(vals)
    return { year, p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9) }
  })

  return {
    probabilities: Object.fromEntries(goals.map((g) => [g.id, met[g.id] / nPaths])),
    fan,
    ending: summarize(ending),
  }
}

function summarize(values) {
  const s = sortNum(values)
  return { p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9) }
}

// ---- Step 5: decision scenarios (the Simulation page) ---------------------
// Each choice is a rule for how the money is invested year by year.
// All choices run through the SAME futures, so the comparison is fair.
//
// holdings: starting dollars per asset, e.g. { stocks: 1_000_000, bonds: 1_000_000 }
// choice.policy(year, holdings) -> { rebalanceTo?: weights } or null (let it drift)
export function runChoice({ holdings, policy, years, nPaths = DEFAULT_PATHS, seed = DEFAULT_SEED }) {
  const returns = generateReturns(nPaths, Math.max(years, 30), seed)
  const finals = new Array(nPaths)
  const paths = new Array(nPaths)
  for (let p = 0; p < nPaths; p++) {
    let h = { ...holdings }
    const track = [total(h)]
    for (let y = 0; y < years; y++) {
      const action = policy(y, h)
      if (action?.rebalanceTo) {
        const t = total(h)
        h = Object.fromEntries(Object.entries(action.rebalanceTo).map(([k, w]) => [k, w * t]))
      }
      for (const k of Object.keys(h)) {
        const i = ASSET_KEYS.indexOf(k)
        h[k] = h[k] * (1 + returns[p][y][i])
      }
      track.push(total(h))
    }
    finals[p] = total(h)
    paths[p] = track
  }
  return { finals, paths }
}

const total = (h) => Object.values(h).reduce((s, v) => s + v, 0)

// Run every choice of a scenario and compute the outcome card numbers.
export function evaluateScenario(scenario, { nPaths = DEFAULT_PATHS, seed = DEFAULT_SEED } = {}) {
  const results = {}
  for (const c of scenario.choices) {
    const { finals, paths } = runChoice({
      holdings: scenario.holdings,
      policy: c.policy,
      years: scenario.years,
      nPaths,
      seed,
    })
    const s = sortNum(finals)
    const recovered = paths.filter((track) => track.some((v, y) => y > 0 && y <= scenario.recoveryYears && v >= scenario.recoveryTarget)).length
    const onTrack = finals.filter((v) => v >= scenario.goalTarget).length
    results[c.id] = {
      p10: percentile(s, 0.1),
      p50: percentile(s, 0.5),
      p90: percentile(s, 0.9),
      recoveryChance: recovered / nPaths,
      goalChance: onTrack / nPaths,
      paths,
    }
  }
  return results
}

// ---- Step 6: decision-quality score ---------------------------------------
// We score the DECISION, not the luck. Because every choice was tested on
// the same 1,000 futures, a good choice stays good even if this particular
// year turns out badly.
//
//  Outcome quality (50): typical result and bad-case result vs. the other choices
//  Goal fit        (30): does it keep the family's long-term goal on track?
//  Reasoning       (20): did the heir consider the key factors? (5 pts each)
export const REASONING_FACTORS = [
  { id: 'risk', label: 'How much I could lose' },
  { id: 'horizon', label: 'How long the money is invested' },
  { id: 'diversification', label: 'Not putting everything in one place' },
  { id: 'goals', label: "My family's goals" },
]

export function scoreDecision(results, choiceId, factors = []) {
  const ids = Object.keys(results)
  // Risk-aware value: half typical outcome, half bad-case outcome.
  const value = (r) => 0.5 * r.p50 + 0.5 * r.p10
  const vals = ids.map((id) => value(results[id]))
  const vMin = Math.min(...vals)
  const vMax = Math.max(...vals)
  const mine = results[choiceId]
  const outcome = vMax === vMin ? 50 : 20 + 30 * ((value(mine) - vMin) / (vMax - vMin))

  const bestGoal = Math.max(...ids.map((id) => results[id].goalChance))
  const goalFit = bestGoal === 0 ? 30 : 30 * (mine.goalChance / bestGoal)

  const valid = new Set(REASONING_FACTORS.map((f) => f.id))
  const reasoning = 5 * new Set(factors.filter((f) => valid.has(f))).size

  const totalScore = Math.round(outcome + goalFit + reasoning)
  const bestId = ids.reduce((b, id) => (value(results[id]) > value(results[b]) ? id : b), ids[0])
  return {
    total: totalScore,
    outcome: Math.round(outcome),
    goalFit: Math.round(goalFit),
    reasoning,
    bestId,
    missedFactors: REASONING_FACTORS.filter((f) => !factors.includes(f.id)),
  }
}

// "What actually happened this time": one future, picked by seed, so the demo
// can show that a sound decision can still have a bad year.
export function pickLuckyPath(nPaths = DEFAULT_PATHS, seed = 7) {
  return Math.floor(makeRng(seed)() * nPaths)
}
