import { createContext, useContext, useEffect, useReducer } from 'react'
import { PLAN_DEFAULTS, DEFAULT_CHARTER } from './data/demo.js'

// One shared demo state for all three roles, so switching roles live
// shows the same proposal moving through the trust triangle.

const STORAGE_KEY = 'heirloom-demo-v2'

export const DEFAULT_REPORT_RECORD = {
  id: 'report-initial',
  timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
  title: "Q3 Family Portfolio & Strategic Stewardship Review",
  focusArea: "Clean Energy & Studio Milestone",
  advisorTone: "Encouraging & Mentoring",
  advisorNote: "Rebalanced 4% into sustainable infrastructure; preserved liquid buffer for Maya's design studio goal.",
  unreadHeir: true,
  unreadParent: true,
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

export const initialState = {
  role: 'heir', // 'heir' | 'advisor' | 'parent'
  page: 'home',
  level: 2,
  justLeveledUp: false,
  simulations: {}, // scenarioId -> { choiceId, factors, why, score, at }
  plan: { ...PLAN_DEFAULTS },
  proposal: null,
  // proposal: { plan, probabilities, amount, use, why, status, advisor, parent, submittedAt }
  // status: 'submitted' | 'reviewed' | 'question' | 'approved' | 'declined'

  // Personalization profile
  profile: {
    goals: [],         // selected goal ids from GOAL_OPTIONS
    knowledge: null,   // 'beginner' | 'intermediate' | 'advanced'
    learningStyle: [], // selected style ids
    involvement: null, // involvement level id
    onboarded: false,  // whether onboarding has been seen
  },

  // Benefits / incentive state
  benefits: {
    eligibleBalance: 10_000, // illustrative balance for calculator
    approvalRequested: false,
    approvalStatus: null, // null | 'pending' | 'approved'
    approvalRequestedAt: null,
  },

  // Decision history (timeline events)
  history: [],

  // Gemini-powered personalized dual-lens briefing & voicenote
  briefing: DEFAULT_REPORT_RECORD,
  briefingQnA: [],
  advisorRecords: [DEFAULT_REPORT_RECORD],

  // Family Constitution & Values Codex
  charter: DEFAULT_CHARTER,
  charterEvaluations: {},
}

function reducer(state, action) {
  switch (action.type) {
    case 'role':
      return { ...state, role: action.role, page: action.role === 'advisor' ? 'review' : 'home' }
    case 'go':
      return { ...state, page: action.page, justLeveledUp: action.page === 'home' ? state.justLeveledUp : false }
    case 'simulation':
      return {
        ...state,
        simulations: { ...state.simulations, [action.id]: action.result },
        history: [
          ...state.history,
          { type: 'simulation', scenarioId: action.id, score: action.result.score.total, at: Date.now() },
        ],
      }
    case 'plan':
      return { ...state, plan: { ...state.plan, ...action.plan } }
    case 'submit':
      return {
        ...state,
        proposal: { ...action.proposal, status: 'submitted', advisor: null, parent: null, submittedAt: Date.now() },
        history: [
          ...state.history,
          { type: 'plan_submitted', at: Date.now() },
        ],
      }
    case 'advisorReview':
      return {
        ...state,
        proposal: { ...state.proposal, status: 'reviewed', advisor: action.review },
        history: [
          ...state.history,
          { type: 'advisor_reviewed', rec: action.review.rec, at: Date.now() },
        ],
      }
    case 'parentDecision': {
      const { decision, message } = action
      const status = decision === 'approve' ? 'approved' : decision === 'decline' ? 'declined' : 'question'
      const leveled = decision === 'approve' && state.level < 3
      return {
        ...state,
        proposal: { ...state.proposal, status, parent: { decision, message } },
        level: leveled ? 3 : state.level,
        justLeveledUp: leveled,
        history: [
          ...state.history,
          { type: 'parent_decided', decision, at: Date.now() },
        ],
      }
    }
    case 'dismissLevelUp':
      return { ...state, justLeveledUp: false }
    case 'profile':
      return { ...state, profile: { ...state.profile, ...action.profile } }
    case 'benefits':
      return { ...state, benefits: { ...state.benefits, ...action.benefits } }
    case 'requestBenefitApproval': {
      // Only advisor or parent can grant it; request sets it to pending
      return {
        ...state,
        benefits: {
          ...state.benefits,
          approvalRequested: true,
          approvalStatus: 'pending',
          approvalRequestedAt: Date.now(),
        },
        history: [...state.history, { type: 'benefit_requested', at: Date.now() }],
      }
    }
    case 'advisorApproveBenefit':
      return {
        ...state,
        benefits: { ...state.benefits, approvalStatus: 'approved' },
        history: [...state.history, { type: 'benefit_approved', at: Date.now() }],
      }
    case 'setBriefing':
      return {
        ...state,
        briefing: action.briefing,
        history: [...state.history, { type: 'briefing_generated', at: Date.now() }],
      }
    case 'publishAdvisorBriefing': {
      const newRecord = {
        id: 'report-' + Date.now(),
        timestamp: Date.now(),
        title: action.briefing.heirBriefing?.headline || action.briefing.parentBriefing?.headline || 'New Advisory Briefing & Report',
        focusArea: action.focusArea || 'Strategic Wealth Review',
        advisorTone: action.advisorTone || 'Encouraging & Mentoring',
        advisorNote: action.advisorNote || '',
        unreadHeir: true,
        unreadParent: true,
        ...action.briefing,
      }
      return {
        ...state,
        briefing: action.briefing,
        advisorRecords: [newRecord, ...(state.advisorRecords || [])],
        history: [...state.history, { type: 'advisor_report_published', title: newRecord.title, at: Date.now() }],
      }
    }
    case 'markAdvisorRecordRead': {
      const { id, role } = action
      return {
        ...state,
        advisorRecords: (state.advisorRecords || []).map(r => {
          if (r.id !== id) return r
          return role === 'heir' ? { ...r, unreadHeir: false } : { ...r, unreadParent: false }
        })
      }
    }
    case 'addBriefingQnA':
      return {
        ...state,
        briefingQnA: [...(state.briefingQnA || []), action.item],
      }
    case 'clearBriefingQnA':
      return {
        ...state,
        briefingQnA: [],
      }
    case 'proposeCharterPrinciple':
      return {
        ...state,
        charter: [...state.charter, action.principle],
        history: [...state.history, { type: 'charter_proposed', title: action.principle.title, at: Date.now() }],
      }
    case 'voteCharterPrinciple': {
      const { id, role, vote } = action
      return {
        ...state,
        charter: state.charter.map((p) => {
          if (p.id !== id) return p
          const updated = {
            ...p,
            parentVote: role === 'parent' ? vote : p.parentVote,
            heirVote: role === 'heir' ? vote : p.heirVote,
          }
          if (updated.parentVote === 'support' && updated.heirVote === 'support') {
            updated.status = 'ratified'
          }
          return updated
        }),
        history: [...state.history, { type: 'charter_voted', principleId: id, role, vote, at: Date.now() }],
      }
    }
    case 'setCharterEvaluation':
      return {
        ...state,
        charterEvaluations: {
          ...state.charterEvaluations,
          [action.key]: action.evaluation,
        },
      }
    case 'reset':
      return { ...initialState }
    default:
      return state
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      // Merge with initialState so new fields added later are present
      return {
        ...initialState,
        ...saved,
        profile: { ...initialState.profile, ...(saved.profile || {}) },
        benefits: { ...initialState.benefits, ...(saved.benefits || {}) },
        history: saved.history || [],
        briefing: saved.briefing || DEFAULT_REPORT_RECORD,
        briefingQnA: saved.briefingQnA || [],
        advisorRecords: saved.advisorRecords?.length ? saved.advisorRecords : [DEFAULT_REPORT_RECORD],
        charter: saved.charter?.length ? saved.charter : DEFAULT_CHARTER,
        charterEvaluations: saved.charterEvaluations || {},
      }
    }
    return initialState
  } catch {
    return initialState
  }
}

const Ctx = createContext(null)

export function DemoProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable: demo still works for this session */
    }
  }, [state])
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export const useDemo = () => useContext(Ctx)
