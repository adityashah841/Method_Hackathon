import { useDemo } from '../state.jsx'
import { FAMILY, LADDER, SCENARIOS, BENEFITS } from '../data/demo.js'
import { TrustLadder } from '../components/visuals.jsx'
import { useBenefitsMilestones } from './Benefits.jsx'
import { HeirBriefingSection } from '../components/GeminiBriefing.jsx'

// What Maya should do next: one card, one action
function nextStep(state) {
  const p = state.proposal
  const done = Object.keys(state.simulations).length

  // Pending feedback/approval first
  if (p?.status === 'question') {
    return {
      title: `${FAMILY.parent.name} asked a question`,
      body: `"${p.parent.message}" Update your plan and propose it again.`,
      action: 'Revise my plan',
      page: 'plan',
      tag: 'Action needed',
    }
  }
  if (p?.status === 'declined') {
    return {
      title: "Your proposal wasn't approved this time",
      body: p.parent.message ? `"${p.parent.message}"` : 'Read the feedback, adjust, and try again.',
      action: 'Revise my plan',
      page: 'plan',
      tag: 'Action needed',
    }
  }
  if (p?.status === 'submitted') {
    return {
      title: `${FAMILY.advisor.name} is reviewing your proposal`,
      body: "You'll see his notes here as soon as he's done.",
      action: 'View proposal',
      page: 'proposal',
      tag: 'In review',
    }
  }
  if (p?.status === 'reviewed') {
    return {
      title: `Waiting for ${FAMILY.parent.name}'s decision`,
      body: `${FAMILY.advisor.name.split(' ')[0]} reviewed your plan and passed it to your mom.`,
      action: 'View proposal',
      page: 'proposal',
      tag: 'In review',
    }
  }
  if (p?.status === 'approved') {
    return {
      title: 'You can now run the fund yourself',
      body: `Your $${FAMILY.smallFund.toLocaleString()} fund is yours to manage, with ${FAMILY.advisor.name.split(' ')[0]} and your mom reviewing results.`,
      action: 'Try another scenario',
      page: 'practice',
      tag: 'Level up',
    }
  }

  if (!done) {
    return {
      title: `Try a scenario: ${SCENARIOS[0].title.charAt(0).toLowerCase() + SCENARIOS[0].title.slice(1)}`,
      body: 'Make a call on a real situation your family could face, and see how it plays out across 1,000 possible futures.',
      action: 'Start the scenario',
      page: 'practice',
    }
  }
  if (!p) {
    return {
      title: 'Build your plan and propose it',
      body: `Set your priorities, see the chance of reaching each one, then propose how to use the ${'$' + FAMILY.smallFund.toLocaleString()} fund.`,
      action: 'Open my plan',
      page: 'plan',
    }
  }
  return {
    title: 'Try another scenario to strengthen your reasoning',
    body: 'More scenarios help you understand different market situations and build your decision score.',
    action: 'Try a scenario',
    page: 'practice',
  }
}

function BenefitsSummary({ state, dispatch }) {
  const milestones = useBenefitsMilestones(state)
  const done = milestones.filter((m) => m.done).length
  const pct = Math.round((done / milestones.length) * 100)
  const { approvalStatus } = state.benefits

  const statusText =
    approvalStatus === 'approved'
      ? "Approved — you're earning the illustrative bonus APY"
      : approvalStatus === 'pending'
      ? 'Eligibility review in progress'
      : done === milestones.length
      ? 'Eligible — request a review to activate'
      : `${done} of ${milestones.length} milestones complete`

  return (
    <div className="home-benefits-card card">
      <div className="home-benefits-header">
        <h3>Progress Benefits</h3>
        <button className="text-btn" onClick={() => dispatch({ type: 'go', page: 'benefits' })}>View details</button>
      </div>
      <div className="home-apy-display">
        <span className="home-apy-current">{(BENEFITS.standardApy * 100).toFixed(2)}%</span>
        <span className="home-apy-arrow" aria-hidden="true">→</span>
        <span className="home-apy-target">{(BENEFITS.qualifiedApy * 100).toFixed(2)}%</span>
        <span className="home-apy-bonus muted">+{(BENEFITS.bonusApy * 100).toFixed(2)} pp bonus</span>
      </div>
      <div className="progress-track" style={{ margin: '0.5rem 0' }}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small">{statusText}</p>
    </div>
  )
}

