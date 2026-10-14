import { useMemo, useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, planGoals, planWeights } from '../data/demo.js'
import { simulatePlan, expectedReturn } from '../engine/engine.js'
import { FanChart, FuturesDots, ProbabilityBar, money } from '../components/visuals.jsx'

export function usePlanResult(plan) {
  return useMemo(() => {
    const goals = planGoals(plan.travelPerYear)
    const weights = planWeights(plan.stockShare)
    const result = simulatePlan({ startWealth: FAMILY.heirShare, weights, goals })
    return { goals, weights, ...result }
  }, [plan.travelPerYear, plan.stockShare])
}

export function GoalCards({ goals, probabilities }) {
  return (
    <div className="goals">
      {goals.map((g) => (
        <div key={g.id} className="goal">
          <div className="goal-head">
            <span className="goal-name">{g.name}</span>
            <span className={`importance ${g.importance.toLowerCase()}`}>{g.importance} priority</span>
          </div>
          <p className="goal-detail">{money(g.amount)} {g.detail}</p>
          <ProbabilityBar probability={probabilities[g.id]} />
          <FuturesDots probability={probabilities[g.id]} label="reach it" />
        </div>
      ))}
    </div>
  )
}

const mixLabel = (s) => (s <= 0.3 ? 'Steady' : s >= 0.7 ? 'Growth' : 'Balanced')

export default function Planner() {
  const { state, dispatch } = useDemo()
  const { plan, proposal } = state
  const r = usePlanResult(plan)
  const [proposing, setProposing] = useState(false)
  const [amount, setAmount] = useState(FAMILY.smallFund)
  const [use, setUse] = useState('')
  const [why, setWhy] = useState('')

  const locked = proposal && ['submitted', 'reviewed'].includes(proposal.status)
  const set = (patch) => dispatch({ type: 'plan', plan: patch })

  const submit = (e) => {
    e.preventDefault()
    dispatch({
      type: 'submit',
      proposal: { plan: { ...plan }, probabilities: r.probabilities, ending: r.ending, amount: Number(amount), use, why },
    })
    setProposing(false)
    dispatch({ type: 'go', page: 'proposal' })
  }

  return (
    <div className="planner">
      <h1>My plan</h1>
      <p className="lede">
        {money(FAMILY.heirShare, { compact: false })} is set aside for you. Move the sliders to see how your priorities and the family’s long-term wealth affect each other.
      </p>

      {proposal?.status === 'question' && (
        <div className="callout">
          <strong>{FAMILY.parent.name} asked:</strong> “{proposal.parent.message}” Adjust your plan and propose it again.
        </div>
      )}

      <div className="planner-grid">
        <div className="controls">
          <label className="slider">
            <span className="slider-head">
              <span>Travel each year</span>
              <strong>{money(plan.travelPerYear, { compact: false })}</strong>
            </span>
            <input type="range" min={5000} max={50000} step={5000} value={plan.travelPerYear}
              onChange={(e) => set({ travelPerYear: Number(e.target.value) })} />
            <span className="slider-scale"><span>$5,000</span><span>$50,000</span></span>
          </label>

          <label className="slider">
            <span className="slider-head">
              <span>How much goes into stocks</span>
              <strong>{Math.round(plan.stockShare * 100)}% <span className="muted">{mixLabel(plan.stockShare)}</span></strong>
            </span>
            <input type="range" min={0.2} max={0.9} step={0.1} value={plan.stockShare}
              onChange={(e) => set({ stockShare: Number(Number(e.target.value).toFixed(1)) })} />
            <span className="slider-scale"><span>Steadier</span><span>More growth, bigger swings</span></span>
          </label>

          <p className="mix-note">
            Your mix: {Math.round(r.weights.stocks * 100)}% stocks, {Math.round(r.weights.bonds * 100)}% bonds, 10% real estate. It grows about {(expectedReturn(r.weights) * 100).toFixed(1)}% in a typical year.{' '}
            <span className="muted">This is called asset allocation.</span>
          </p>
        </div>

        <GoalCards goals={r.goals} probabilities={r.probabilities} />
      </div>

      <section className="fan-block">
        <h2>Your money over 30 years</h2>
        <p className="muted">The band runs from a bad case to a good case; the line is the typical path. It widens because the future gets less certain the further out we look.</p>
        <FanChart fan={r.fan} marker={{ year: 5, label: 'Studio paid for' }} />
        <p className="assumption">Illustrative assumptions, not a forecast. Ignores inflation and taxes. Based on 1,000 simulated futures.</p>
      </section>

      <section className="propose">
        {locked ? (
          <div className="callout">Your proposal is with {proposal.status === 'submitted' ? FAMILY.advisor.name : FAMILY.parent.name}. You can propose again once they respond.</div>
        ) : proposal?.status === 'approved' ? (
          <div className="callout good">Your plan was approved. You’re now managing the {money(FAMILY.smallFund, { compact: false })} fund.</div>
        ) : !proposing ? (
          <div className="propose-cta">
            <div>
              <h2>Happy with this plan?</h2>
              <p>Propose it with a use for your {money(FAMILY.smallFund, { compact: false })} practice fund. {FAMILY.advisor.name} reviews it, then your mom decides.</p>
            </div>
            <button className="btn primary" onClick={() => setProposing(true)}>Propose this plan</button>
          </div>
        ) : (
          <form className="propose-form" onSubmit={submit}>
            <h2>Propose this plan</h2>
            <label className="field">
              <span>How much of the fund?</span>
              <input type="number" min={1000} max={FAMILY.smallFund} step={1000} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </label>
            <label className="field">
              <span>What should it go into?</span>
              <input type="text" value={use} onChange={(e) => setUse(e.target.value)} required placeholder="For example: a sustainable-energy fund" />
            </label>
            <label className="field">
              <span>Why?</span>
              <textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} required placeholder="What you weighed, and how it fits your goals and the family’s" />
            </label>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setProposing(false)}>Cancel</button>
              <button type="submit" className="btn primary">Send proposal</button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
