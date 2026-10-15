// Deterministic fact sheet and number guard
// ---------------------------------------------------------------
// Rule: every number the family sees comes from the simulation engine or
// from what the family actually did in the app. Gemini may only write the
// words around those numbers.
//
//  1. computeFamilyFacts(state)  -> every figure, computed by engine.js
//  2. factsToText(facts)         -> the only numbers Gemini is shown
//  3. findUnverifiedNumbers()    -> rejects AI text with numbers not on the fact sheet
//  4. buildBriefing / evaluateCharterRules -> deterministic versions used as the
//     default content and whenever the AI is offline or fails the guard

import { FAMILY, LADDER, SCENARIOS, planGoals, planWeights, PLAN_DEFAULTS } from '../data/demo.js'
import { simulatePlan, expectedReturn } from './engine.js'

export const money = (v) => {
  if (Math.abs(v) >= 1_000_000) return '$' + (v / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (Math.abs(v) >= 10_000) return '$' + Math.round(v / 1000) + 'k'
  return '$' + Math.round(v).toLocaleString('en-US')
}
const pct = (p) => Math.round(p * 100) + '%'
const outOf10 = (p) => Math.round(p * 10)

// ---- 1. Facts ---------------------------------------------------------------
export function computeFamilyFacts(state = {}) {
  const plan = { ...PLAN_DEFAULTS, ...(state.proposal?.plan || state.plan || {}) }
  const goals = planGoals(plan.travelPerYear, plan.extraGoal)
  const weights = planWeights(plan.stockShare)
  const sim = simulatePlan({ startWealth: FAMILY.heirShare, weights, goals })

  const sims = Object.entries(state.simulations || {})
    .filter(([, s]) => s?.score?.total != null)
    .map(([id, s]) => ({
      id,
      title: SCENARIOS.find((x) => x.id === id)?.title || id,
      score: s.score.total,
    }))
  const avgScore = sims.length ? Math.round(sims.reduce((a, s) => a + s.score, 0) / sims.length) : null

  const level = state.level || 2
  const ladder = LADDER.find((l) => l.level === level)
  const studio = goals.find((g) => g.id === 'business')
  const family = goals.find((g) => g.id === 'family')

  return {
    heirName: FAMILY.heir.name,
    parentName: FAMILY.parent.name,
    advisorName: FAMILY.advisor.name,
    heirShare: FAMILY.heirShare,
    practiceFund: FAMILY.smallFund,
    level,
    levelName: ladder?.name || '',
    totalLevels: LADDER.length,
    plan,
    stockPct: Math.round(weights.stocks * 100),
    bondPct: Math.round(weights.bonds * 100),
    realEstatePct: Math.round(weights.realEstate * 100),
    typicalReturnPct: +(expectedReturn(weights) * 100).toFixed(1),
    goals: goals.map((g) => ({ ...g, probability: sim.probabilities[g.id] })),
    studio: studio && { ...studio, probability: sim.probabilities[studio.id] },
    familyGoal: family && { ...family, probability: sim.probabilities[family.id] },
    ending: sim.ending,
    scenarioCount: sims.length,
    scenarios: sims,
    avgScore,
    proposal: state.proposal
      ? { amount: state.proposal.amount, use: state.proposal.use, why: state.proposal.why, status: state.proposal.status }
      : null,
    charter: (state.charter || []).map((p) => ({ id: p.id, title: p.title, category: p.category, clause: p.clause, status: p.status })),
    paths: 1000,
  }
}

// ---- 2. The fact sheet text: the ONLY numbers Gemini is allowed to use -----
export function factsToText(f) {
  const lines = [
    `Heir: ${f.heirName}, Trust Ladder level ${f.level} of ${f.totalLevels} (${f.levelName}).`,
    `Practice scenarios completed: ${f.scenarioCount}.` +
      (f.avgScore != null ? ` Average decision score: ${f.avgScore} out of 100.` : ' No decision score yet.'),
    ...f.scenarios.map((s) => `- Scenario "${s.title}": decision score ${s.score}.`),
    `Money set aside for ${f.heirName}'s plan: ${money(f.heirShare)}. Practice fund: ${money(f.practiceFund)}.`,
    `Current plan mix: ${f.stockPct}% stocks, ${f.bondPct}% bonds, ${f.realEstatePct}% real estate; typical yearly growth about ${f.typicalReturnPct}%.`,
    `Travel spending in the plan: ${money(f.plan.travelPerYear)} a year.`,
    `Goal odds from ${f.paths} simulated futures:`,
    ...f.goals.map((g) => `- ${g.name} (${money(g.amount)} ${g.detail}): ${outOf10(g.probability)} in 10 futures (${pct(g.probability)}).`),
    `Money left after 30 years: bad case ${money(f.ending.p10)}, typical ${money(f.ending.p50)}, good case ${money(f.ending.p90)}.`,
    f.proposal
      ? `${f.heirName}'s proposal: ${money(f.proposal.amount)} into ${f.proposal.use} (status: ${f.proposal.status}). Reasoning: "${f.proposal.why}".`
      : `${f.heirName} has not proposed a plan yet.`,
    ...f.charter.map((p) => `Charter principle "${p.title}" (${p.category}, ${p.status}): ${p.clause}`),
  ]
  return lines.join('\n')
}

// ---- 3. Number guard -----------------------------------------------------------
// Reads every number in a piece of text as a value ("$950k" -> 950000,
// "88%" -> 88, "1.2M" -> 1200000). Text passes only if each value also
// appears on the fact sheet. Small counting numbers (0-10) are always allowed
// ("3 questions", "level 2 of 5").
const NUM_RE = /\$?\d[\d,]*(?:\.\d+)?\s?(?:%|percent|[kKmMbB](?![a-zA-Z])|million|billion|thousand)?/g

export function extractNumbers(text = '') {
  const out = []
  for (const raw of String(text).match(NUM_RE) || []) {
    const t = raw.replace(/[$,\s]/g, '').toLowerCase()
    let v = parseFloat(t)
    if (Number.isNaN(v)) continue
    if (/(k|thousand)$/.test(t)) v *= 1e3
    else if (/(m|million)$/.test(t)) v *= 1e6
    else if (/(b|billion)$/.test(t)) v *= 1e9
    out.push(v)
  }
  return out
}

export function allowedNumbers(factText) {
  return new Set(extractNumbers(factText).map((v) => +v.toFixed(2)))
}

export function findUnverifiedNumbers(text, allowed) {
  const close = (v) => {
    if (v <= 10 && Number.isInteger(v)) return true
    for (const a of allowed) {
      // tolerate rounding of large amounts ("$1.2M" vs 1,210,000)
      if (a === v || (v >= 1000 && Math.abs(a - v) / Math.max(a, v) < 0.02)) return true
    }
    return false
  }
  return extractNumbers(text).filter((v) => !close(v))
}

// Walk an AI JSON object; any string field holding an unverified number is
// replaced by the deterministic version of that same field.
export function guardObject(aiValue, fallbackValue, allowed, report = { rejected: 0 }) {
  if (typeof aiValue === 'string') {
    if (findUnverifiedNumbers(aiValue, allowed).length) {
      report.rejected++
      return fallbackValue
    }
    return aiValue
  }
  if (Array.isArray(aiValue)) {
    if (!Array.isArray(fallbackValue)) return aiValue.filter((x) => typeof x !== 'string' || !findUnverifiedNumbers(x, allowed).length)
    const bad = aiValue.some((x) => JSON.stringify(x) && findUnverifiedNumbers(JSON.stringify(x), allowed).length)
    if (bad) report.rejected++
    return bad ? fallbackValue : aiValue
  }
  if (aiValue && typeof aiValue === 'object') {
    const out = {}
    for (const k of Object.keys(fallbackValue || {})) {
      out[k] = aiValue[k] == null ? fallbackValue[k] : guardObject(aiValue[k], fallbackValue[k], allowed, report)
    }
    return out
  }
  return fallbackValue
}

// ---- 4a. Deterministic briefing ----------------------------------------------
export function buildBriefing(f) {
  const studio = f.studio
  const fam = f.familyGoal
  const scoreLine = f.avgScore != null
    ? `Across ${f.scenarioCount} practice scenario${f.scenarioCount === 1 ? '' : 's'}, ${f.heirName}'s average decision score is ${f.avgScore} out of 100.`
    : `${f.heirName} hasn't completed a practice scenario yet, so there is no decision score to report.`
  const proposalLine = f.proposal
    ? `${f.heirName} has proposed putting ${money(f.proposal.amount)} into ${f.proposal.use}.`
    : `${f.heirName} hasn't proposed a plan for the ${money(f.practiceFund)} practice fund yet.`
  const mix = `${f.stockPct}% stocks, ${f.bondPct}% bonds and ${f.realEstatePct}% real estate`

  return {
    audioVoicenoteScript:
      `Hi ${f.heirName}, ${f.advisorName.split(' ')[0]} here. Quick update on your plan. With ${mix}, ` +
      (studio ? `your design studio goal is reached in ${outOf10(studio.probability)} in 10 of our ${f.paths} simulated futures, ` : '') +
      (fam ? `and the family wealth goal in ${outOf10(fam.probability)} in 10. ` : '') +
      `You're at level ${f.level} of ${f.totalLevels} on the Trust Ladder. Take a look at the breakdown, and let me know if you want to talk it through before our next family review.`,
    heirBriefing: {
      headline: studio && studio.probability >= 0.7
        ? 'Your studio goal is on track in most futures'
        : 'Your plan needs a closer look before the studio goal is safe',
      summary:
        `Your plan puts ${mix}, which grows about ${f.typicalReturnPct}% in a typical year. ` +
        `We tested it across ${f.paths} possible futures rather than one forecast, so these are odds, not promises.`,
      impactHighlight:
        'Your family charter asks for part of the growth money to support the climate transition. Your proposals are checked against that principle in the Family Charter tab.',
      milestoneImpact: studio
        ? `Your ${money(studio.amount)} studio goal ${studio.detail} is reached in ${outOf10(studio.probability)} in 10 futures (${pct(studio.probability)}).`
        : 'No studio goal is set in your plan.',
      jargonDecoded: [
        { term: 'Asset allocation', explanation: 'How your money is split between stocks, bonds and real estate.' },
        { term: 'Diversification', explanation: 'Spreading money across many investments so one bad result can’t sink the plan.' },
        { term: 'Volatility', explanation: 'How much an investment swings up and down from year to year.' },
      ],
      suggestedQuestions: [
        'What would raise the odds for my studio goal?',
        'What happens to my practice fund if the market drops?',
        'How does my plan fit the family charter?',
      ],
    },
    parentBriefing: {
      headline: fam && fam.probability >= 0.7
        ? 'Family wealth goal holds in most simulated futures'
        : 'Family wealth goal needs attention in this plan',
      fiduciarySummary:
        `${f.heirName}'s plan works with ${money(f.heirShare)} set aside, invested ${mix}. ` +
        `After 30 years the money left ranges from ${money(f.ending.p10)} in a bad case to ${money(f.ending.p90)} in a good case, with ${money(f.ending.p50)} typical.`,
      capitalPreservation: fam
        ? `The goal to keep ${money(fam.amount)} ${fam.detail} is met in ${outOf10(fam.probability)} in 10 simulated futures (${pct(fam.probability)}).`
        : 'No long-term preservation goal is set in this plan.',
      taxStrategy: 'Tax effects are not modeled in this demo. James will cover them at the family review.',
      readinessNote: `${scoreLine} ${proposalLine}`,
      talkingPoints: [
        f.proposal ? `Review ${f.heirName}'s ${money(f.proposal.amount)} proposal.` : `Encourage ${f.heirName} to propose a plan for the practice fund.`,
        `Discuss the trade-off between travel spending and the long-term family goal.`,
        `Agree on what moves ${f.heirName} to the next Trust Ladder level.`,
      ],
    },
  }
}

// ---- 4b. Deterministic charter scoring ---------------------------------------
const CLIMATE_WORDS = /climat|sustainab|renewab|clean|green|esg|solar|wind|carbon|decarbon|environment/i
const SPECULATIVE_WORDS = /leverag|speculat|crypto|token|margin|options/i

// First dollar amount written in a free-text idea ("Allocate $60,000 to ...")
export function amountFromText(text = '') {
  const m = String(text).match(/\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|thousand|million)?/i)
  return m ? extractNumbers(m[0])[0] : null
}

