import { createContext, useContext, useEffect, useReducer } from 'react'
import { PLAN_DEFAULTS } from './data/demo.js'

// One shared demo state for all three roles, so switching roles live
// shows the same proposal moving through the trust triangle.

const STORAGE_KEY = 'heirloom-demo-v1'

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
}

function reducer(state, action) {
  switch (action.type) {
    case 'role':
      return { ...state, role: action.role, page: action.role === 'advisor' ? 'review' : 'home' }
    case 'go':
      return { ...state, page: action.page, justLeveledUp: action.page === 'home' ? state.justLeveledUp : false }
    case 'simulation':
      return { ...state, simulations: { ...state.simulations, [action.id]: action.result } }
    case 'plan':
      return { ...state, plan: { ...state.plan, ...action.plan } }
    case 'submit':
      return {
        ...state,
        proposal: { ...action.proposal, status: 'submitted', advisor: null, parent: null, submittedAt: Date.now() },
      }
    case 'advisorReview':
      return { ...state, proposal: { ...state.proposal, status: 'reviewed', advisor: action.review } }
    case 'parentDecision': {
      const { decision, message } = action
      const status = decision === 'approve' ? 'approved' : decision === 'decline' ? 'declined' : 'question'
      const leveled = decision === 'approve' && state.level < 3
      return {
        ...state,
        proposal: { ...state.proposal, status, parent: { decision, message } },
        level: leveled ? 3 : state.level,
        justLeveledUp: leveled,
      }
    }
    case 'dismissLevelUp':
      return { ...state, justLeveledUp: false }
    case 'reset':
      return { ...initialState }
    default:
      return state
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState
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
