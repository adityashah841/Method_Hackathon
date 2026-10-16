import { useMemo, useRef, useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY, planGoals, planWeights } from '../data/demo.js'
import { simulatePlan, expectedReturn } from '../engine/engine.js'
import { suggestAllocation, describeMix, OPTION_BY_ID } from '../engine/allocate.js'
import { FanChart, FuturesDots, ProbabilityBar, money } from '../components/visuals.jsx'
import { Explainer, ExplainBtn } from '../components/Explainer.jsx'
import InvestmentPrefs from '../components/InvestmentPrefs.jsx'
import MixEditor from '../components/MixEditor.jsx'

export function usePlanResult(plan) {
  const allocKey = JSON.stringify(plan.alloc)
  return useMemo(() => {
    const goals = planGoals(plan.travelPerYear, plan.extraGoal)
    const weights = planWeights(plan)
    const result = simulatePlan({ startWealth: FAMILY.heirShare, weights, goals })
    return { goals, weights, ...result }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.travelPerYear, allocKey, plan.extraGoal])
}

const ease = (t) => 1 - Math.pow(1 - t, 3)
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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
  const [explainerTopic, setExplainerTopic] = useState(null)
  const [lastChangedMsg, setLastChangedMsg] = useState(null)
  const [showPrefs, setShowPrefs] = useState(!plan.prefsChosen)
  const [busy, setBusy] = useState(false)
  const [anim, setAnim] = useState(null) // slider values while animating to a suggested mix
  const [suggested, setSuggested] = useState(null)
  const frame = useRef(0)

  // Move the sliders to a new mix, animated, then save it.
  const animateTo = (target, picks) => {
    const from = plan.alloc
    const save = () => {
      dispatch({ type: 'plan', plan: { alloc: target, picks, prefsChosen: true } })
      setAnim(null)
    }
    if (reducedMotion()) return save()
    cancelAnimationFrame(frame.current)
    const t0 = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 800)
      const k = ease(t)
      setAnim(Object.fromEntries(Object.keys(target).map((key) => [key, Math.round((from[key] || 0) + ((target[key] - (from[key] || 0)) * k))])))
      if (t < 1) frame.current = requestAnimationFrame(step)
      else save()
    }
    frame.current = requestAnimationFrame(step)
  }

  // The formula: search for the mix of Maya's picks with the best goal odds
  const buildPlan = (picks) => {
    setBusy(true)
    setTimeout(() => {
      const goals = planGoals(plan.travelPerYear, plan.extraGoal)
      const target = suggestAllocation({ picks, goals, startWealth: FAMILY.heirShare })
      setBusy(false)
      setShowPrefs(false)
      setSuggested(describeMix(target))
      setLastChangedMsg(null)
      animateTo(target, picks)
    }, 30)
  }

  const changeMix = (next, movedKey) => {
    const o = OPTION_BY_ID[movedKey]
    const up = next[movedKey] > plan.alloc[movedKey]
    const risky = ['stocks', 'privateEquity', 'art', 'cars', 'crypto'].includes(movedKey)
    setSuggested(null)
    setLastChangedMsg(
      `${o.label} is now ${next[movedKey]}%. The other investments shifted to keep the total at 100%. ` +
      (up === risky
        ? 'This leans toward growth: higher potential, but bigger swings. Watch the family wealth goal.'
        : 'This leans toward steadiness: smaller swings, but slower growth. Watch your studio goal.')
    )
    dispatch({ type: 'plan', plan: { alloc: next } })
  }

  const locked = proposal && ['submitted', 'reviewed'].includes(proposal.status)
  const set = (patch) => {
    dispatch({ type: 'plan', plan: patch })
    // Contextual feedback when slider changes
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
    dispatch({ type: 'go', page: 'proposal' })
  }

  return (
    <div className="planner">
      <h1>My plan</h1>
      <p className="lede">
        {money(FAMILY.heirShare, { compact: false })} is set aside for you. Choose what to invest in and how much travel you want, and see how your priorities and the family's long-term wealth affect each other.
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

          <div className="mix-section">
            <div className="mix-section-head">
              <h2>Your investment mix</h2>
              <button type="button" className="text-btn" onClick={() => setShowPrefs(true)}>Change investments</button>
            </div>
            {suggested && (
              <p className="mix-suggested">
                Suggested for your goals: {suggested}. This mix gave your goals the best odds within the family’s guardrails. Adjust any slider to explore.
              </p>
            )}
            <MixEditor alloc={anim || plan.alloc} total={FAMILY.heirShare} disabled={!!anim} onChange={changeMix} />
            <div className="mix-actions">
              <button type="button" className="btn" disabled={busy || !!anim} onClick={() => buildPlan(plan.picks || Object.keys(plan.alloc))}>
                {busy ? 'Finding the best mix…' : 'Suggest a mix for my goals'}
              </button>
            </div>
            <p className="mix-note">
              It grows about {(expectedReturn(r.weights) * 100).toFixed(1)}% in a typical year.{' '}
              <span className="muted">How you split money across investments is called asset allocation.</span>
            </p>
          </div>

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

        <div className="goals-col">
          <GoalCards goals={r.goals} probabilities={r.probabilities} />
        </div>
      </div>

      {showPrefs && (
        <InvestmentPrefs
          initialPicks={plan.picks || Object.keys(plan.alloc)}
          busy={busy}
          onConfirm={buildPlan}
          closeLabel={plan.prefsChosen ? 'Cancel' : 'Skip for now'}
          onClose={() => {
            if (!plan.prefsChosen) dispatch({ type: 'plan', plan: { prefsChosen: true } })
            setShowPrefs(false)
          }}
        />
      )}

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
            <p className="muted">Your proposal includes: {describeMix(plan.alloc)} · Travel {money(plan.travelPerYear, { compact: false })} / year</p>
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