// Each rule reads only the plan, the engine's goal odds and the proposal.
const RULES = {
  Preservation: (f, ctx) => {
    const p = f.familyGoal?.probability ?? 0
    if (SPECULATIVE_WORDS.test(ctx.text)) {
      return { score: 20, reason: 'Mentions leverage or speculation, which the charter rules out for family assets.' }
    }
    return {
      score: Math.round(p * 100),
      reason: `Family wealth goal is met in ${outOf10(p)} in 10 simulated futures.`,
    }
  },
  Enterprise: (f) => {
    const p = f.studio?.probability ?? 0
    return {
      score: Math.round(p * 100),
      reason: `Design studio goal is funded in ${outOf10(p)} in 10 simulated futures.`,
    }
  },
  Autonomy: (f, ctx) => {
    const amt = ctx.amount
    if (amt <= f.practiceFund) return { score: 100, reason: `${money(amt)} stays within the ${money(f.practiceFund)} practice fund.` }
    if (amt <= 50_000) return { score: 70, reason: `${money(amt)} is above the practice fund but within the charter's upper limit.` }
    return { score: 30, reason: `${money(amt)} is beyond the practice-fund range in the charter.` }
  },
  Governance: (f, ctx) => {
    if (ctx.amount <= 100_000) return { score: 100, reason: `${money(ctx.amount)} is below the level that needs a joint family review.` }
    const approved = f.proposal?.status === 'approved'
    return approved
      ? { score: 100, reason: 'Above the review threshold, and approved by the family.' }
      : { score: 50, reason: 'Above the review threshold; needs joint family review and advisor sign-off.' }
  },
  Sustainability: (f, ctx) =>
    CLIMATE_WORDS.test(ctx.text)
      ? { score: 90, reason: 'The proposal explicitly supports climate or sustainability goals.' }
      : { score: 50, reason: 'The proposal does not mention climate or sustainability, so it neither helps nor breaks this principle.' },
}

