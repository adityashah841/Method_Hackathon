import { useDemo } from '../state.jsx'
import { FAMILY, LADDER, SCENARIOS } from '../data/demo.js'
import { TrustLadder, money } from '../components/visuals.jsx'

export default function ParentHome() {
  const { state, dispatch } = useDemo()
  const p = state.proposal
  const sims = Object.entries(state.simulations)
  const level = LADDER.find((l) => l.level === state.level)
  const avg = sims.length ? Math.round(sims.reduce((s, [, v]) => s + v.score.total, 0) / sims.length) : null

  const waiting = p?.status === 'reviewed'
  return (
    <div className="parent">
      <h1>Hi {FAMILY.parent.name}</h1>
      <p className="lede">Here’s how Maya is doing, and anything that needs you.</p>

      {waiting ? (
        <article className="next-step">
          <p className="next-kicker">Waiting for you</p>
          <h2>Maya proposed putting {money(p.amount, { compact: false })} into {p.use}</h2>
          <p>{FAMILY.advisor.name} has reviewed it. Your decision moves her toward running the fund herself.</p>
          <button className="btn primary" onClick={() => dispatch({ type: 'go', page: 'review' })}>Review proposal</button>
        </article>
      ) : (
        <div className="quiet-card">
          <p>
            {!p && 'Nothing needs you right now. Maya is practicing with scenarios.'}
            {p?.status === 'submitted' && `Maya sent a proposal. ${FAMILY.advisor.name} is reviewing it first; you’ll see it here when he’s done.`}
            {p?.status === 'approved' && 'You approved Maya’s plan. She’s now managing the practice fund.'}
            {p?.status === 'declined' && 'You declined Maya’s last proposal. She can revise and send a new one.'}
            {p?.status === 'question' && 'You asked Maya a question. Her revised plan will appear here.'}
          </p>
        </div>
      )}

      <div className="parent-grid">
        <section className="heir-summary">
          <h2>Maya, {FAMILY.heir.age}</h2>
          <p className="summary-level">Level {state.level} of 5: {level.name}</p>
          <TrustLadder level={state.level} compact />
          <dl className="stats">
            <div><dt>Scenarios completed</dt><dd>{sims.length}</dd></div>
            <div><dt>Average decision score</dt><dd>{avg ?? 'None yet'}</dd></div>
            <div><dt>Plans proposed</dt><dd>{p ? 1 : 0}</dd></div>
          </dl>
          {sims.length > 0 && (
            <ul className="history">
              {sims.map(([id, s]) => (
                <li key={id}>
                  <span>{SCENARIOS.find((x) => x.id === id).title}</span>
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
              'Maya’s been engaged and asks good questions. I’d suggest letting her propose a plan for the practice fund once she’s worked through a scenario or two.'}
          </p>
        </section>
      </div>
    </div>
  )
}
