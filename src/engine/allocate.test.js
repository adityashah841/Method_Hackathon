import { describe, it, expect } from 'vitest'
import { rebalance, suggestAllocation, withinGuardrails, guardrailIssues, describeMix, CAPS, MIN_PICKED } from './allocate.js'
import { generateReturns, ASSET_KEYS } from './engine.js'
import { FAMILY, planGoals } from '../data/demo.js'

const sum = (a) => Object.values(a).reduce((x, y) => x + y, 0)
const goals = planGoals(20_000)

describe('linked sliders', () => {
  it('always add up to 100% in 5% steps', () => {
    const start = { stocks: 50, bonds: 30, realEstate: 10, art: 5, crypto: 5 }
    for (const key of Object.keys(start)) {
      for (let v = 0; v <= 100; v += 5) {
        const out = rebalance(start, key, v)
        expect(sum(out)).toBe(100)
        expect(out[key]).toBe(v)
        Object.values(out).forEach((x) => expect(x % 5).toBe(0))
      }
    }
  })

  it('keep the other investments in proportion', () => {
    const out = rebalance({ stocks: 50, bonds: 40, realEstate: 10 }, 'stocks', 70)
    expect(out).toEqual({ stocks: 70, bonds: 25, realEstate: 5 })
  })

  it('spread evenly when the others were all at zero', () => {
    expect(rebalance({ stocks: 100, bonds: 0, cash: 0 }, 'stocks', 60)).toEqual({ stocks: 60, bonds: 20, cash: 20 })
  })
})

describe('suggested mix', () => {
  const picks = ['stocks', 'bonds', 'realEstate', 'art', 'crypto']

  it('is repeatable for the same choices', () => {
    const a = suggestAllocation({ picks, goals, startWealth: FAMILY.heirShare })
    const b = suggestAllocation({ picks, goals, startWealth: FAMILY.heirShare })
    expect(a).toEqual(b)
  })

  it('adds up to 100%, stays inside the guardrails, and includes every pick', () => {
    const a = suggestAllocation({ picks, goals, startWealth: FAMILY.heirShare })
    expect(sum(a)).toBe(100)
    expect(withinGuardrails(a)).toBe(true)
    expect(guardrailIssues(a)).toEqual([])
    picks.forEach((k) => expect(a[k]).toBeGreaterThanOrEqual(MIN_PICKED))
    expect(a.crypto).toBeLessThanOrEqual(CAPS.crypto)
  })

  it('works with every investment picked', () => {
    const all = ['stocks', 'bonds', 'realEstate', 'cash', 'privateEquity', 'art', 'cars', 'gold', 'crypto']
    const a = suggestAllocation({ picks: all, goals, startWealth: FAMILY.heirShare })
    expect(sum(a)).toBe(100)
    expect(withinGuardrails(a)).toBe(true)
  })

  it('flags a mix that breaks the guardrails', () => {
    expect(guardrailIssues({ stocks: 60, crypto: 40 }).join(' ')).toMatch(/Crypto is above/)
    expect(guardrailIssues({ stocks: 90, bonds: 10 }).join(' ')).toMatch(/safety floor/)
  })

  it('describes a mix in plain words, largest first', () => {
    expect(describeMix({ bonds: 30, stocks: 60, crypto: 10 })).toBe('60% stocks, 30% bonds, 10% crypto')
  })
})

describe('new asset classes', () => {
  it('produce finite returns for every asset', () => {
    const r = generateReturns(200, 30, 7)
    for (const path of r) for (const y of path) {
      expect(y).toHaveLength(ASSET_KEYS.length)
      y.forEach((v) => expect(Number.isFinite(v)).toBe(true))
    }
  })
})
