import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, SCENARIOS, planGoals } from '../data/demo.js'
import { FuturesDots, ProbabilityBar, RangeBar, money } from '../components/visuals.jsx'

const REC = {
  support: 'Supports it',
  changes: 'Suggests changes',
  concerns: 'Has concerns',
}

function Tracker({ status }) {
  const order = ['submitted', 'reviewed', 'decided']
  const reached = status === 'submitted' ? 0 : status === 'reviewed' ? 1 : 2
  const labels = ['Submitted', `${FAMILY.advisor.name.split(' ')[0]} reviewed`, `${FAMILY.parent.name} decided`]
  return (
    <ol className="tracker" aria-label="Proposal status">
      {order.map((s, i) => (
        <li key={s} className={i <= reached ? 'reached' : ''}>{labels[i]}</li>
      ))}
    </ol>
  )
}

function SimulationHistory({ simulations }) {
  const entries = Object.entries(simulations)
  if (!entries.length) return <p className="muted">No scenarios completed yet.</p>
  return (
    <ul className="history">
      {entries.map(([id, s]) => {
        const sc = SCENARIOS.find((x) => x.id === id)
        const choice = sc.choices.find((c) => c.id === s.choiceId)
        return (
          <li key={id}>
            <span>{sc.title}: chose to {choice.label.toLowerCase()}</span>
            <strong>{s.score.total}</strong>
          </li>
        )
      })}
    </ul>
  )
}

function AdvisorForm({ onSubmit }) {
  const [comment, setComment] = useState('')
  const [rec, setRec] = useState('support')
  return (
    <form className="action-panel" onSubmit={(e) => { e.preventDefault(); onSubmit({ comment, rec }) }}>
      <h2>Your review</h2>
      <fieldset className="seg">
        <legend>Recommendation to {FAMILY.parent.name}</legend>
        {Object.entries(REC).map(([k, v]) => (
          <label key={k} className={rec === k ? 'seg-opt on' : 'seg-opt'}>
            <input type="radio" name="rec" value={k} checked={rec === k} onChange={() => setRec(k)} />
            {v}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>Comment for Maya and {FAMILY.parent.name}</span>
        <textarea rows={3} required value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Explain the trade-offs in plain words" />
      </label>
      <div className="actions"><button className="btn primary" type="submit">Send review</button></div>
    </form>
  )
}

function ParentForm({ onDecide }) {
  const [message, setMessage] = useState('')
  const [asking, setAsking] = useState(false)
  return (
    <div className="action-panel">
      <h2>Your decision</h2>
      <label className="field">
        <span>Message to Maya <span className="muted">{asking ? '(your question)' : '(optional)'}</span></span>
        <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder={asking ? 'What would you like her to think about?' : 'A note she’ll see on her home screen'} />
      </label>
      <div className="actions">
        <button className="btn" onClick={() => onDecide('decline', message)}>Decline</button>
        <button className="btn" onClick={() => (asking && message.trim() ? onDecide('question', message) : setAsking(true))}>
          {asking ? 'Send question' : 'Ask a question'}
        </button>
        <button className="btn primary" onClick={() => onDecide('approve', message)}>Approve</button>
      </div>
    </div>
  )
}

export default function Proposal() {
  const { state, dispatch } = useDemo()
  const { proposal: p, role } = state

  if (!p) {
    return (
      <div>
        <h1>Proposal</h1>
        <div className="empty">
          <p>{role === 'heir' ? 'You haven’t proposed a plan yet.' : 'Maya hasn’t sent a proposal yet.'}</p>
          {role === 'heir' ? (
            <button className="btn primary" onClick={() => dispatch({ type: 'go', page: 'plan' })}>Build my plan</button>
          ) : (
            <>
              <h2 className="small-h">Her practice so far</h2>
              <SimulationHistory simulations={state.simulations} />
            </>
          )}
        </div>
      </div>
    )
  }

  const goals = planGoals(p.plan.travelPerYear)
  const decided = ['approved', 'declined', 'question'].includes(p.status)

  return (
    <div className="proposal">
      <h1>Maya’s proposal</h1>
      <Tracker status={p.status} />

      <section className="ask">
        <p className="ask-amount">{money(p.amount, { compact: false })}</p>
        <p className="ask-use">into {p.use}</p>
        <blockquote className="ask-why"><p>{p.why}</p><cite>Maya’s reasoning</cite></blockquote>
      </section>

      <section>
        <h2>The plan behind it</h2>
        <p className="muted">
          Travel {money(p.plan.travelPerYear, { compact: false })} a year, {Math.round(p.plan.stockShare * 100)}% in stocks. Tested across 1,000 possible futures.
        </p>
        <div className="mini-goals">
          {goals.map((g) => (
            <div key={g.id} className="mini-goal">
              <span className="goal-name">{g.name}</span>
              <ProbabilityBar probability={p.probabilities[g.id]} />
              <FuturesDots probability={p.probabilities[g.id]} label="reach it" />
            </div>
          ))}
        </div>
        <h3 className="small-h">Money left in 30 years</h3>
        <RangeBar {...p.ending} min={0} max={p.ending.p90 * 1.1} reference={FAMILY.heirShare} />
      </section>

      {role === 'advisor' && (
        <section>
          <h2>Her practice so far</h2>
          <SimulationHistory simulations={state.simulations} />
        </section>
      )}

      {p.advisor && (
        <section className={`advisor-note rec-${p.advisor.rec}`}>
          <h2>{FAMILY.advisor.name}, advisor</h2>
          <p className="rec-badge">{REC[p.advisor.rec]}</p>
          <p>{p.advisor.comment}</p>
        </section>
      )}

      {decided && (
        <section className={`decision ${p.status}`}>
          <h2>
            {p.status === 'approved' ? `${FAMILY.parent.name} approved this plan` : p.status === 'declined' ? `${FAMILY.parent.name} declined this plan` : `${FAMILY.parent.name} asked a question`}
          </h2>
          {p.parent.message && <p>“{p.parent.message}”</p>}
        </section>
      )}

      {role === 'advisor' && p.status === 'submitted' && (
        <AdvisorForm onSubmit={(review) => dispatch({ type: 'advisorReview', review })} />
      )}
      {role === 'advisor' && p.status !== 'submitted' && !decided && (
        <p className="muted waiting">Review sent. Waiting for {FAMILY.parent.name}’s decision.</p>
      )}
      {role === 'parent' && p.status === 'reviewed' && (
        <ParentForm onDecide={(decision, message) => dispatch({ type: 'parentDecision', decision, message })} />
      )}
      {role === 'parent' && p.status === 'submitted' && (
        <p className="muted waiting">{FAMILY.advisor.name} is reviewing this first. You’ll be able to decide once his notes are in.</p>
      )}
    </div>
  )
}
