// Gemini API Client & Persona Translation Engine for Heirloom

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

/**
 * High-fidelity fallback briefings in case of offline / rate limits
 */
const DEFAULT_BRIEFING = {
  audioVoicenoteScript: "Hi Maya, James here. Quick 60-second update on the Carter portfolio. This quarter we saw healthy 7.8% gains, primarily driven by our strategic tilt into clean tech infrastructure and resilient dividend equities. For your $25,000 practice fund and your Year 5 design studio goal, this means we have comfortable downside protection and solid headroom. I love how you balanced equity upside with reserve cash in your recent proposals. Take a look at the breakdown below, and let me know if you want to jump on a quick call before our next family review.",
  heirBriefing: {
    headline: "Clean Tech Momentum & Steady Growth for Your Studio Goal",
    summary: "The family portfolio gained +7.8% this quarter. More importantly, the 15% green transition allocation you advocated for outpaced traditional energy by 4.2%. We kept your $25,000 practice fund buffered against short-term market noise so you can test ideas with confidence.",
    impactHighlight: "Your portfolio offset an estimated 142 metric tons of carbon this quarter through direct infrastructure green bonds.",
    milestoneImpact: "On track: Your $950,000 Year 5 design studio milestone remains well-funded with an 88% probability of success under current market scenarios.",
    jargonDecoded: [
      { term: "Duration Hedging", explanation: "Locking in bond safety so sudden interest rate hikes don't hurt our cash reserves." },
      { term: "Sharpe Ratio (1.42)", explanation: "A measure of return per unit of risk—basically proving we got good returns without gambling." },
      { term: "Tranche Allocation", explanation: "Releasing portions of wealth gradually as you master new financial skills." }
    ],
    suggestedQuestions: [
      "How will the upcoming Fed rate cuts affect my practice fund?",
      "Can we reinvest some gains specifically into early-stage climate tech?",
      "How does Elena feel about increasing my practice fund limit?"
    ]
  },
  parentBriefing: {
    headline: "Quarterly Review: Capital Preservation & Next-Gen Governance",
    fiduciarySummary: "Total Carter Family portfolio stands at $12.4M (+7.8% YTD). Fixed-income duration was actively hedged to protect principal, and tax-loss harvesting in private credit generated $38,000 in offset value for year-end filing.",
    capitalPreservation: "Downside stress testing confirms that even in a 2008-style liquidity shock, family living distributions and multi-generational trust reserves remain 100% unimpaired.",
    taxStrategy: "Executed municipal bond transitions to maximize state and federal tax exemptions while maintaining liquidity tranches.",
    readinessNote: "Maya is demonstrating high prudence. In her recent simulations, she allocated sufficient liquidity buffers rather than over-concentrating in speculative growth. Her decision score averaged 84/100.",
    talkingPoints: [
      "Review Maya's Level 2 progress fund proposal ($25,000 sandbox).",
      "Confirm year-end philanthropic tax contribution through family foundation.",
      "Align on upcoming 2028 estate tax exemption changes."
    ]
  }
}

/**
 * Generate Dual-Lens Briefing using Gemini Flash
 */
