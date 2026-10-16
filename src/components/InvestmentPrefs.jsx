import { useEffect, useRef, useState } from 'react'
import { INVESTMENT_OPTIONS, CAPS } from '../engine/allocate.js'

// Popup that asks Maya what she would like to invest in. Her picks become
// sliders on My plan, and the suggested mix is built from them.
export default function InvestmentPrefs({ initialPicks, busy, onConfirm, onClose, closeLabel = 'Cancel' }) {
  const [picks, setPicks] = useState(initialPicks)
  const first = useRef(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (id) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const ordered = INVESTMENT_OPTIONS.map((o) => o.id).filter((id) => picks.includes(id))

  return (
    <div className="prefs-overlay" role="dialog" aria-modal="true" aria-labelledby="prefs-title">
      <div className="prefs-modal">
        <div className="prefs-head">
          <h2 id="prefs-title">What would you like to invest in?</h2>
          <p className="muted">
            Pick everything that interests you. We’ll build a starting plan around your picks that gives your goals the best odds, within the family’s guardrails.
          </p>
        </div>

        <div className="prefs-grid">
          {INVESTMENT_OPTIONS.map((o, i) => {
            const on = picks.includes(o.id)
            return (
              <label key={o.id} className={on ? 'prefs-option on' : 'prefs-option'}>
                <input ref={i === 0 ? first : null} type="checkbox" checked={on} onChange={() => toggle(o.id)} />
                <span className="prefs-option-top">
                  <span className="prefs-swatch" style={{ background: o.color }} aria-hidden="true" />
                  <span className="prefs-label">{o.label}</span>
                  <span className="prefs-tag">{o.tag}</span>
                </span>
                <span className="prefs-blurb">{o.blurb}</span>
                {o.kind === 'alt' && <span className="prefs-cap">Up to {CAPS[o.id]}% of your plan</span>}
              </label>
            )
          })}
        </div>

        <div className="prefs-foot">
          <span className="muted">{ordered.length < 2 ? 'Pick at least two to build a mix.' : `${ordered.length} picked`}</span>
          <div className="actions" style={{ marginTop: 0 }}>
            {onClose && <button type="button" className="btn" onClick={onClose}>{closeLabel}</button>}
            <button type="button" className="btn primary" disabled={ordered.length < 2 || busy} onClick={() => onConfirm(ordered)}>
              {busy ? 'Building your plan…' : 'Build my plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
