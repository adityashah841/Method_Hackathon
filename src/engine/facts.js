// Deterministic fact sheet and number guard
// ---------------------------------------------------------------
// Rule: every number the family sees comes from the simulation engine or
// from what the family actually did in the app. Gemini may only write the
// words around those numbers.
//
//  1. computeFamilyFacts(state)  -> every figure, computed by engine.js
//  2. factsToText(facts)         -> the only numbers Gemini is shown
//  3. findUnverifiedNumbers()    -> rejects AI text with numbers not on the fact sheet
//  4. buildBriefing -> deterministic briefing, used as the default content and
//     whenever the AI is offline or fails the guard

import { FAMILY, LADDER, SCENARIOS, planGoals, planWeights, PLAN_DEFAULTS } from '../data/demo.js'
import { simulatePlan, expectedReturn } from './engine.js'
import { describeMix } from './allocate.js'

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
  const weights = planWeights(plan)
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
    mixText: describeMix(plan.alloc),
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
    paths: '1,000',
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
    `Current plan mix: ${f.mixText}; typical yearly growth about ${f.typicalReturnPct}%.`,
    `Travel spending in the plan: ${money(f.plan.travelPerYear)} a year.`,
    `Goal odds from ${f.paths} simulated futures:`,
    ...f.goals.map((g) => `- ${g.name} (${money(g.amount)} ${g.detail}): ${outOf10(g.probability)} in 10 futures (${pct(g.probability)}).`),
    `Money left after 30 years: bad case ${money(f.ending.p10)}, typical ${money(f.ending.p50)}, good case ${money(f.ending.p90)}.`,
    f.proposal
      ? `${f.heirName}'s proposal: ${money(f.proposal.amount)} into ${f.proposal.use} (status: ${f.proposal.status}). Reasoning: "${f.proposal.why}".`
      : `${f.heirName} has not proposed a plan yet.`,
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
  const mix = f.mixText

  return {
    heirBriefing: {
      headline: studio && studio.probability >= 0.7
        ? 'Your studio goal is on track in most futures'
        : 'Your plan needs a closer look before the studio goal is safe',
      summary:
        `Your plan puts ${mix}, which grows about ${f.typicalReturnPct}% in a typical year. ` +
        `We tested it across ${f.paths} possible futures rather than one forecast, so these are odds, not promises.`,
      impactHighlight:
        'Your proposal can reflect what you care about, like clean energy. James reviews it and your mom decides, so your values become part of the family plan.',
      milestoneImpact: studio
        ? `Your ${money(studio.amount)} studio goal ${studio.detail} is reached in ${outOf10(studio.probability)} in 10 futures (${pct(studio.probability)}).`
        : 'No studio goal is set in your plan.',
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