export async function generateDualLensBriefing({
  advisorNote = '',
  focusArea = 'Balanced Growth & Sustainability',
  advisorTone = 'Encouraging & Mentoring',
  state = {},
}) {
  const proposalAmount = state.proposal?.amount || 25000
  const proposalUse = state.proposal?.use || 'practice fund'
  const proposalWhy = state.proposal?.why || 'balanced growth'
  const heirLevel = state.level || 2
  const simCount = Object.keys(state.simulations || {}).length

  const systemInstruction = `You are James Ortiz, a senior fiduciary wealth advisor at Northfield Wealth. You manage wealth for the prominent Carter family (Elena the mother/matriarch, and Maya age 24, the heir). 
Your specialty is bridging the generational gap: translating institutional fiduciary strategy into empowering, jargon-free education for Maya, while providing rigorous capital preservation analysis for Elena.
Always output purely valid raw JSON matching the requested structure without markdown fences.`

  const prompt = `Generate a personalized dual-lens quarterly wealth briefing for the Carter family.

Current Context:
- Heir: Maya (Age 24), currently at Trust Ladder Level ${heirLevel} of 5. Completed ${simCount} practice scenarios.
- Major Heir Goal: Launch an independent design studio in Year 5 ($950,000).
- Proposed Plan: $${proposalAmount.toLocaleString()} into "${proposalUse}". Maya's stated rationale: "${proposalWhy}".
- Focus Area: ${focusArea}
- Advisor Tone: ${advisorTone}
- Advisor custom guidance notes: "${advisorNote || 'Highlight prudent risk management while affirming values-aligned clean energy investments.'}"
- Family Portfolio: $12.4M overall, +7.8% YTD return, 60% equities, 30% fixed income, 10% real estate.

Respond ONLY with a valid JSON object matching this schema:
{
  "audioVoicenoteScript": "A warm, natural 45-60 second spoken voicenote transcript from James addressing Maya directly (starts with 'Hey Maya, James here...')",
  "heirBriefing": {
    "headline": "Inspiring, clear headline for Maya",
    "summary": "2-3 sentences explaining portfolio results in plain, empowering language",
    "impactHighlight": "Specific note on ESG/climate or community impact",
    "milestoneImpact": "How this affects her Year 5 design studio milestone and practice fund",
    "jargonDecoded": [
      { "term": "Financial Term 1", "explanation": "Simple, intuitive explanation" },
      { "term": "Financial Term 2", "explanation": "Simple, intuitive explanation" },
      { "term": "Financial Term 3", "explanation": "Simple, intuitive explanation" }
    ],
    "suggestedQuestions": [
      "Question 1 Maya might ask James",
      "Question 2 Maya might ask James",
      "Question 3 Maya might ask James"
    ]
  },
  "parentBriefing": {
    "headline": "Institutional, reassuring headline for Elena",
    "fiduciarySummary": "Fiduciary summary covering portfolio performance, liquidity, and preservation",
    "capitalPreservation": "Downside risk analysis and trust safety",
    "taxStrategy": "Tax efficiency or tax-loss harvesting context",
    "readinessNote": "Objective assessment of Maya's developing financial maturity to give Elena trust",
    "talkingPoints": [
      "Family discussion topic 1",
      "Family discussion topic 2",
      "Family discussion topic 3"
    ]
  }
}`

  const responseText = await callGemini(prompt, systemInstruction, 'application/json')
  if (!responseText) return DEFAULT_BRIEFING

  try {
    // Strip markdown code fences if any
    const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      audioVoicenoteScript: parsed.audioVoicenoteScript || DEFAULT_BRIEFING.audioVoicenoteScript,
      heirBriefing: parsed.heirBriefing || DEFAULT_BRIEFING.heirBriefing,
      parentBriefing: parsed.parentBriefing || DEFAULT_BRIEFING.parentBriefing,
    }
  } catch (parseErr) {
    console.warn('JSON parse error from Gemini, using default fallback:', parseErr)
    return DEFAULT_BRIEFING
  }
}

/**
 * Ask follow-up question to Advisor James Ortiz powered by Gemini
 */
export async function askAdvisorJames({ question, role = 'heir', currentBriefing = null, state = {} }) {
  const isHeir = role === 'heir'
  const systemInstruction = `You are James Ortiz, trusted family wealth advisor at Northfield Wealth. You are answering a direct question from ${isHeir ? 'Maya Carter (age 24, heir)' : 'Elena Carter (mother and family matriarch)'}.
Your tone for Maya is warm, educational, concise (2-3 sentences), empowering, and free of Wall Street intimidation.
Your tone for Elena is polished, fiduciary, respectful, reassuring, and data-backed.
Be direct and helpful.`

  const prompt = `Context:
- Family: Carter Family ($12.4M portfolio, Northfield Wealth).
- Maya's goal: Year 5 Design Studio ($950k) and $25k practice fund.
- Latest briefing headline: "${currentBriefing?.heirBriefing?.headline || 'Q3 Wealth Review'}"
- User Role: ${isHeir ? 'Maya (Heir)' : 'Elena (Parent)'}
- User Question: "${question}"

Please provide a concise, genuine, 2-3 sentence answer as James Ortiz.`

  const answer = await callGemini(prompt, systemInstruction)
  if (!answer) {
    return isHeir
      ? `Great question, Maya! For your design studio timeline, maintaining a liquid buffer in high-yield reserves protects your runway without forcing us to sell equities during temporary dips. Let's discuss this at our Tuesday check-in.`
      : `Elena, rest assured our downside modeling accounts for this scenario. We maintain a 24-month liquidity runway in municipal short-durations specifically to safeguard family distributions regardless of near-term market cycles.`
  }

  return answer.trim()
}

