import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  computeFamilyFacts, factsToText, allowedNumbers, findUnverifiedNumbers,
  extractNumbers, buildBriefing, evaluateCharterRules,
} from './facts.js'
import { generateDualLensBriefing, askAdvisorJames, evaluateCharterAlignment } from './gemini.js'
import { DEFAULT_CHARTER, PLAN_DEFAULTS } from '../data/demo.js'

const baseState = { level: 2, plan: PLAN_DEFAULTS, charter: DEFAULT_CHARTER }

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
      audioVoicenoteScript: 'Hi Maya, James here. Great progress on your plan.',
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

  it('Ask James: an answer with an invented number is replaced', async () => {
    mockGemini('Your fund has a 24-month runway and returned 7.8% this year.')
    const answer = await askAdvisorJames({ question: 'What if the market drops?', state: baseState })
    expect(answer).not.toMatch(/7\.8|24-month/)
  })

  it('Ask James: an answer using only fact-sheet numbers is kept', async () => {
    mockGemini('Diversifying keeps one bad year from derailing your plan.')
    const answer = await askAdvisorJames({ question: 'Why diversify?', state: baseState })
    expect(answer).toBe('Diversifying keeps one bad year from derailing your plan.')
  })

  it('works offline: no API response falls back to engine content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const out = await generateDualLensBriefing({ state: baseState })
    expect(out.source).toBe('engine')
  })
})

describe('charter scoring', () => {
  const proposal = { amount: 25000, use: 'a sustainable-energy index fund', why: 'fits my values', plan: PLAN_DEFAULTS }

  it('is rule-based and repeatable', () => {
    const f = computeFamilyFacts({ ...baseState, proposal })
    const a = evaluateCharterRules(f, { amount: 25000, text: proposal.use })
    const b = evaluateCharterRules(f, { amount: 25000, text: proposal.use })
    expect(a).toEqual(b)
    expect(a.principleScores).toHaveLength(DEFAULT_CHARTER.length)
  })

  it('Gemini cannot change the score, even if it returns one', async () => {
    mockGemini(JSON.stringify({ overallScore: 99, summary: 'Looks great.', advisorGuidance: 'Approve it.' }))
    const f = computeFamilyFacts({ ...baseState, proposal })
    const rules = evaluateCharterRules(f, { amount: 25000, text: `${proposal.use} ${proposal.why}` })
    const out = await evaluateCharterAlignment({ proposal, charter: DEFAULT_CHARTER, state: baseState })
    expect(out.overallScore).toBe(rules.overallScore)
    expect(out.summary).toBe('Looks great.')
  })

  it('a climate-focused proposal scores higher on sustainability than one that is not', () => {
    const f = computeFamilyFacts(baseState)
    const sus = (text) => evaluateCharterRules(f, { amount: 25000, text }).principleScores.find((p) => p.id === 'charter-2').score
    expect(sus('solar and wind fund')).toBeGreaterThan(sus('tech stocks'))
  })

  it('a free-text idea is scored on its own amount, and leverage breaks preservation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const out = await evaluateCharterAlignment({
      charter: DEFAULT_CHARTER, state: baseState,
      customThesis: 'Allocate $60,000 to high-leverage crypto and speculative token options',
    })
    const byId = Object.fromEntries(out.principleScores.map((p) => [p.id, p]))
    expect(byId['charter-1'].score).toBe(20)
    expect(byId['charter-3'].comment).toContain('$60k')
    expect(out.overallScore).toBeLessThan(60)
  })

  it('amounts beyond the practice fund lower the autonomy score', () => {
    const f = computeFamilyFacts(baseState)
    const auto = (amount) => evaluateCharterRules(f, { amount, text: '' }).principleScores.find((p) => p.id === 'charter-3').score
    expect(auto(25000)).toBeGreaterThan(auto(200000))
  })
})
