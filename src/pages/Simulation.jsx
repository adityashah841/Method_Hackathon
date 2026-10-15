import { useMemo, useState } from 'react'
import { useDemo } from '../state.jsx'
import { SCENARIOS } from '../data/demo.js'
import { evaluateScenario, scoreDecision, REASONING_FACTORS } from '../engine/engine.js'
import { FuturesDots, RangeBar, money } from '../components/visuals.jsx'
import { Explainer, ExplainBtn } from '../components/Explainer.jsx'

// Tag -> difficulty label
const TAG_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const difficultyTag = (s) => s.tags?.find((t) => TAG_LABELS[t]) || 'beginner'

function ScenarioPicker({ onPick, done }) {
  return (
    <div>
      <h1>Practice</h1>
      <p className="lede">Real situations your family could face. Make a call, explain why, and see how it plays out across 1,000 possible futures.</p>

      <div className="scenario-list">
        {SCENARIOS.map((s) => {
          const difficulty = difficultyTag(s)
          return (
            <button key={s.id} className="scenario-tile" onClick={() => onPick(s.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                <span className="scenario-title">{s.title}</span>
                <span className={`difficulty-tag difficulty-${difficulty}`}>{TAG_LABELS[difficulty]}</span>
              </div>
              <span className="scenario-story">{s.story}</span>
              <span className="scenario-meta">
                {done[s.id] ? `Completed, decision score ${done[s.id].score.total}` : `${s.years}-year outlook`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Contextual explainer content for scenario results
const RESULT_EXPLAINERS = {
  'market-drop': {
    q: 'Why is selling after a market drop risky?',
    a: 'When you sell after a drop, you lock in the loss permanently. Markets have historically recovered from most downturns over time. If you\'re not invested during the recovery, you miss it. This is sometimes called "sequence of returns risk" — the timing of bad years matters as much as the magnitude.',
  },
  'concentration': {
    q: 'What is concentration risk?',
    a: 'Concentration risk means a large portion of your wealth depends on a single company or asset. If that one holding does badly, the whole portfolio suffers proportionally. Individual stocks typically have two to three times the volatility of a diversified index. Diversifying reduces this risk while often capturing most of the long-term return.',
  },
  'business-withdrawal': {
    q: 'What are the trade-offs of funding a business from your portfolio?',
    a: 'Using portfolio funds to start a business means giving up the compounding growth of those funds. In exchange, you get concentrated ownership of a potentially higher-return asset — but one with far more uncertainty. The opportunity cost is real: $300k invested at 7% annually grows to over $2M in 30 years. A staged investment limits the downside while you validate the idea.',
  },
  'inflation': {
    q: 'Why does inflation hurt bonds more than stocks?',
    a: 'Bonds pay fixed interest. When inflation rises, that fixed payment buys less in real terms — so the real return shrinks or even turns negative. Stocks represent ownership in companies, which can raise prices and profits along with inflation. Real assets like property also tend to keep pace with inflation. This is why long-term portfolios typically hold more stocks than bonds.',
  },
  'family-liquidity': {
    q: 'What is liquidity risk and how should I manage it?',
    a: 'Liquidity risk is the risk that you need cash right when your investments are down. The classic mistake is holding everything in illiquid investments and then being forced to sell at a bad time. Keeping some cash or short-term bonds as a "liquidity buffer" means you can cover unexpected needs without disrupting the rest of your portfolio.',
  },
  'underperformance': {
    q: 'What does "mean reversion" mean?',
    a: 'Mean reversion is the idea that asset prices and returns tend to drift back toward long-run historical averages over time. An asset that has underperformed for a few years isn\'t necessarily broken — it may simply be lagging before catching up. This is one reason financial planners often caution against selling underperformers too quickly, though it\'s not guaranteed to happen.',
  },
}

function Result({ scenario, choiceId, factors, onBack, onRetry }) {
  const results = useMemo(() => evaluateScenario(scenario), [scenario])
  const score = scoreDecision(results, choiceId, factors)
  const mine = results[choiceId]
  const all = Object.values(results)
  const min = Math.min(...all.map((r) => r.p10)) * 0.92
  const max = Math.max(...all.map((r) => r.p90)) * 1.03
  const start = Object.values(scenario.holdings).reduce((a, b) => a + b, 0)
  const [showExplainer, setShowExplainer] = useState(false)

  const tough = useMemo(() => {
    const afterOne = mine.paths.map((t, i) => [t[1], i]).sort((a, b) => a[0] - b[0])
    const [val] = afterOne[Math.floor(afterOne.length * 0.15)]
    return val
  }, [mine])

  const chosen = scenario.choices.find((c) => c.id === choiceId)
  const best = scenario.choices.find((c) => c.id === score.bestId)

  return (
    <div className="result">
      <button className="text-btn back" onClick={onBack}>Back to scenarios</button>
      <h1>{scenario.title}</h1>
      <p className="lede">You chose: <strong>{chosen.label.toLowerCase()}</strong>.</p>

      <div className="score-card">
        <div className="score-total">
          <span className="score-number">{score.total}</span>
          <span className="score-of">decision score out of 100</span>
        </div>
        <dl className="score-parts">
          <div><dt>Outcome quality</dt><dd>{score.outcome} / 50</dd></div>
          <div><dt>Fits family goals</dt><dd>{score.goalFit} / 30</dd></div>
          <div><dt>Reasoning</dt><dd>{score.reasoning} / 20</dd></div>
        </dl>
        <p className="score-note">
          We score the decision, not the luck. Every choice was tested on the same 1,000 futures, so this score holds no matter what the market does next.
          {score.missedFactors.length > 0 && ` Next time, also weigh: ${score.missedFactors.map((f) => f.label.toLowerCase()).join(', ')}.`}
        </p>
      </div>

      <h2>How each choice plays out after {scenario.years} years</h2>
      <p className="muted">Each bar runs from a bad case to a good case. The mark is the typical result. The thin line is where you started ({money(start)}).</p>
      <div className="compare">
        {scenario.choices.map((c) => {
          const r = results[c.id]
          return (
            <div key={c.id} className={c.id === choiceId ? 'compare-row mine' : 'compare-row'}>
              <div className="compare-head">
                <span className="compare-name">{c.label}{c.id === choiceId && <em className="tag">Your choice</em>}</span>
                {c.id === score.bestId && c.id !== choiceId && <em className="tag" style={{ background: '#dcefe4', color: 'var(--good)' }}>Strongest overall</em>}
              </div>
              <RangeBar p10={r.p10} p50={r.p50} p90={r.p90} min={min} max={max} highlight={c.id === choiceId} reference={start} />
              <FuturesDots probability={r.goalChance} label={scenario.goalLabel} />
            </div>
          )
        })}
      </div>

      <div className="two-up">
        <div className="note-block">
          <h3>A tough year can still happen</h3>
          <p>
            In one rough future, your choice was worth {money(tough)} after the first year. That's normal: a sound decision can have a bad stretch.
            Judging by results alone would punish good reasoning for bad luck.
          </p>
        </div>
        <div className="note-block">
          <h3>What to take away</h3>
          <p>{scenario.lesson}</p>
          {best.id !== choiceId && <p className="muted">Strongest across all futures: {best.label.toLowerCase()}.</p>}
        </div>
      </div>

      {RESULT_EXPLAINERS[scenario.id] && (
        <div style={{ margin: '1.5rem 0' }}>
          <Explainer
            topic={RESULT_EXPLAINERS[scenario.id]}
            onClose={() => setShowExplainer(false)}
          />
        </div>
      )}

      <div className="actions">
        <button className="btn" type="button" onClick={onRetry}>Try a different choice</button>
        <button className="btn primary" type="button" onClick={onBack}>Done</button>
      </div>
    </div>
  )
}

export default function Simulation() {
  const { state, dispatch } = useDemo()
  const [active, setActive] = useState(null)
  const [choice, setChoice] = useState(null)
  const [factors, setFactors] = useState([])
  const [why, setWhy] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [showScenarioExplainer, setShowScenarioExplainer] = useState(false)

  const scenario = SCENARIOS.find((s) => s.id === active)
  const reset = () => { setChoice(null); setFactors([]); setWhy(''); setShowResult(false); setShowScenarioExplainer(false) }

  if (!scenario) {
    return (
      <ScenarioPicker
        done={state.simulations}
        onPick={(id) => { reset(); setActive(id) }}
      />
    )
  }

  if (showResult) {
    return (
      <Result
        scenario={scenario}
        choiceId={choice}
        factors={factors}
        onBack={() => { setActive(null); reset() }}
        onRetry={reset}
      />
    )
  }

  const submit = (e) => {
    e.preventDefault()
    const results = evaluateScenario(scenario)
    const score = scoreDecision(results, choice, factors)
    dispatch({ type: 'simulation', id: scenario.id, result: { choiceId: choice, factors, why, score, at: Date.now() } })
    setShowResult(true)
  }

  const toggle = (id) => setFactors((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  return (
    <form className="scenario" onSubmit={submit}>
      <button type="button" className="text-btn back" onClick={() => setActive(null)}>Back to scenarios</button>
      <h1>{scenario.title}</h1>
      <p className="story">{scenario.story}</p>

      {RESULT_EXPLAINERS[scenario.id] && (
        <div style={{ marginBottom: '1.25rem' }}>
          <ExplainBtn
            label={`Ask explainer: ${RESULT_EXPLAINERS[scenario.id].q}`}
            onClick={() => setShowScenarioExplainer((v) => !v)}
          />
          {showScenarioExplainer && (
            <div style={{ marginTop: '0.75rem' }}>
              <Explainer
                topic={RESULT_EXPLAINERS[scenario.id]}
                onClose={() => setShowScenarioExplainer(false)}
              />
            </div>
          )}
        </div>
      )}

      <div className="scenario-context">
        <h3>Portfolio at a glance</h3>
        <div className="holdings-row">
          {Object.entries(scenario.holdings).map(([asset, val]) => (
            <div key={asset} className="holding-chip">
              <span className="holding-name">{asset.replace(/([A-Z])/g, ' $1').replace('family Co', 'Family Co')}</span>
              <span className="holding-val">{money(val)}</span>
            </div>
          ))}
          <div className="holding-chip total">
            <span className="holding-name">Total</span>
            <span className="holding-val">{money(Object.values(scenario.holdings).reduce((a, b) => a + b, 0))}</span>
          </div>
        </div>
      </div>

      <fieldset className="choices">
        <legend>What do you suggest?</legend>
        {scenario.choices.map((c) => (
          <label key={c.id} className={choice === c.id ? 'choice selected' : 'choice'}>
            <input type="radio" name="choice" value={c.id} checked={choice === c.id} onChange={() => setChoice(c.id)} />
            <span className="choice-label">{c.label}</span>
            <span className="choice-hint">{c.hint}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="factors">
        <legend>What did you think about?</legend>
        <p className="muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Select all that apply. Thorough reasoning scores higher.</p>
        <div className="factor-list">
          {REASONING_FACTORS.map((f) => (
            <label key={f.id} className={factors.includes(f.id) ? 'chip on' : 'chip'}>
              <input type="checkbox" checked={factors.includes(f.id)} onChange={() => toggle(f.id)} />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Why did you choose this? <span className="muted">(one line)</span></span>
        <input type="text" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: we don't need this money for 10 years" />
      </label>

      <div className="actions">
        <button className="btn primary" type="submit" disabled={!choice}>See what happens</button>
      </div>
    </form>
  )
}
