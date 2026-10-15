import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, SCENARIOS, LADDER } from '../data/demo.js'
import { useBenefitsMilestones } from './Benefits.jsx'
import { AdvisorBriefingStudio } from '../components/GeminiBriefing.jsx'

const REC_LABELS = { support: 'Supports it', changes: 'Suggests changes', concerns: 'Has concerns' }

function AdvisorReviewForm({ onSubmit }) {
  const [comment, setComment] = useState('')
  const [rec, setRec] = useState('support')
  const [changes, setChanges] = useState('')
  const [showChanges, setShowChanges] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    onSubmit({ comment, rec, requestedChanges: showChanges ? changes : '' })
  }

  return (
    <form className="action-panel" onSubmit={submit}>
      <h2>Your review</h2>
      <fieldset className="seg">
        <legend>Recommendation to {FAMILY.parent.name}</legend>
        {Object.entries(REC_LABELS).map(([k, v]) => (
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
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={showChanges} onChange={() => setShowChanges((v) => !v)} />
        Request specific changes before approval
      </label>
      {showChanges && (
        <label className="field">
          <span>Requested changes</span>
          <textarea rows={2} value={changes} onChange={(e) => setChanges(e.target.value)}
            placeholder="What should Maya revise?" />
        </label>
      )}
      <div className="actions"><button className="btn primary" type="submit">Send review</button></div>
    </form>
  )
}

function MayaReadinessSummary({ state }) {
  const simCount = Object.keys(state.simulations).length
  const hasProposal = !!state.proposal
  const hasAdvisorReview = !!state.proposal?.advisor
  const isApproved = state.proposal?.status === 'approved'
  const level = LADDER.find((l) => l.level === state.level)
  const milestones = useBenefitsMilestones(state)
  const doneMilestones = milestones.filter((m) => m.done).length

  const parts = []
  if (simCount === 0) parts.push(`${FAMILY.heir.name} has not yet completed a practice scenario.`)
  else if (simCount === 1) parts.push(`${FAMILY.heir.name} has completed one practice scenario.`)
  else parts.push(`${FAMILY.heir.name} has completed ${simCount} practice scenarios.`)

  if (!hasProposal) parts.push('She has not yet submitted a proposed plan.')
  else if (!hasAdvisorReview) parts.push('She has submitted a plan and is waiting for your review.')
  else if (!isApproved) parts.push('Her plan has been reviewed. The next step is family approval.')
  else parts.push('Her plan has been approved by the family. She is now at the Manage level.')

  const nextAction = !hasProposal
    ? `Encourage ${FAMILY.heir.name} to build and propose a plan once she completes two scenarios.`
    : !hasAdvisorReview
    ? `Review ${FAMILY.heir.name}'s proposal below and pass it to ${FAMILY.parent.name}.`
    : !isApproved
    ? `${FAMILY.parent.name} is reviewing the plan. No action needed from you right now.`
    : `Consider recommending a new scenario or planning exercise to continue ${FAMILY.heir.name}'s development.`

  return (
    <div className="readiness-summary card">
      <h2>Maya's readiness summary</h2>
      <p>{parts.join(' ')} {nextAction}</p>
      <dl className="stats">
        <div>
          <dt>Trust level</dt>
          <dd>{state.level} — {level?.name}</dd>
        </div>
        <div>
          <dt>Scenarios done</dt>
          <dd>{simCount}</dd>
        </div>
        <div>
          <dt>Benefits milestones</dt>
          <dd>{doneMilestones} / {milestones.length}</dd>
        </div>
      </dl>
    </div>
  )
}

export default function AdvisorDashboard() {
  const { state, dispatch } = useDemo()
  const { proposal, simulations, benefits } = state

  const pending = proposal?.status === 'submitted'
  const reviewed = proposal?.status === 'reviewed'
  const benefitPending = benefits.approvalStatus === 'pending'

  const sims = Object.entries(simulations)
  const avgScore = sims.length ? Math.round(sims.reduce((s, [, v]) => s + v.score.total, 0) / sims.length) : null

  return (
    <div className="advisor-dash">
      <h1>Advisor Dashboard</h1>
      <p className="lede">How can I help Maya become a more capable and engaged participant in family wealth decisions?</p>

      {pending && (
        <div className="next-step" style={{ marginBottom: '1.5rem' }}>
          <p className="next-kicker">Action needed</p>
          <h2>Maya submitted a plan for your review</h2>
          <p>She proposed ${proposal.amount?.toLocaleString()} into {proposal.use}. Review it and pass your notes to {FAMILY.parent.name}.</p>
        </div>
      )}

      {benefitPending && (
        <div className="callout" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <strong>Maya requested an eligibility review for the Heirloom Progress Benefit.</strong>
            <p style={{ margin: '0.25rem 0 0' }}>She has completed all qualification milestones.</p>
          </div>
          <button className="btn primary" onClick={() => dispatch({ type: 'advisorApproveBenefit' })}>
            Approve benefit
          </button>
        </div>
      )}

      <MayaReadinessSummary state={state} />

      <div className="advisor-grid">
        <div className="advisor-main">
          <section>
            <h2>Practice scenario history</h2>
            {sims.length === 0 ? (
              <div className="card empty"><p>Maya hasn't completed any scenarios yet.</p></div>
            ) : (
              <div className="scenario-history card" style={{ padding: '1rem 1.25rem' }}>
                {avgScore != null && (
                  <p className="muted" style={{ marginBottom: '0.75rem' }}>Average decision score: <strong>{avgScore} / 100</strong></p>
                )}
                <ul className="history">
                  {sims.map(([id, s]) => {
                    const sc = SCENARIOS.find((x) => x.id === id)
                    const choice = sc?.choices.find((c) => c.id === s.choiceId)
                    return (
                      <li key={id}>
                        <div>
                          <span>{sc?.title}</span>
                          {choice && <span className="muted" style={{ fontSize: '0.85rem', display: 'block' }}>
                            Chose: {choice.label.toLowerCase()}
                          </span>}
                        </div>
                        <strong>{s.score.total}</strong>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>

          <section style={{ marginTop: '2rem' }}>
            <h2>Proposal review</h2>
            {!proposal ? (
              <div className="card empty">
                <p>Maya hasn't submitted a proposal yet.</p>
              </div>
            ) : (
              <div>
                <div className="card ask" style={{ marginBottom: '1rem' }}>
                  <p className="ask-amount">${proposal.amount?.toLocaleString()}</p>
                  <p className="ask-use">into {proposal.use}</p>
                  <blockquote className="ask-why"><p>{proposal.why}</p><cite>Maya's reasoning</cite></blockquote>
                </div>
                <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
                  <h3>Plan details</h3>
                  <p className="muted">
                    Travel ${proposal.plan?.travelPerYear?.toLocaleString()} / year ·{' '}
                    {Math.round((proposal.plan?.stockShare || 0) * 100)}% stocks ·
                    tested across 1,000 simulated futures
                  </p>
                </div>
                {pending && <AdvisorReviewForm onSubmit={(review) => dispatch({ type: 'advisorReview', review })} />}
                {reviewed && (
                  <div className="card" style={{ padding: '1.25rem 1.5rem', background: 'var(--spruce-soft)' }}>
                    <h3>Your review has been sent to {FAMILY.parent.name}</h3>
                    <p className="rec-badge" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>{REC_LABELS[proposal.advisor?.rec]}</p>
                    <p>{proposal.advisor?.comment}</p>
                  </div>
                )}
                {['approved', 'declined', 'question'].includes(proposal.status) && (
                  <div className={`decision ${proposal.status}`} style={{ padding: '1.25rem 1.5rem' }}>
                    <h3>
                      {FAMILY.parent.name}{' '}
                      {proposal.status === 'approved' ? 'approved' : proposal.status === 'declined' ? 'declined' : 'asked a question'}
                    </h3>
                    {proposal.parent?.message && <p>"{proposal.parent.message}"</p>}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="advisor-sidebar">
          <div className="card sidebar-card">
            <h3>Next learning recommendation</h3>
            <p className="muted">
              {sims.length < 2
                ? 'Encourage Maya to complete at least two scenarios before building her plan. The business-withdrawal and inflation scenarios are most relevant to her goals.'
                : !proposal
                ? 'Maya is ready to build her first plan. Suggest she tries the plan comparison feature in My Plan.'
                : proposal.status === 'approved'
                ? 'Consider recommending the inflation or underperformance scenarios to build resilience in her thinking.'
                : 'Once Elena reviews the plan, support Maya in reflecting on the advisor feedback in detail.'}
            </p>
          </div>
          <div className="card sidebar-card" style={{ marginTop: '1rem' }}>
            <h3>Your role</h3>
            <p className="muted small">
              You provide professional financial context, review Maya's proposals, and recommend next steps to the family.
              Your approval is required before {FAMILY.parent.name} can decide, and before any benefit is granted.
            </p>
          </div>
        </aside>
      </div>

      <AdvisorBriefingStudio />
    </div>
  )
}
