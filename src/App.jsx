import { DemoProvider, useDemo } from './state.jsx'
import { FAMILY } from './data/demo.js'
import HeirHome from './pages/HeirHome.jsx'
import Simulation from './pages/Simulation.jsx'
import Planner from './pages/Planner.jsx'
import Proposal from './pages/Proposal.jsx'
import ParentHome from './pages/ParentHome.jsx'

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
  ],
  advisor: [{ id: 'review', label: 'Review' }],
  parent: [
    { id: 'home', label: 'Home' },
    { id: 'review', label: 'Review' },
  ],
}

function Page() {
  const { state } = useDemo()
  const { role, page } = state
  if (role === 'heir') {
    if (page === 'practice') return <Simulation />
    if (page === 'plan') return <Planner />
    if (page === 'proposal') return <Proposal />
    return <HeirHome />
  }
  if (role === 'parent' && page === 'home') return <ParentHome />
  return <Proposal />
}

function Shell() {
  const { state, dispatch } = useDemo()
  const tabs = TABS[state.role]
  const pending =
    (state.role === 'advisor' && state.proposal?.status === 'submitted') ||
    (state.role === 'parent' && state.proposal?.status === 'reviewed')

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
          return (
            <button key={t.id} className={active ? 'tab on' : 'tab'} aria-current={active ? 'page' : undefined}
              onClick={() => dispatch({ type: 'go', page: t.id })}>
              {t.label}
              {t.id === 'review' && pending && <span className="badge" aria-label="needs attention" />}
            </button>
          )
        })}
      </nav>

      <main className="content">
        <Page />
      </main>

      <footer className="foot">
        <span>Demo with a fictional family. Numbers are illustrative, not financial advice.</span>
        <button className="text-btn" onClick={() => dispatch({ type: 'reset' })}>Reset demo</button>
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
