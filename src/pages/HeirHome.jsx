import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, LADDER, SCENARIOS, GOAL_OPTIONS, BENEFITS } from '../data/demo.js'
import { TrustLadder } from '../components/visuals.jsx'
import { useBenefitsMilestones } from './Benefits.jsx'
import { ProfileEditor } from './Onboarding.jsx'
import Onboarding from './Onboarding.jsx'
import { HeirBriefingSection } from '../components/GeminiBriefing.jsx'

// What Maya should do next, personalized by profile and state
function nextStep(state) {
  const p = state.proposal
  const done = Object.keys(state.simulations).length
  const { profile } = state

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
      page: 'decisions',
      tag: 'In review',
    }
  }
  if (p?.status === 'reviewed') {
    return {
      title: `Waiting for ${FAMILY.parent.name}'s decision`,
      body: `${FAMILY.advisor.name.split(' ')[0]} reviewed your plan and passed it to your mom.`,
      action: 'View in Family Decisions',
      page: 'decisions',
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

  // Personalized steps based on goals
  const goalIds = profile.goals || []
  if (!done) {
    const suggestedScenario = goalIds.length > 0
      ? SCENARIOS.find((s) => s.tags?.some((t) => goalIds.some((g) => {
          const gObj = GOAL_OPTIONS.find((o) => o.id === g)
          return gObj?.scenarios?.includes(s.id)
        })))
      : null
    const scenario = suggestedScenario || SCENARIOS[0]
    return {
      title: `Try a scenario: ${scenario.title.toLowerCase()}`,
      body: profile.goals.includes('business')
        ? 'Practice a situation where you might need to fund your design studio from the portfolio.'
        : 'Make a call on a real situation your family could face, and see how it plays out across 1,000 possible futures.',
      action: 'Start the scenario',
      page: 'practice',
      why: profile.goals.length > 0 ? `Suggested because you selected "${GOAL_OPTIONS.find((o) => profile.goals.includes(o.id))?.label || 'your goals'}" as a priority.` : null,
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

function progress(state) {
  const p = state.proposal
  if (state.level >= 3) {
    return [
      { label: 'Get your plan approved', done: true },
      { label: 'Complete both scenarios', done: Object.keys(state.simulations).length >= SCENARIOS.length },
      { label: 'Run the fund for a quarter', done: false },
      { label: 'Pass a quarterly review', done: false },
    ]
  }
  return [
    { label: 'Complete a scenario', done: Object.keys(state.simulations).length > 0 },
    { label: 'Propose a plan', done: !!p },
    { label: 'Get it approved', done: p?.status === 'approved' },
  ]
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

function PersonalizedScenarioSuggestions({ profile, simulations, dispatch }) {
  const goalIds = profile.goals || []
  if (goalIds.length === 0) return null

  const suggested = SCENARIOS.filter((s) => {
    const goalObj = GOAL_OPTIONS.find((g) => goalIds.includes(g.id))
    return goalObj?.scenarios?.includes(s.id) || s.tags?.some((t) => goalIds.includes(t))
  }).filter((s) => !(s.id in simulations)).slice(0, 2)

  if (suggested.length === 0) return null

  const goalLabel = GOAL_OPTIONS.find((o) => goalIds.includes(o.id))?.label || 'your goals'

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p className="muted small" style={{ marginBottom: '0.5rem' }}>
        Suggested because you selected <strong>{goalLabel}</strong> as a priority:
      </p>
      <div className="scenario-list" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {suggested.map((s) => (
          <button
            key={s.id}
            className="scenario-tile"
            onClick={() => dispatch({ type: 'go', page: 'practice' })}
          >
            <span className="scenario-title" style={{ fontSize: '1rem' }}>{s.title}</span>
            <span className="scenario-story" style={{ fontSize: '0.9rem' }}>{s.story.slice(0, 80)}…</span>
            <span className="scenario-meta">{s.years}-year outlook</span>
          </button>
        ))}
      </div>
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
      return `Maya has completed 1 practice scenario. Her next step is to complete a second scenario and build a proposed financial plan to review with ${FAMILY.advisor.name}.`
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
  const [showProfile, setShowProfile] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!state.profile.onboarded)

  const step = nextStep(state)
  const current = LADDER.find((l) => l.level === state.level)
  const next = LADDER.find((l) => l.level === state.level + 1)
  const steps = progress(state)
  const doneCount = steps.filter((s) => s.done).length
  const feedback = state.proposal?.parent?.message
    ? { who: FAMILY.parent.name, text: state.proposal.parent.message }
    : state.proposal?.advisor?.comment
      ? { who: FAMILY.advisor.name, text: state.proposal.advisor.comment }
      : { who: FAMILY.advisor.name, text: "Welcome aboard, Maya. Start with the market-drop scenario: there's no wrong answer, only reasoning to learn from." }

  const knowledgeNote = state.profile.knowledge === 'beginner'
    ? 'We\'ll explain terms in plain English as you go.'
    : state.profile.knowledge === 'advanced'
    ? 'We\'ll include deeper analysis and show you key numerical assumptions.'
    : null

  if (showOnboarding) {
    return <Onboarding onDone={() => setShowOnboarding(false)} />
  }

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

        <div className="home-hero">
          <div>
            <h1>Hi {FAMILY.heir.name}</h1>
            <p className="lede">
              You're at level {state.level}, {current.name}.{' '}
              {next ? `Next up is ${next.name}: ${next.unlock.toLowerCase()}.` : 'You\'ve completed the Trust Ladder.'}
            </p>
            {knowledgeNote && <p className="muted" style={{ fontSize: '0.9rem', marginTop: '-0.75rem', marginBottom: '1rem' }}>{knowledgeNote}</p>}
          </div>
          <button className="text-btn" onClick={() => setShowProfile((v) => !v)} style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
            {showProfile ? 'Close profile' : 'Edit profile'}
          </button>
        </div>

        {showProfile && (
          <div style={{ marginBottom: '1.5rem' }}>
            <ProfileEditor onClose={() => setShowProfile(false)} />
          </div>
        )}

        <article className="next-step">
          <p className="next-kicker">{step.tag || 'Your next step'}</p>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
          {step.why && <p className="muted small">{step.why}</p>}
          <button className="btn primary" onClick={() => dispatch({ type: 'go', page: step.page })}>
            {step.action}
          </button>
        </article>

        <PersonalizedScenarioSuggestions
          profile={state.profile}
          simulations={state.simulations}
          dispatch={dispatch}
        />

        <HeirBriefingSection />

        {next && (
          <div className="progress" style={{ marginBottom: '1.25rem' }}>
            <div className="progress-head">
              <span>Progress to {next.name}</span>
              <span>{doneCount} of {steps.length}</span>
            </div>
            <div className="progress-track"><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
            <ul className="checklist">
              {steps.map((s) => (
                <li key={s.label} className={s.done ? 'done' : ''}>{s.label}</li>
              ))}
            </ul>
          </div>
        )}

        <BenefitsSummary state={state} dispatch={dispatch} />

        <blockquote className="feedback">
          <p>{feedback.text}</p>
          <cite>{feedback.who}</cite>
        </blockquote>
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