export function evaluateCharterRules(f, { amount, text }) {
  const ctx = { amount: amount ?? f.practiceFund, text: text || '' }
  const principleScores = f.charter.map((p) => {
    const rule = RULES[p.category]
    if (!rule) {
      return { id: p.id, title: p.title, score: null, status: 'discuss', comment: 'No automatic check for this principle yet; discuss it as a family.' }
    }
    const { score, reason } = rule(f, ctx)
    const status = score >= 70 ? 'aligned' : score >= 40 ? 'tension' : 'conflict'
    return { id: p.id, title: p.title, score, status, comment: reason }
  })
  const scored = principleScores.filter((p) => p.score != null)
  const average = scored.length ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length) : 0
  // Breaking any principle is a hard flag: strengths elsewhere can't average it away
  const breaks = principleScores.some((p) => p.status === 'conflict')
  const overallScore = breaks ? Math.min(average, 50) : average
  const verdict = breaks ? 'Conflicts with a family principle'
    : overallScore >= 80 ? 'Strongly aligned with the family charter'
      : overallScore >= 60 ? 'Mostly aligned, with points to discuss'
        : 'Needs family discussion before approval'
  const aligned = principleScores.filter((p) => p.status === 'aligned')
  const tension = principleScores.filter((p) => p.status !== 'aligned')
  return {
    overallScore,
    verdict,
    summary: `${aligned.length} of ${principleScores.length} charter principles are met by this plan` +
      (tension.length ? `; ${tension.length} need${tension.length === 1 ? 's' : ''} a family conversation.` : '.'),
    alignedPoints: aligned.map((p) => `${p.title}: ${p.comment}`),
    tensionPoints: tension.map((p) => `${p.title}: ${p.comment}`),
    principleScores,
    advisorGuidance: tension.length
      ? `Before approving, let's talk through ${tension.map((p) => p.title).join(' and ')} together.`
      : 'This plan fits every principle the family agreed on. I would support it, with the usual quarterly check-in.',
  }
}
