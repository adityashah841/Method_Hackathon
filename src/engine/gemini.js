// Gemini API Client & Persona Translation Engine for Heirloom
import { money, computeFamilyFacts, factsToText, allowedNumbers, findUnverifiedNumbers, guardObject, buildBriefing, evaluateCharterRules, amountFromText } from './facts.js'

const ENV_KEY = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : null
const API_KEY = ENV_KEY || 'AIzaSyCKdxmSruUZbhYLXUU0OSds4infPNHRLck'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

/**
 * Base call to Gemini 2.5 Flash
 */
export async function callGemini(prompt, systemInstruction = '', responseMimeType = null) {
  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        ...(responseMimeType ? { responseMimeType } : {}),
      },
    }

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      }
    }

    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn('Gemini API call returned non-200:', res.status, errText)
      throw new Error(`Gemini error: ${res.status}`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No response text from Gemini')
    return text
  } catch (err) {
    console.warn('Falling back from Gemini error:', err)
    return null
  }
}


// Gemini writes words; it never decides numbers. Every call:
//  1. computes the facts deterministically (facts.js -> engine.js),
//  2. shows Gemini only that fact sheet and forbids any other number,
//  3. checks the reply: any text with a number not on the fact sheet is
//     replaced by the deterministic version of the same text.

const NUMBERS_RULE = `STRICT NUMBERS RULE: The FACTS block is the only source of numbers. Use a number only if it appears in FACTS, written the same way. Never invent or estimate returns, portfolio totals, percentages, probabilities, scores, tax amounts, dates, durations or impact figures. If a sentence would need a number that is not in FACTS, write it without a number.`

const parseJson = (text) => JSON.parse(text.replace(/```json/gi, '').replace(/```/g, '').trim())

/**
 * Generate Dual-Lens Briefing: numbers from the engine, wording from Gemini
 */
export async function generateDualLensBriefing({
  advisorNote = '',
  focusArea = 'Balanced Growth & Sustainability',
  advisorTone = 'Encouraging & Mentoring',
  state = {},
}) {
  const facts = computeFamilyFacts(state)
  const factText = factsToText(facts)
  const deterministic = buildBriefing(facts)
  const allowed = allowedNumbers(factText)

  const systemInstruction = `You are James Ortiz, a senior wealth advisor at Northfield Wealth, writing for the Carter family: Elena (parent) and Maya (age 24, heir).
You translate the family's plan into plain, encouraging language for Maya and careful, preservation-focused language for Elena.
${NUMBERS_RULE}
Always output raw JSON matching the requested structure, without markdown fences.`

  const prompt = `Write a dual-lens briefing for the Carter family.

FACTS (computed by Heirloom's simulation engine; the only numbers you may use):
${factText}

Focus area: ${focusArea}
Advisor tone: ${advisorTone}
Advisor's note to emphasize: "${advisorNote || 'Highlight prudent risk management and the link between the plan and the family charter.'}"

Respond ONLY with a JSON object with this structure:
{
  "audioVoicenoteScript": "A warm 45-60 second spoken note from James to Maya, starting 'Hi Maya, James here.'",
  "heirBriefing": {
    "headline": "Clear headline for Maya",
    "summary": "2-3 plain sentences about her plan",
    "impactHighlight": "How the plan connects to the family's sustainability principle",
    "milestoneImpact": "What the plan means for her design studio goal",
    "jargonDecoded": [ { "term": "Term", "explanation": "Simple explanation" } ],
    "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
  },
  "parentBriefing": {
    "headline": "Reassuring headline for Elena",
    "fiduciarySummary": "Summary of the plan and its range of outcomes",
    "capitalPreservation": "What the plan means for keeping the family wealth",
    "taxStrategy": "Say tax effects are not modeled and will be discussed at the review",
    "readinessNote": "Objective note on Maya's progress, using only FACTS",
    "talkingPoints": ["Topic 1", "Topic 2", "Topic 3"]
  }
}`

  const responseText = await callGemini(prompt, systemInstruction, 'application/json')
  if (!responseText) return { ...deterministic, source: 'engine' }

  try {
    const report = { rejected: 0 }
    const guarded = guardObject(parseJson(responseText), deterministic, allowed, report)
    if (report.rejected) console.info(`Number guard replaced ${report.rejected} AI field(s) containing unverified numbers.`)
    return { ...guarded, source: 'gemini', guardReplacements: report.rejected }
  } catch (parseErr) {
    console.warn('Could not read Gemini briefing, using the engine-written version:', parseErr)
    return { ...deterministic, source: 'engine' }
  }
}

/**
 * Ask James: Gemini answers in words; numbers only from the fact sheet
 */