function TrustLadderDetail({ state }) {
  const current = LADDER.find((l) => l.level === state.level)
  const next = LADDER.find((l) => l.level === state.level + 1)
  const simCount = Object.keys(state.simulations).length

  if (!next) {
    return (
      <div className="trust-detail card" style={{ marginTop: '1rem' }}>
        <h3>Trust Ladder Complete</h3>
        <p className="muted small">You have reached the highest stage: {current?.name || 'Own'}.</p>
      </div>
    )
  }

  const criteria = next.criteria.map((c) => {
    let done = false
    switch (c.kind) {
      case 'simulation': done = simCount >= 1; break
      case 'simulation_count': done = simCount >= (c.count || 2); break
      case 'proposal': done = !!state.proposal; break
      case 'advisor_review': done = !!state.proposal?.advisor; break
      case 'parent_approval': done = state.proposal?.status === 'approved'; break
      case 'benefits': done = state.benefits.approvalStatus === 'approved'; break
      case 'static': done = c.done; break
      default: done = false
    }
    return { ...c, done }
  })

  const doneCriteria = criteria.filter((c) => c.done).length

  // Explainable readiness summary dynamically generated from state
  const readinessSummary = (() => {
    const hasPlan = !!state.proposal
    const hasAdvisorReview = !!state.proposal?.advisor
    const hasParentApproval = state.proposal?.status === 'approved'

    if (state.level >= 3) {
      return `Maya has achieved Level ${state.level} (${current?.name || 'Manage'}). She is managing the $${FAMILY.smallFund.toLocaleString()} practice fund with ${FAMILY.advisor.name.split(' ')[0]} and ${FAMILY.parent.name} reviewing quarterly.`
    }
    if (hasParentApproval) {
      return `Maya has completed the fundamentals pathway, received advisor review, and obtained parent approval. She is now ready to manage the practice fund.`
    }
    if (hasAdvisorReview) {
      return `Maya has completed the financial fundamentals pathway, demonstrated understanding through practice, and submitted a proposed plan. ${FAMILY.advisor.name} has completed his review with recommendations. Her next step is for ${FAMILY.parent.name} to review the proposal before approving supervised practice.`
    }
    if (hasPlan) {
      return `Maya has completed the fundamentals pathway and submitted a proposed financial plan. Her next step is to review the plan with ${FAMILY.advisor.name} before ${FAMILY.parent.name} considers approving supervised practice.`
    }
    if (simCount >= 2) {
      return `Maya has completed ${simCount} practice scenarios and demonstrated an understanding of risk and diversification. Her next step is to create and propose a financial plan for the family's practice fund.`
    }
    if (simCount === 1) {
      return `Maya has completed 1 practice scenario. Her next step is to build a proposed financial plan to review with ${FAMILY.advisor.name}.`
    }
    return `Maya is exploring financial fundamentals. Her next step is to complete a practice scenario to build her decision score and understanding.`
  })()

  return (
    <div className="trust-detail card" style={{ marginTop: '1rem' }}>
      <h3>Requirements for {next.name}</h3>
      <p className="muted small">{next.description}</p>

      <div className="callout" style={{ marginTop: '0.75rem', fontSize: '0.85rem', lineHeight: '1.45', background: 'var(--spruce-soft)', borderLeft: '3px solid var(--spruce-2)' }}>
        <strong>Readiness summary:</strong> {readinessSummary}
      </div>

      <div className="progress-head" style={{ marginTop: '0.75rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{doneCriteria} of {criteria.length} done</span>
      </div>
      <ul className="checklist" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {criteria.map((c) => (
          <li key={c.id} className={c.done ? 'done' : ''}>{c.label}</li>
        ))}
      </ul>

      <div className="reviewer-info" style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--sand)', fontSize: '0.8rem', color: 'var(--muted)' }}>
        <span>Reviewer: <strong>{FAMILY.advisor.name}</strong> · Approver: <strong>{FAMILY.parent.name}</strong></span>
      </div>
    </div>
  )
}

export default function HeirHome() {
  const { state, dispatch } = useDemo()

  const step = nextStep(state)
  const current = LADDER.find((l) => l.level === state.level)
  const next = LADDER.find((l) => l.level === state.level + 1)
  const feedback = state.proposal?.parent?.message
    ? { who: FAMILY.parent.name, text: state.proposal.parent.message }
    : state.proposal?.advisor?.comment
      ? { who: FAMILY.advisor.name, text: state.proposal.advisor.comment }
      : { who: FAMILY.advisor.name, text: "Welcome aboard, Maya. Start with the market-drop scenario: there's no wrong answer, only reasoning to learn from." }

  return (
    <div className="home-grid">
      <section className="home-main">
        {state.justLeveledUp && (
          <div className="levelup" role="status">
            <p>
              <strong>You reached level 3: Manage.</strong> Your mom approved your plan, so you can now run the small fund yourself.
            </p>
            <button className="text-btn" onClick={() => dispatch({ type: 'dismissLevelUp' })}>Dismiss</button>
          </div>
        )}

        <h1>Hi {FAMILY.heir.name}</h1>
        <p className="lede">
          You're at level {state.level}, {current.name}.{' '}
          {next ? `Next up is ${next.name}: ${next.unlock.toLowerCase()}.` : 'You\'ve completed the Trust Ladder.'}
        </p>

        <article className="next-step">
          <p className="next-kicker">{step.tag || 'Your next step'}</p>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
          <button className="btn primary" onClick={() => dispatch({ type: 'go', page: step.page })}>
            {step.action}
          </button>
        </article>

        <BenefitsSummary state={state} dispatch={dispatch} />

        <blockquote className="feedback">
          <p>{feedback.text}</p>
          <cite>{feedback.who}</cite>
        </blockquote>

        <HeirBriefingSection />
      </section>

      <aside className="home-ladder">
        <h2 className="aside-title">Trust Ladder</h2>
        <TrustLadder level={state.level} />
        <p className="aside-note">You move up by showing good decisions, not by birthday.</p>
        <TrustLadderDetail state={state} />
      </aside>
    </div>
  )
}
