import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY } from '../data/demo.js'
import { CharterAlignmentScorecard } from '../components/CharterAlignmentScorecard.jsx'

function formatDate(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function TimelineEvent({ event }) {
  const labels = {
    simulation: (e) => `Completed practice scenario · Decision score: ${e.score}`,
    plan_submitted: () => 'Maya submitted a proposed plan',
    advisor_reviewed: (e) => `${FAMILY.advisor.name} reviewed the proposal · ${e.rec === 'support' ? 'Supports it' : e.rec === 'changes' ? 'Suggests changes' : 'Has concerns'}`,
    parent_decided: (e) => `${FAMILY.parent.name} ${e.decision === 'approve' ? 'approved the plan' : e.decision === 'decline' ? 'declined the proposal' : 'asked a question'}`,
    benefit_requested: () => 'Maya requested eligibility review for Progress Benefits',
    benefit_approved: () => `${FAMILY.advisor.name} approved illustrative Progress Benefit`,
  }

  const icons = {
    simulation: '◉',
    plan_submitted: '→',
    advisor_reviewed: '✎',
    parent_decided: '✓',
    benefit_requested: '◎',
    benefit_approved: '★',
  }

  const label = labels[event.type]?.(event) ?? event.type
  const icon = icons[event.type] ?? '·'

  return (
    <div className="timeline-event">
      <div className="timeline-icon" aria-hidden="true">{icon}</div>
      <div className="timeline-body">
        <p className="timeline-label">{label}</p>
        <span className="timeline-time muted">{formatDate(event.at)}{event.at ? ` · ${formatTime(event.at)}` : ''}</span>
      </div>
    </div>
  )
}

function AdvisorActions({ proposal, dispatch }) {
  const [comment, setComment] = useState('')
  const [rec, setRec] = useState('support')
  const [changes, setChanges] = useState('')
  const [showChanges, setShowChanges] = useState(false)

  const submitReview = (e) => {
    e.preventDefault()
    dispatch({ type: 'advisorReview', review: { comment, rec, requestedChanges: showChanges ? changes : '' } })
  }

  return (
    <div className="fd-action-panel card">
      <h3>Your review</h3>
      <form onSubmit={submitReview}>
        <fieldset className="seg">
          <legend>Recommendation to {FAMILY.parent.name}</legend>
          {[['support', 'Supports it'], ['changes', 'Suggests changes'], ['concerns', 'Has concerns']].map(([k, v]) => (
            <label key={k} className={rec === k ? 'seg-opt on' : 'seg-opt'}>
              <input type="radio" name="rec" value={k} checked={rec === k} onChange={() => setRec(k)} />
              {v}
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span>Comment for Maya and {FAMILY.parent.name}</span>
          <textarea
            rows={3}
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Explain the trade-offs in plain words"
          />
        </label>
        <label className="profile-option" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showChanges} onChange={() => setShowChanges((v) => !v)} />
          Request specific changes before approval
        </label>
        {showChanges && (
          <label className="field">
            <span>Requested changes</span>
            <textarea
              rows={2}
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="What should Maya revise?"
            />
          </label>
        )}
        <div className="actions">
          <button className="btn primary" type="submit">Send review</button>
        </div>
      </form>
    </div>
  )
}

function ParentActions({ proposal, dispatch }) {
  const [message, setMessage] = useState('')
  const [asking, setAsking] = useState(false)

  return (
    <div className="fd-action-panel card">
      <h3>Your decision</h3>
      <label className="field">
        <span>Message to Maya <span className="muted">{asking ? '(your question)' : '(optional)'}</span></span>
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={asking ? 'What would you like her to think about?' : 'A note she\'ll see on her home screen'}
        />
      </label>
      <div className="actions">
        <button className="btn" onClick={() => dispatch({ type: 'parentDecision', decision: 'decline', message })}>Decline</button>
        <button className="btn" onClick={() => (asking && message.trim() ? dispatch({ type: 'parentDecision', decision: 'question', message }) : setAsking(true))}>
          {asking ? 'Send question' : 'Ask a question'}
        </button>
        <button className="btn primary" onClick={() => dispatch({ type: 'parentDecision', decision: 'approve', message })}>Approve</button>
      </div>
    </div>
  )
}

function ProposalDetail({ proposal, role, dispatch }) {
  // Inline summary of the proposal
  const { use, why, amount, plan, advisor, parent, status, submittedAt } = proposal
  const statusLabels = {
    submitted: { label: 'Awaiting advisor review', color: 'var(--brass)' },
    reviewed: { label: 'Awaiting parent decision', color: 'var(--spruce-2)' },
    approved: { label: 'Approved', color: 'var(--good)' },
    declined: { label: 'Declined', color: 'var(--low)' },
    question: { label: 'Question asked', color: 'var(--brass)' },
  }
  const st = statusLabels[status] || { label: status, color: 'var(--muted)' }

  return (
    <div className="proposal-detail">
      <div className="proposal-status-row">
        <span className="proposal-status-badge" style={{ background: st.color }}>{st.label}</span>
        <span className="muted small">{formatDate(submittedAt)}</span>
      </div>

      <div className="card ask" style={{ marginTop: '1rem' }}>
        <p className="ask-amount">${amount?.toLocaleString()}</p>
        <p className="ask-use">into {use}</p>
        <blockquote className="ask-why"><p>{why}</p><cite>Maya's reasoning</cite></blockquote>
      </div>

      <div className="card" style={{ marginTop: '1rem', padding: '1.25rem 1.5rem' }}>
        <h3>Plan details</h3>
        <p className="muted">Travel ${plan?.travelPerYear?.toLocaleString()} a year · {Math.round((plan?.stockShare || 0) * 100)}% in stocks · tested across 1,000 simulated futures.</p>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <CharterAlignmentScorecard proposal={proposal} compact={false} />
      </div>

      {advisor && (
        <div className={`card advisor-note rec-${advisor.rec}`} style={{ marginTop: '1rem' }}>
          <h3>{FAMILY.advisor.name}, Advisor</h3>
          <p className="rec-badge">{advisor.rec === 'support' ? 'Supports it' : advisor.rec === 'changes' ? 'Suggests changes' : 'Has concerns'}</p>
          <p>{advisor.comment}</p>
          {advisor.requestedChanges && <p className="muted"><em>Requested changes:</em> {advisor.requestedChanges}</p>}
        </div>
      )}

      {parent && (
        <div className={`card decision ${status}`} style={{ marginTop: '1rem', padding: '1.25rem 1.5rem' }}>
          <h3>{FAMILY.parent.name} {status === 'approved' ? 'approved' : status === 'declined' ? 'declined' : 'asked a question'}</h3>
          {parent.message && <p>"{parent.message}"</p>}
        </div>
      )}

      {role === 'advisor' && status === 'submitted' && (
        <div style={{ marginTop: '1rem' }}>
          <AdvisorActions proposal={proposal} dispatch={dispatch} />
        </div>
      )}
      {role === 'advisor' && status === 'reviewed' && (
        <p className="muted waiting">Review sent. Waiting for {FAMILY.parent.name}'s decision.</p>
      )}
      {role === 'parent' && status === 'reviewed' && (
        <div style={{ marginTop: '1rem' }}>
          <ParentActions proposal={proposal} dispatch={dispatch} />
        </div>
      )}
      {role === 'parent' && status === 'submitted' && (
        <p className="muted waiting">{FAMILY.advisor.name} is reviewing this first. You'll be able to decide once his notes are in.</p>
      )}
    </div>
  )
}

export default function FamilyDecisions() {
  const { state, dispatch } = useDemo()
  const { proposal, history, role, simulations } = state

  const pendingForAdvisor = proposal?.status === 'submitted'
  const pendingForParent = proposal?.status === 'reviewed'

  return (
    <div className="family-decisions">
      <h1>Family Decision Room</h1>
      <p className="lede">
        This is the shared space where Maya, {FAMILY.advisor.name}, and {FAMILY.parent.name} collaborate on financial proposals.
      </p>

      <div className="fd-grid">
        <div className="fd-main">
          {!proposal && (
            <div className="card empty">
              <h2>No proposal yet</h2>
              <p>
                {role === 'heir'
                  ? "When you're ready, build and submit a plan from My Plan."
                  : "Maya hasn't submitted a proposal yet. Her practice scenarios are shown below."}
              </p>
              {role === 'heir' && (
                <button className="btn primary" onClick={() => dispatch({ type: 'go', page: 'plan' })}>
                  Build my plan
                </button>
              )}
              {role !== 'heir' && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h3 className="small-h">Practice scenarios completed</h3>
                  {Object.keys(simulations).length === 0 ? (
                    <p className="muted">No scenarios completed yet.</p>
                  ) : (
                    <ul className="history">
                      {Object.entries(simulations).map(([id, s]) => (
                        <li key={id}>
                          <span>{id.replace(/-/g, ' ')}</span>
                          <strong>{s.score.total}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {proposal && (
            <section>
              <div className="fd-section-header">
                <h2>Maya's proposal</h2>
                {(pendingForAdvisor && role === 'advisor') && (
                  <span className="badge-label">Needs your review</span>
                )}
                {(pendingForParent && role === 'parent') && (
                  <span className="badge-label">Needs your decision</span>
                )}
              </div>
              <ProposalDetail proposal={proposal} role={role} dispatch={dispatch} />
            </section>
          )}
        </div>

        <aside className="fd-sidebar">
          <div className="card">
            <h3>Decision timeline</h3>
            {history.length === 0 ? (
              <p className="muted">No events yet. Actions taken here will appear in the timeline.</p>
            ) : (
              <div className="timeline">
                {[...history].reverse().map((e, i) => (
                  <TimelineEvent key={i} event={e} />
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>Roles in this room</h3>
            <dl className="role-list">
              <div>
                <dt>{FAMILY.heir.name}</dt>
                <dd>Creates and edits proposed plans, explains rationale</dd>
              </div>
              <div>
                <dt>{FAMILY.advisor.name}</dt>
                <dd>Reviews proposals, provides professional feedback</dd>
              </div>
              <div>
                <dt>{FAMILY.parent.name}</dt>
                <dd>Reviews advisor feedback and approves or requests changes</dd>
              </div>
            </dl>
            <p className="muted small" style={{ marginTop: '0.75rem' }}>
              Approval here means approval of the proposal for the next Trust Ladder stage, not execution of a real financial transaction.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
