import { useDemo } from '../state.jsx'
import { FAMILY, LADDER, SCENARIOS } from '../data/demo.js'
import { TrustLadder, money } from '../components/visuals.jsx'
import { useBenefitsMilestones } from './Benefits.jsx'
import { ParentBriefingSection } from '../components/GeminiBriefing.jsx'

export default function ParentHome() {
  const { state, dispatch } = useDemo()
  const p = state.proposal
  const sims = Object.entries(state.simulations)
  const level = LADDER.find((l) => l.level === state.level)
  const avg = sims.length ? Math.round(sims.reduce((s, [, v]) => s + v.score.total, 0) / sims.length) : null
  const milestones = useBenefitsMilestones(state)
  const doneMilestones = milestones.filter((m) => m.done).length

  const waiting = p?.status === 'reviewed'

  // Readiness summary
  const readinessParts = []
  readinessParts.push(`${FAMILY.heir.name} is at Trust Level ${state.level} (${level?.name}).`)
  if (sims.length > 0) readinessParts.push(`She has completed ${sims.length} practice scenario${sims.length > 1 ? 's' : ''}.`)
  if (!p) readinessParts.push('She has not yet submitted a proposed plan.')
  else if (p.status === 'approved') readinessParts.push('Her plan has been approved. She is now managing the practice fund.')
  else if (p.status === 'reviewed') readinessParts.push(`${FAMILY.advisor.name} reviewed her plan and recommends a decision from you.`)
  else readinessParts.push('A proposal is in progress.')

  return (
    <div className="parent">
      <h1>Hi {FAMILY.parent.name}</h1>
      <p className="lede">Here's how Maya is doing, and anything that needs you.</p>

      {waiting ? (
        <article className="next-step">
          <p className="next-kicker">Waiting for you</p>
          <h2>Maya proposed putting {money(p.amount, { compact: false })} into {p.use}</h2>
          <p>{FAMILY.advisor.name} has reviewed it. Your decision moves her toward running the fund herself.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <button className="btn primary" onClick={() => dispatch({ type: 'go', page: 'decisions' })}>Review proposal</button>
          </div>
        </article>
      ) : (
        <div className="quiet-card">
          <p>
            {!p && 'Nothing needs you right now. Maya is practicing with scenarios.'}
            {p?.status === 'submitted' && `Maya sent a proposal. ${FAMILY.advisor.name} is reviewing it first; you'll see it here when he's done.`}
            {p?.status === 'approved' && "You approved Maya's plan. She's now managing the practice fund."}
            {p?.status === 'declined' && "You declined Maya's last proposal. She can revise and send a new one."}
            {p?.status === 'question' && 'You asked Maya a question. Her revised plan will appear here.'}
          </p>
        </div>
      )}

      <div className="callout" style={{ marginBottom: '1.5rem', color: 'var(--text)' }}>
        <p>{readinessParts.join(' ')}</p>
      </div>

      <div className="parent-grid">
        <section className="heir-summary">
          <h2>Maya, {FAMILY.heir.age}</h2>
          <p className="summary-level">Level {state.level} of 5: {level.name}</p>
          <TrustLadder level={state.level} compact />
          <dl className="stats">
            <div><dt>Scenarios completed</dt><dd>{sims.length}</dd></div>
            <div><dt>Average decision score</dt><dd>{avg ?? 'None yet'}</dd></div>
            <div><dt>Benefits milestones</dt><dd>{doneMilestones} / {milestones.length}</dd></div>
          </dl>
          {sims.length > 0 && (
            <ul className="history">
              {sims.map(([id, s]) => (
                <li key={id}>
                  <span>{SCENARIOS.find((x) => x.id === id)?.title}</span>
                  <strong>{s.score.total}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="advisor-card">
          <h2>From {FAMILY.advisor.name}</h2>
          <p>
            {p?.advisor?.comment ??
              "Maya's been engaged and asks good questions. I'd suggest letting her propose a plan for the practice fund once she's worked through a scenario or two."}
          </p>
          {p?.advisor?.rec && (
            <p className={`rec-badge`} style={{ marginTop: '0.5rem' }}>
              {p.advisor.rec === 'support' ? '✓ Supports the proposal' : p.advisor.rec === 'changes' ? '→ Suggests changes' : '⚠ Has concerns'}
            </p>
          )}
        </section>
      </div>

      <ParentBriefingSection />

      <section style={{ marginTop: '2rem' }}>
        <h2>Shared family goals</h2>
        <div className="parent-goals-row">
          {[
            { label: 'Start a design studio', detail: '$950,000 · Year 5', icon: '🏢' },
            { label: 'Keep the family wealth', detail: '$1.2M+ · 30 years', icon: '🌿' },
            { label: 'Travel & lifestyle', detail: '$20,000 / year', icon: '✈️' },
          ].map((g) => (
            <div key={g.label} className="parent-goal-chip card">
              <span style={{ fontSize: '1.5rem' }}>{g.icon}</span>
              <div>
                <strong>{g.label}</strong>
                <p className="muted small">{g.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
