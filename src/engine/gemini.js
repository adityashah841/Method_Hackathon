// Gemini API Client & Persona Translation Engine for Heirloom
import { computeFamilyFacts, factsToText, allowedNumbers, guardObject, buildBriefing } from './facts.js'

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
Advisor's note to emphasize: "${advisorNote || 'Highlight prudent risk management and how Maya is building a track record.'}"

Respond ONLY with a JSON object with this structure:
{
  "heirBriefing": {
    "headline": "Clear headline for Maya",
    "summary": "2-3 plain sentences about her plan",
    "impactHighlight": "How Maya's own values can shape her proposal",
    "milestoneImpact": "What the plan means for her design studio goal"
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
