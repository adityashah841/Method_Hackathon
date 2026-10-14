import { useMemo, useState } from 'react'
import { useDemo } from '../state.jsx'
import { SCENARIOS } from '../data/demo.js'
import { evaluateScenario, scoreDecision, REASONING_FACTORS } from '../engine/engine.js'
import { FuturesDots, RangeBar, money } from '../components/visuals.jsx'

function ScenarioPicker({ onPick, done }) {
  return (
    <div>
      <h1>Practice</h1>
      <p className="lede">Real situations your family could face. Make a call, explain why, and see how it plays out across 1,000 possible futures.</p>
      <div className="scenario-list">
        {SCENARIOS.map((s) => (
          <button key={s.id} className="scenario-tile" onClick={() => onPick(s.id)}>
            <span className="scenario-title">{s.title}</span>
            <span className="scenario-story">{s.story}</span>
            <span className="scenario-meta">
              {done[s.id] ? `Completed, decision score ${done[s.id].score.total}` : `${s.years}-year outlook`}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Result({ scenario, choiceId, factors, onBack, onRetry }) {
  const results = useMemo(() => evaluateScenario(scenario), [scenario])
  const score = scoreDecision(results, choiceId, factors)
  const mine = results[choiceId]
  const all = Object.values(results)
  const min = Math.min(...all.map((r) => r.p10)) * 0.92
  const max = Math.max(...all.map((r) => r.p90)) * 1.03
  const start = Object.values(scenario.holdings).reduce((a, b) => a + b, 0)

  // A tough future for this choice: what a sound decision can still look like in a bad year.
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
            In one rough future, your choice was worth {money(tough)} after the first year. That’s normal: a sound decision can have a bad stretch.
            Judging by results alone would punish good reasoning for bad luck.
          </p>
        </div>
        <div className="note-block">
          <h3>What to take away</h3>
          <p>{scenario.lesson}</p>
          {best.id !== choiceId && <p className="muted">Strongest across all futures: {best.label.toLowerCase()}.</p>}
        </div>
      </div>

      <div className="actions">
        <button className="btn" onClick={onRetry}>Try a different choice</button>
        <button className="btn primary" onClick={onBack}>Done</button>
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

  const scenario = SCENARIOS.find((s) => s.id === active)

  const reset = () => { setChoice(null); setFactors([]); setWhy(''); setShowResult(false) }

  if (!scenario) {
    return <ScenarioPicker done={state.simulations} onPick={(id) => { reset(); setActive(id) }} />
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
        <input type="text" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: we don’t need this money for 10 years" />
      </label>

      <div className="actions">
        <button className="btn primary" type="submit" disabled={!choice}>See what happens</button>
      </div>
    </form>
  )
}