/**
 * Evaluate Investment Proposal against Family Charter using Gemini
 */
export async function evaluateCharterAlignment({
  proposal = null,
  charter = [],
  customThesis = '',
}) {
  const proposalAmount = proposal?.amount || 25000
  const proposalUse = proposal?.use || 'clean tech and practice sandbox fund'
  const proposalWhy = proposal?.why || customThesis || 'Balanced growth with planetary sustainability'
  const stockShare = proposal?.plan?.stockShare != null ? Math.round(proposal.plan.stockShare * 100) : 50

  const principlesText = charter.map((p, i) => `${i + 1}. [${p.category}] ${p.title}: "${p.clause}"`).join('\n')

  const systemInstruction = `You are the Governance Engine at Northfield Wealth. You evaluate next-generation wealth proposals against the Carter Family Constitution/Charter.
You analyze alignment fairly: celebrating when proposals fulfill values (like sustainability or entrepreneurship), while flagging when they push beyond agreed risk thresholds (like preservation or concentration).
Respond ONLY in valid raw JSON matching the required schema.`

  const prompt = `Evaluate the following wealth proposal against the active Carter Family Constitution.

Proposal Details:
- Capital Request: $${proposalAmount.toLocaleString()}
- Proposed Use: ${proposalUse}
- Allocation: ${stockShare}% Equities / ${100 - stockShare - 10}% Fixed Income / 10% Real Estate
- Stated Rationale: "${proposalWhy}"

Carter Family Constitution Principles:
${principlesText}

Return a valid JSON object matching this schema:
{
  "overallScore": 88,
  "verdict": "Strongly Aligned with Family Constitution",
  "summary": "2-3 sentences summarizing how the proposal honors the family charter and where it innovates.",
  "alignedPoints": [
    "Specific principle honored and why",
    "Another principle honored and why"
  ],
  "tensionPoints": [
    "Any principle where the proposal tests boundaries or requires discussion"
  ],
  "principleScores": [
    {
      "id": "charter-1",
      "title": "Multi-Generational Capital Preservation",
      "score": 90,
      "status": "aligned",
      "comment": "1 sentence explanation"
    }
  ],
  "advisorGuidance": "A constructive 2-sentence note from James Ortiz on how the family can reach unanimous agreement."
}`

  const responseText = await callGemini(prompt, systemInstruction, 'application/json')

  // Fallback in case of network issue
  const fallbackResult = {
    overallScore: 86,
    verdict: "Strongly Aligned with Family Constitution",
    summary: `Maya's proposal for $${proposalAmount.toLocaleString()} into ${proposalUse} honors the core pillar of Planetary Stewardship while keeping risk strictly bounded within the Level 2 sandbox limits.`,
    alignedPoints: [
      "Directly fulfills Principle 2 (Planetary Stewardship) through climate transition allocation.",
      "Complies with Principle 3 (Sandbox Autonomy) by operating within the supervised $25k to $50k limits.",
      "Protects Principle 4 (Productive Enterprise) by anchoring towards her Year 5 design studio runway."
    ],
    tensionPoints: [
      "Principle 1 (Preservation): Elena may want verification that short-duration cash buffers remain untouched during market dips."
    ],
    principleScores: charter.map(c => ({
      id: c.id,
      title: c.title,
      score: c.category === 'Sustainability' || c.category === 'Enterprise' ? 95 : 82,
      status: 'aligned',
      comment: `Adheres to the agreed guidelines set by ${c.author}.`
    })),
    advisorGuidance: "This proposal strikes an admirable balance between Maya's environmental values and Elena's focus on principal preservation. I recommend approval with standard quarterly reporting."
  }

  if (!responseText) return fallbackResult

  try {
    const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      overallScore: parsed.overallScore ?? fallbackResult.overallScore,
      verdict: parsed.verdict || fallbackResult.verdict,
      summary: parsed.summary || fallbackResult.summary,
      alignedPoints: parsed.alignedPoints || fallbackResult.alignedPoints,
      tensionPoints: parsed.tensionPoints || fallbackResult.tensionPoints,
      principleScores: parsed.principleScores || fallbackResult.principleScores,
      advisorGuidance: parsed.advisorGuidance || fallbackResult.advisorGuidance,
    }
  } catch (err) {
    console.warn('Error parsing charter evaluation from Gemini:', err)
    return fallbackResult
  }
}
