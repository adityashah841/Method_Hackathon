import { useDemo } from '../state.jsx'
import { FAMILY, LADDER, SCENARIOS } from '../data/demo.js'
import { TrustLadder } from '../components/visuals.jsx'

// What Maya should do next: one card, one action.
function nextStep(state) {
  const p = state.proposal
  const done = Object.keys(state.simulations).length
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
  if (p.status === 'submitted') {
    return { title: `${FAMILY.advisor.name} is reviewing your proposal`, body: 'You’ll see his notes here as soon as he’s done.', action: 'View proposal', page: 'proposal' }
  }
  if (p.status === 'reviewed') {
    return { title: `Waiting for ${FAMILY.parent.name}’s decision`, body: `${FAMILY.advisor.name.split(' ')[0]} reviewed your plan and passed it to your mom.`, action: 'View proposal', page: 'proposal' }
  }
  if (p.status === 'question') {
    return { title: `${FAMILY.parent.name} asked a question`, body: `“${p.parent.message}” Update your plan and propose it again.`, action: 'Revise my plan', page: 'plan' }
  }
  if (p.status === 'declined') {
    return { title: 'Your proposal wasn’t approved this time', body: p.parent.message ? `“${p.parent.message}”` : 'Read the feedback, adjust, and try again.', action: 'Revise my plan', page: 'plan' }
  }
  return {
    title: 'You can now run the fund yourself',
    body: `Your $${FAMILY.smallFund.toLocaleString()} fund is yours to manage, with ${FAMILY.advisor.name.split(' ')[0]} and your mom reviewing results.`,
    action: 'Try another scenario',
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

export default function HeirHome() {
  const { state, dispatch } = useDemo()
  const step = nextStep(state)
  const current = LADDER.find((l) => l.level === state.level)
  const next = LADDER.find((l) => l.level === state.level + 1)
  const steps = progress(state)
  const doneCount = steps.filter((s) => s.done).length
  const feedback = state.proposal?.parent?.message
    ? { who: FAMILY.parent.name, text: state.proposal.parent.message }
    : state.proposal?.advisor?.comment
      ? { who: FAMILY.advisor.name, text: state.proposal.advisor.comment }
      : { who: FAMILY.advisor.name, text: 'Welcome aboard, Maya. Start with the market-drop scenario: there’s no wrong answer, only reasoning to learn from.' }

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
          You’re at level {state.level}, {current.name}. {next ? `Next up is ${next.name}: ${next.unlock.toLowerCase()}.` : ''}
        </p>

        <article className="next-step">
          <p className="next-kicker">Your next step</p>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
          <button className="btn primary" onClick={() => dispatch({ type: 'go', page: step.page })}>{step.action}</button>
        </article>

        {next && (
          <div className="progress">
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

        <blockquote className="feedback">
          <p>{feedback.text}</p>
          <cite>{feedback.who}</cite>
        </blockquote>
      </section>

      <aside className="home-ladder">
        <h2 className="aside-title">Trust Ladder</h2>
        <TrustLadder level={state.level} />
        <p className="aside-note">You move up by showing good decisions, not by birthday.</p>
      </aside>
    </div>
  )
}
