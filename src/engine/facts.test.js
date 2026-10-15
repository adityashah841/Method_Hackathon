import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  computeFamilyFacts, factsToText, allowedNumbers, findUnverifiedNumbers,
  extractNumbers, buildBriefing,
} from './facts.js'
import { generateDualLensBriefing } from './gemini.js'
import { PLAN_DEFAULTS } from '../data/demo.js'

const baseState = { level: 2, plan: PLAN_DEFAULTS }

// Pretend Gemini replied with `text`
function mockGemini(text) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  })))
}
afterEach(() => vi.unstubAllGlobals())

const stringsOf = (obj) => JSON.stringify(obj).match(/"(?:[^"\\]|\\.)*"/g).join(' ')

describe('number reading', () => {
  it('reads money, percentages and suffixes as values', () => {
    expect(extractNumbers('$950k, 88%, $1.2M and $12,400')).toEqual([950000, 88, 1200000, 12400])
  })
})

describe('deterministic facts', () => {
  it('are identical every time for the same state', () => {
    expect(computeFamilyFacts(baseState)).toEqual(computeFamilyFacts(baseState))
  })

  it('the engine-written briefing uses only numbers on the fact sheet', () => {
    const facts = computeFamilyFacts(baseState)
    const allowed = allowedNumbers(factsToText(facts))
    expect(findUnverifiedNumbers(stringsOf(buildBriefing(facts)), allowed)).toEqual([])
  })

  it('the briefing reports the same studio odds as the Planner', () => {
    const facts = computeFamilyFacts(baseState)
    const tenths = Math.round(facts.studio.probability * 10)
    expect(buildBriefing(facts).heirBriefing.milestoneImpact).toContain(`${tenths} in 10`)
  })
})

describe('number guard on Gemini output', () => {
  it('replaces any briefing field with an invented number, keeps clean wording', async () => {
    mockGemini(JSON.stringify({
      heirBriefing: {
        headline: 'A strong quarter for your plan',
        summary: 'The family portfolio gained 7.8% this quarter and is now $12.4M.',
        milestoneImpact: 'Your studio has an 88% chance of success.',
      },
      parentBriefing: { headline: 'Steady progress', fiduciarySummary: 'Tax harvesting saved $38,000.' },
    }))
    const facts = computeFamilyFacts(baseState)
    const fallback = buildBriefing(facts)
    const out = await generateDualLensBriefing({ state: baseState })

    expect(out.heirBriefing.headline).toBe('A strong quarter for your plan') // AI words kept
    expect(out.heirBriefing.summary).toBe(fallback.heirBriefing.summary) // 7.8% / $12.4M rejected
    expect(out.heirBriefing.milestoneImpact).toBe(fallback.heirBriefing.milestoneImpact) // 88% rejected
    expect(out.parentBriefing.fiduciarySummary).toBe(fallback.parentBriefing.fiduciarySummary)
    expect(out.guardReplacements).toBe(3)
    const allowed = allowedNumbers(factsToText(facts))
    expect(findUnverifiedNumbers(stringsOf(out), allowed)).toEqual([])
  })

  it('works offline: no API response falls back to engine content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const out = await generateDualLensBriefing({ state: baseState })
    expect(out.source).toBe('engine')
  })
})
