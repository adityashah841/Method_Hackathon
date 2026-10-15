import { DemoProvider, useDemo } from './state.jsx'
import { FAMILY } from './data/demo.js'
import HeirHome from './pages/HeirHome.jsx'
import Simulation from './pages/Simulation.jsx'
import Planner from './pages/Planner.jsx'
import Proposal from './pages/Proposal.jsx'
import ParentHome from './pages/ParentHome.jsx'
import Benefits from './pages/Benefits.jsx'
import FamilyDecisions from './pages/FamilyDecisions.jsx'
import Privacy from './pages/Privacy.jsx'
import AdvisorDashboard from './pages/AdvisorDashboard.jsx'
import FamilyCharter from './pages/FamilyCharter.jsx'

const ROLES = [
  { id: 'heir', label: `${FAMILY.heir.name} (heir)` },
  { id: 'advisor', label: `${FAMILY.advisor.name.split(' ')[0]} (advisor)` },
  { id: 'parent', label: `${FAMILY.parent.name} (parent)` },
]

const TABS = {
  heir: [
    { id: 'home', label: 'Home' },
    { id: 'practice', label: 'Practice' },
    { id: 'plan', label: 'My plan', also: ['proposal'] },
    { id: 'charter', label: 'Family Charter 📜' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'decisions', label: 'Family decisions' },
  ],
  advisor: [
    { id: 'review', label: 'Dashboard' },
    { id: 'charter', label: 'Family Charter 📜' },
    { id: 'decisions', label: 'Decision room' },
    { id: 'privacy', label: 'Permissions' },
  ],
  parent: [
    { id: 'home', label: 'Home' },
    { id: 'charter', label: 'Family Charter 📜' },
    { id: 'decisions', label: 'Decision room' },
    { id: 'privacy', label: 'Permissions' },
  ],
}

function Page() {
  const { state } = useDemo()
  const { role, page } = state

  if (page === 'charter') return <FamilyCharter />

  if (role === 'heir') {
    if (page === 'practice') return <Simulation />
    if (page === 'plan') return <Planner />
    if (page === 'proposal') return <FamilyDecisions />
    if (page === 'benefits') return <Benefits />
    if (page === 'decisions') return <FamilyDecisions />
    if (page === 'privacy') return <Privacy />
    return <HeirHome />
  }

  if (role === 'advisor') {
    if (page === 'review') return <AdvisorDashboard />
    if (page === 'decisions') return <FamilyDecisions />
    if (page === 'privacy') return <Privacy />
    return <AdvisorDashboard />
  }

  if (role === 'parent') {
    if (page === 'home') return <ParentHome />
    if (page === 'decisions') return <FamilyDecisions />
    if (page === 'privacy') return <Privacy />
    return <ParentHome />
  }

  return <FamilyDecisions />
}

function Shell() {
  const { state, dispatch } = useDemo()
  const tabs = TABS[state.role]

  // Badge logic: pending action needing attention
  const advisorPending = state.role === 'advisor' && state.proposal?.status === 'submitted'
  const advisorBenefitPending = state.role === 'advisor' && state.benefits?.approvalStatus === 'pending'
  const parentPending = state.role === 'parent' && state.proposal?.status === 'reviewed'
  const heirFeedbackPending = state.role === 'heir' &&
    (state.proposal?.status === 'reviewed' || state.proposal?.status === 'question' || state.proposal?.status === 'declined')
  const heirBenefitApproved = state.role === 'heir' && state.benefits?.approvalStatus === 'approved' &&
    !state.simulations['benefits-seen']
  const heirUnreadNotes = state.role === 'heir' && (state.advisorRecords || []).some((r) => r.unreadHeir)
  const parentUnreadNotes = state.role === 'parent' && (state.advisorRecords || []).some((r) => r.unreadParent)

  const tabBadge = (tabId) => {
    if (tabId === 'home' && (heirUnreadNotes || parentUnreadNotes)) return true
    if (tabId === 'review' && (advisorPending || advisorBenefitPending)) return true
    if (tabId === 'decisions' && (advisorPending || parentPending || heirFeedbackPending)) return true
    if (tabId === 'benefits' && heirBenefitApproved) return true
    return false
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Heirloom</span>
          <span className="brand-firm">for the {FAMILY.name} family, with {FAMILY.firm}</span>
        </div>
        <div className="roles" role="radiogroup" aria-label="View as">
          {ROLES.map((r) => (
            <button key={r.id} role="radio" aria-checked={state.role === r.id}
              className={state.role === r.id ? 'role on' : 'role'}
              onClick={() => dispatch({ type: 'role', role: r.id })}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {tabs.map((t) => {
          const active = state.page === t.id || t.also?.includes(state.page)
          const hasBadge = tabBadge(t.id)
          return (
            <button key={t.id} className={active ? 'tab on' : 'tab'} aria-current={active ? 'page' : undefined}
              onClick={() => dispatch({ type: 'go', page: t.id })}>
              {t.label}
              {hasBadge && <span className="badge" aria-label="needs attention" />}
            </button>
          )
        })}
      </nav>

      <main className="content">
        <Page />
      </main>

      <footer className="foot">
        <span>Demo with a fictional family. Numbers are illustrative, not financial advice. No real financial products or transactions.</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="text-btn" onClick={() => dispatch({ type: 'go', page: 'privacy' })}>Permissions &amp; Transparency</button>
          <button className="text-btn" onClick={() => dispatch({ type: 'reset' })}>Reset demo</button>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <DemoProvider>
      <Shell />
    </DemoProvider>
  )
}
