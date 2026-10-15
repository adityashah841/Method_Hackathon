import { useMemo, useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, planGoals, planWeights } from '../data/demo.js'
import { simulatePlan, expectedReturn, expectedVolatility } from '../engine/engine.js'
import { FanChart, FuturesDots, ProbabilityBar, money } from '../components/visuals.jsx'
import { Explainer, ExplainBtn } from '../components/Explainer.jsx'
import { CharterAlignmentScorecard } from '../components/CharterAlignmentScorecard.jsx'

export function usePlanResult(plan) {
  return useMemo(() => {
    const goals = planGoals(plan.travelPerYear, plan.extraGoal)
    const weights = planWeights(plan.stockShare)
    const result = simulatePlan({ startWealth: FAMILY.heirShare, weights, goals })
    return { goals, weights, ...result }
  }, [plan.travelPerYear, plan.stockShare, plan.extraGoal])
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

// ---- Scenario presets for comparison mode -----------------------------------
const SCENARIO_PRESETS = [
  { id: 'conservative', label: 'Conservative', stockShare: 0.3, travelPerYear: 15_000, color: 'var(--spruce-soft)', textColor: 'var(--spruce)' },
  { id: 'balanced', label: 'Balanced', stockShare: 0.5, travelPerYear: 20_000, color: 'var(--brass-soft)', textColor: '#7a5813' },
  { id: 'growth', label: 'Growth', stockShare: 0.75, travelPerYear: 25_000, color: '#dae8f0', textColor: '#1a4a6e' },
]

function ScenarioComparison({ currentPlan }) {
  const [scenarios, setScenarios] = useState(SCENARIO_PRESETS.map((p) => ({
    ...p,
    plan: { travelPerYear: p.travelPerYear, stockShare: p.stockShare, extraGoal: null },
  })))
  const [editing, setEditing] = useState(null)

  const results = scenarios.map((s) => {
    const goals = planGoals(s.plan.travelPerYear, null)
    const weights = planWeights(s.plan.stockShare)
    const result = simulatePlan({ startWealth: FAMILY.heirShare, weights, goals })
    return { ...s, goals, weights, result }
  })

  const updateScenario = (id, patch) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, plan: { ...s.plan, ...patch } } : s))
    )
  }

  return (
    <div className="comparison-section">
      <h2>Compare three plans</h2>
      <p className="muted">Adjust each scenario independently to see how different strategies affect your goals and long-term wealth. Numbers are illustrative, based on 1,000 simulated futures.</p>

      <div className="comparison-grid">
        {results.map((s) => (
          <div key={s.id} className="comparison-col" style={{ borderTop: `4px solid ${s.textColor}` }}>
            <div className="comparison-col-header" style={{ background: s.color }}>
              <span className="comparison-col-label" style={{ color: s.textColor }}>{s.label}</span>
              <button className="text-btn" style={{ fontSize: '0.85rem' }} onClick={() => setEditing(editing === s.id ? null : s.id)}>
                {editing === s.id ? 'Done' : 'Edit'}
              </button>
            </div>

            {editing === s.id ? (
              <div className="comparison-col-edit">
                <label className="slider" style={{ marginBottom: '1rem' }}>
                  <span className="slider-head">
                    <span>Stocks</span>
                    <strong>{Math.round(s.plan.stockShare * 100)}%</strong>
                  </span>
                  <input type="range" min={0.2} max={0.9} step={0.1} value={s.plan.stockShare}
                    onChange={(e) => updateScenario(s.id, { stockShare: Number(Number(e.target.value).toFixed(1)) })} />
                  <span className="slider-scale"><span>Steadier</span><span>More growth</span></span>
                </label>
                <label className="slider">
                  <span className="slider-head">
                    <span>Travel / year</span>
                    <strong>{money(s.plan.travelPerYear, { compact: false })}</strong>
                  </span>
                  <input type="range" min={5000} max={50000} step={5000} value={s.plan.travelPerYear}
                    onChange={(e) => updateScenario(s.id, { travelPerYear: Number(e.target.value) })} />
                  <span className="slider-scale"><span>$5k</span><span>$50k</span></span>
                </label>
              </div>
            ) : (
              <div className="comparison-col-stats">
                <div className="comp-stat">
                  <span className="muted">Allocation</span>
                  <strong>{Math.round(s.plan.stockShare * 100)}% stocks</strong>
                </div>
                <div className="comp-stat">
                  <span className="muted">Travel / year</span>
                  <strong>{money(s.plan.travelPerYear, { compact: false })}</strong>
                </div>
                <div className="comp-stat">
                  <span className="muted">Expected return</span>
                  <strong>{(expectedReturn(s.weights) * 100).toFixed(1)}% / yr</strong>
                </div>
                <div className="comp-stat">
                  <span className="muted">Volatility (±)</span>
                  <strong>{(expectedVolatility(s.weights) * 100).toFixed(1)}%</strong>
                </div>
              </div>
            )}

            <div className="comparison-goals">
              {s.goals.slice(0, 3).map((g) => (
                <div key={g.id} className="comp-goal">
                  <span className="comp-goal-name">{g.name}</span>
                  <ProbabilityBar probability={s.result.probabilities[g.id]} />
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    {Math.round(s.result.probabilities[g.id] * 10)} in 10 futures
                  </span>
                </div>
              ))}
            </div>

            <div className="comp-ending">
              <span className="muted">Typical wealth after 30 yr</span>
              <strong>{money(s.result.ending.p50)}</strong>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Bad case: {money(s.result.ending.p10)} · Good: {money(s.result.ending.p90)}
              </span>
            </div>

            <div className="comp-tradeoff">
              {s.plan.stockShare <= 0.3 && (
                <p className="muted small">Lower risk, lower typical growth. Better for short-term goals, but wealth may not keep pace with inflation over 30 years.</p>
              )}
              {s.plan.stockShare > 0.3 && s.plan.stockShare < 0.7 && (
                <p className="muted small">Balanced between stability and growth. Broad diversification across market conditions.</p>
              )}
              {s.plan.stockShare >= 0.7 && (
                <p className="muted small">Stronger long-term growth potential, but larger swings. Make sure liquid reserves are available for near-term goals.</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="assumption">Illustrative comparison only. All three scenarios use the same 1,000 simulated futures, so differences reflect the strategy, not luck. Not a forecast.</p>
    </div>
  )
}

// ---- Contextual explainer entries ------------------------------------------
const EXPLAINER_TOPICS = {
  allocation: {
    q: 'What is asset allocation?',
    a: 'Asset allocation is how you divide your portfolio between different types of investments — stocks, bonds, real estate, and cash. Stocks tend to grow more over long periods but can fall sharply in a bad year. Bonds are steadier but grow more slowly. Mixing them lets you balance growth potential with how much short-term loss you can comfortably absorb.',
  },
  volatility: {
    q: 'What is volatility, and is it the same as loss?',
    a: 'Volatility measures how much an investment\'s value swings up and down. A volatile portfolio can drop 20% in a bad year and recover — that\'s not the same as a permanent loss. Permanent loss happens when a business fails or an asset never recovers. Understanding the difference matters: selling during a volatile downturn can turn a temporary swing into a real loss.',
  },
  diversification: {
    q: 'Why does diversification matter?',
    a: 'Diversification means not putting all your eggs in one basket. Different assets rarely move in exactly the same direction at the same time. When stocks fall, bonds often hold steady or rise. Holding many types of investments means the bad year for one part of your portfolio is partly offset by the rest. It doesn\'t eliminate risk, but it reduces the chance that one bad event wipes out everything.',
  },
  spending: {
    q: 'How does changing my spending affect long-term wealth?',
    a: 'Every dollar spent today is a dollar that can\'t grow for the next 30 years. At 6% annual growth, $20,000 spent now would have grown to about $115,000 in 30 years. That doesn\'t mean you shouldn\'t spend — lifestyle goals matter — but it helps to see the trade-off clearly. The slider lets you experiment with different annual travel amounts to see how the long-term fan chart changes.',
  },
}

export default function Planner() {
  const { state, dispatch } = useDemo()
  const { plan, proposal } = state
  const r = usePlanResult(plan)
  const [proposing, setProposing] = useState(false)
  const [amount, setAmount] = useState(FAMILY.smallFund)
  const [use, setUse] = useState('')
  const [why, setWhy] = useState('')
  const [showComparison, setShowComparison] = useState(false)
  const [explainerTopic, setExplainerTopic] = useState(null)
  const [lastChangedMsg, setLastChangedMsg] = useState(null)

  const locked = proposal && ['submitted', 'reviewed'].includes(proposal.status)
  const set = (patch) => {
    dispatch({ type: 'plan', plan: patch })
    // Contextual feedback when slider changes
    if (patch.stockShare != null) {
      const old = plan.stockShare
      const newer = patch.stockShare
      if (newer > old) {
        setLastChangedMsg('Increasing the stock allocation may improve long-term growth potential, but it can also increase the size of potential losses. Consider whether the plan still supports your need for accessible funds.')
      } else if (newer < old) {
        setLastChangedMsg('Lowering the stock allocation reduces short-term swings, but may slow long-term growth. Make sure this still gives you a reasonable chance of reaching your larger goals.')
      }
    }
    if (patch.travelPerYear != null) {
      const old = plan.travelPerYear
      const newer = patch.travelPerYear
      if (newer > old) {
        setLastChangedMsg(`Spending ${money(newer, { compact: false })} a year means less remains to grow over time. The long-term fan chart will narrow at the top — check whether the studio goal probability changes significantly.`)
      } else if (newer < old) {
        setLastChangedMsg(`Reducing travel spending to ${money(newer, { compact: false })} a year preserves more wealth for long-term goals. You'll see the wealth fan widen toward the upside.`)
      }
    }
  }

  const submit = (e) => {
    e.preventDefault()
    dispatch({
      type: 'submit',
      proposal: { plan: { ...plan }, probabilities: r.probabilities, ending: r.ending, amount: Number(amount), use, why },
    })
    setProposing(false)
    dispatch({ type: 'go', page: 'decisions' })
  }

  return (
    <div className="planner">
      <h1>My plan</h1>
      <p className="lede">
        {money(FAMILY.heirShare, { compact: false })} is set aside for you. Move the sliders to see how your priorities and the family's long-term wealth affect each other.
      </p>

      {proposal?.status === 'question' && (
        <div className="callout">
          <strong>{FAMILY.parent.name} asked:</strong> "{proposal.parent.message}" Adjust your plan and propose it again.
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

          {lastChangedMsg && (
            <div className="slider-feedback">
              <span className="feedback-icon" aria-hidden="true">ℹ</span>
              <p>{lastChangedMsg}</p>
            </div>
          )}

          <div className="explainer-btns">
            <ExplainBtn label="What is asset allocation?" onClick={() => setExplainerTopic('allocation')} />
            <ExplainBtn label="Volatility vs. loss" onClick={() => setExplainerTopic('volatility')} />
            <ExplainBtn label="Why diversify?" onClick={() => setExplainerTopic('diversification')} />
            <ExplainBtn label="How spending affects wealth" onClick={() => setExplainerTopic('spending')} />
          </div>
        </div>

        <GoalCards goals={r.goals} probabilities={r.probabilities} />
      </div>

      {explainerTopic && (
        <Explainer
          topic={EXPLAINER_TOPICS[explainerTopic]}
          onClose={() => setExplainerTopic(null)}
          onRelated={(t) => setExplainerTopic(t)}
          related={Object.entries(EXPLAINER_TOPICS)
            .filter(([k]) => k !== explainerTopic)
            .map(([k, v]) => ({ id: k, q: v.q }))}
        />
      )}

      <section className="fan-block">
        <h2>Your money over 30 years</h2>
        <p className="muted">The band runs from a bad case to a good case; the line is the typical path. It widens because the future gets less certain the further out we look.</p>
        <FanChart fan={r.fan} marker={{ year: 5, label: 'Studio paid for' }} />
        <p className="assumption">Illustrative assumptions, not a forecast. Ignores inflation and taxes. Based on 1,000 simulated futures.</p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Compare scenarios</h2>
          <button className="btn" onClick={() => setShowComparison((v) => !v)}>
            {showComparison ? 'Hide comparison' : 'Compare 3 plans'}
          </button>
        </div>
        {showComparison && <ScenarioComparison currentPlan={plan} />}
      </section>

      <section style={{ marginTop: '2rem' }}>
        <CharterAlignmentScorecard compact={true} />
      </section>

      <section className="propose">
        {locked ? (
          <div className="callout">Your proposal is with {proposal.status === 'submitted' ? FAMILY.advisor.name : FAMILY.parent.name}. You can propose again once they respond.</div>
        ) : proposal?.status === 'approved' ? (
          <div className="callout good">Your plan was approved. You're now managing the {money(FAMILY.smallFund, { compact: false })} fund.</div>
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
            <p className="muted">Your proposal includes: {Math.round(plan.stockShare * 100)}% stocks · Travel {money(plan.travelPerYear, { compact: false })} / year</p>
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
              <textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} required placeholder="What you weighed, and how it fits your goals and the family's" />
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
