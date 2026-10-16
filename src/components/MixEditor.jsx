import { OPTION_BY_ID, CAPS, guardrailIssues, rebalance } from '../engine/allocate.js'
import { money } from './visuals.jsx'

// One linked slider per investment Maya picked. Moving one slider
// rescales the others so the plan always adds up to 100%.
export default function MixEditor({ alloc, total, onChange, disabled }) {
  const keys = Object.keys(alloc)
  const sum = keys.reduce((a, k) => a + alloc[k], 0)
  const issues = guardrailIssues(alloc)

  return (
    <div className="mix-editor">
      <div className="mix-bar" role="img" aria-label={keys.map((k) => `${OPTION_BY_ID[k].label} ${alloc[k]}%`).join(', ')}>
        {keys.filter((k) => alloc[k] > 0).map((k) => (
          <span key={k} style={{ width: `${alloc[k]}%`, background: OPTION_BY_ID[k].color }} title={`${OPTION_BY_ID[k].label} ${alloc[k]}%`} />
        ))}
      </div>

      <div className="mix-sliders">
        {keys.map((k) => {
          const o = OPTION_BY_ID[k]
          const over = alloc[k] > (CAPS[k] ?? 100)
          return (
            <label key={k} className={over ? 'mix-slider over' : 'mix-slider'}>
              <span className="mix-slider-head">
                <span className="mix-name">
                  <span className="prefs-swatch" style={{ background: o.color }} aria-hidden="true" />
                  {o.label}
                </span>
                <span className="mix-value">
                  <strong>{alloc[k]}%</strong>
                  <span className="muted">{money((alloc[k] / 100) * total)}</span>
                </span>
              </span>
              <input
                type="range" min={0} max={100} step={5} value={alloc[k]} disabled={disabled}
                aria-label={`${o.label} share of the plan`}
                onChange={(e) => onChange(rebalance(alloc, k, Number(e.target.value)), k)}
              />
              {over && <span className="mix-warn">Above the family guardrail of {CAPS[k]}%</span>}
            </label>
          )
        })}
      </div>

      <p className="mix-total">
        Total <strong>{sum}%</strong>
        {issues.length === 0
          ? <span className="mix-ok"> · Within the family guardrails</span>
          : <span className="mix-issue"> · {issues.join('; ')}</span>}
      </p>
    </div>
  )
}