function deterministicAnswer(question, role, facts) {
  const q = question.toLowerCase()
  const studio = facts.studio
  const fam = facts.familyGoal
  if (/studio|business|odds|chance|goal/.test(q) && studio) {
    return `In our ${facts.paths} simulated futures, your studio goal is reached in ${Math.round(studio.probability * 10)} in 10. Spending less on travel or adjusting the stock share in My plan are the levers that move it most.`
  }
  if (/drop|dip|crash|fall|lose|loss|risk/.test(q)) {
    return `In a bad case the money left after 30 years is about ${money(facts.ending.p10)}, versus ${money(facts.ending.p50)} typical. The Practice tab's market-drop scenario shows how each response plays out.`
  }
  if (/charter|values|green|climate|sustainab/.test(q)) {
    return 'Every proposal is checked against the family charter. Open the Family Charter tab to see which principles your plan meets and which need a conversation.'
  }
  return role === 'heir'
    ? `Good question. Your plan currently reaches the family wealth goal in ${fam ? Math.round(fam.probability * 10) : 0} in 10 futures. Let's go through the details at our next check-in.`
    : `Maya's plan keeps the family wealth goal in ${fam ? Math.round(fam.probability * 10) : 0} in 10 simulated futures. I'll bring the full breakdown to our next family review.`
}

export async function askAdvisorJames({ question, role = 'heir', state = {} }) {
  const isHeir = role === 'heir'
  const facts = computeFamilyFacts(state)
  const factText = factsToText(facts)
  const allowed = allowedNumbers(factText)

  const systemInstruction = `You are James Ortiz, the Carter family's wealth advisor at Northfield Wealth, answering ${isHeir ? 'Maya Carter (age 24, heir)' : 'Elena Carter (parent)'}.
For Maya: warm, educational, 2-3 sentences, no jargon. For Elena: polished, careful, 2-3 sentences.
${NUMBERS_RULE}`

  const prompt = `FACTS (computed by Heirloom's simulation engine; the only numbers you may use):
${factText}

Question from ${isHeir ? 'Maya' : 'Elena'}: "${question}"

Answer in 2-3 sentences as James Ortiz.`

  const answer = await callGemini(prompt, systemInstruction)
  if (!answer) return deterministicAnswer(question, role, facts)
  const bad = findUnverifiedNumbers(answer, allowed)
  if (bad.length) {
    console.info('Number guard rejected an AI answer with unverified numbers:', bad)
    return deterministicAnswer(question, role, facts)
  }
  return answer.trim()
}

/**
 * Charter alignment: scores from fixed rules; Gemini may only reword the summary
 */
export async function evaluateCharterAlignment({
  proposal = null,
  charter = [],
  customThesis = '',
  state = {},
}) {
  const facts = computeFamilyFacts({ ...state, charter, proposal: proposal?.plan ? proposal : state.proposal })
  const text = [proposal?.use, proposal?.why, customThesis].filter(Boolean).join(' ')
  // A free-text idea is scored on the amount written in it, if any
  const amount = (customThesis && amountFromText(customThesis)) ?? proposal?.amount
  const result = evaluateCharterRules(facts, { amount, text })

  const ruleText = result.principleScores
    .map((p) => `- ${p.title}: ${p.score == null ? 'not scored' : p.score + ' out of 100'} (${p.status}). ${p.comment}`)
    .join('\n')
  const factText = `${factsToText(facts)}\nCharter check (fixed rules):\nOverall: ${result.overallScore} out of 100.\n${ruleText}`
  const allowed = allowedNumbers(factText)

  const systemInstruction = `You are James Ortiz, the Carter family's advisor. You explain a charter check that has already been scored by fixed rules. Do not change or add scores.
${NUMBERS_RULE}
Respond ONLY in raw JSON.`
  const prompt = `FACTS:
${factText}

Proposal text: "${text || 'none'}"

Return JSON: { "summary": "2 sentences explaining the result for the family", "advisorGuidance": "2 sentences on how the family can reach agreement" }`

  const responseText = await callGemini(prompt, systemInstruction, 'application/json')
  if (!responseText) return { ...result, source: 'engine' }
  try {
    const parsed = parseJson(responseText)
    const words = guardObject(
      { summary: parsed.summary, advisorGuidance: parsed.advisorGuidance },
      { summary: result.summary, advisorGuidance: result.advisorGuidance },
      allowed,
    )
    return { ...result, ...words, source: 'gemini' }
  } catch (err) {
    console.warn('Could not read Gemini charter text, using rule-based wording:', err)
    return { ...result, source: 'engine' }
  }
}
