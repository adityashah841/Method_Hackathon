import { describe, it, expect } from 'vitest'
import {
  futureValue, expectedReturn, expectedVolatility, generateReturns,
  simulatePlan, evaluateScenario, scoreDecision, cholesky,
} from './engine.js'
import { FAMILY, planWeights, planGoals, SCENARIOS } from '../data/demo.js'

describe('formulas', () => {
  it('future value matches the closed form', () => {
    expect(futureValue(1000, 0.1, 2)).toBeCloseTo(1210)
    // 100/yr for 2 years at 10%: 100*1.1 + 100 = 210
    expect(futureValue(0, 0.1, 2, 100)).toBeCloseTo(210)
  })

  it('60/40 mix: weighted average return, lower volatility than the weighted average', () => {
    const w = { stocks: 0.6, bonds: 0.4 }
    expect(expectedReturn(w)).toBeCloseTo(0.064)
    const vol = expectedVolatility(w)
    expect(vol).toBeLessThan(0.6 * 0.16 + 0.4 * 0.06)
    expect(vol).toBeGreaterThan(0.09)
  })

  it('cholesky reproduces the matrix', () => {
    const m = [[1, 0.5], [0.5, 1]]
    const L = cholesky(m)
    expect(L[1][0] * L[1][0] + L[1][1] * L[1][1]).toBeCloseTo(1)
    expect(L[1][0] * L[0][0]).toBeCloseTo(0.5)
  })
})

describe('simulated futures', () => {
  it('are reproducible for the same seed', () => {
    const a = generateReturns(50, 5, 123)
    const b = generateReturns(50, 5, 123)
    expect(a).toBe(b) // cached: the exact same futures are reused
    expect(generateReturns(50, 5, 124)[0][0][0]).not.toBe(a[0][0][0])
  })

  it('stock returns average close to 8%', () => {
    const r = generateReturns(2000, 30, 9)
    let sum = 0, n = 0
    for (const path of r) for (const y of path) { sum += y[0]; n++ }
    expect(sum / n).toBeGreaterThan(0.07)
    expect(sum / n).toBeLessThan(0.09)
  })
})

describe('planner', () => {
  const run = (travel, stocks = 0.5) =>
    simulatePlan({ startWealth: FAMILY.heirShare, weights: planWeights(stocks), goals: planGoals(travel) })

  it('returns a probability for every goal', () => {
    const { probabilities } = run(20_000)
    for (const p of Object.values(probabilities)) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('more travel spending lowers the long-term goal', () => {
    expect(run(40_000).probabilities.family).toBeLessThan(run(10_000).probabilities.family)
  })

  it('fan chart widens over time', () => {
    const { fan } = run(20_000)
    const spread = (f) => f.p90 - f.p10
    expect(spread(fan[30])).toBeGreaterThan(spread(fan[5]))
  })
})

describe('scenarios and scoring', () => {
  for (const s of SCENARIOS) {
    it(`${s.id}: every choice gets a score from 0 to 100`, () => {
      const results = evaluateScenario(s)
      for (const c of s.choices) {
        const score = scoreDecision(results, c.id, ['risk'])
        expect(score.total).toBeGreaterThanOrEqual(0)
        expect(score.total).toBeLessThanOrEqual(100)
      }
    })
  }

  it('reasoning adds 5 points per factor considered', () => {
    const results = evaluateScenario(SCENARIOS[0])
    const none = scoreDecision(results, 'hold', [])
    const all = scoreDecision(results, 'hold', ['risk', 'horizon', 'diversification', 'goals'])
    expect(all.total - none.total).toBe(20)
  })

  it('market drop: rebalancing scores above selling', () => {
    const results = evaluateScenario(SCENARIOS[0])
    expect(scoreDecision(results, 'rebalance').total).toBeGreaterThan(scoreDecision(results, 'sell').total)
  })
})
