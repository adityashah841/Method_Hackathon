import { LADDER } from '../data/demo.js'

export const money = (v, { compact = true } = {}) => {
  if (!compact || Math.abs(v) < 10_000) return '$' + Math.round(v).toLocaleString('en-US')
  if (Math.abs(v) >= 1_000_000) return '$' + (v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, '') + 'M'
  return '$' + Math.round(v / 1000) + 'k'
}

export const outOfTen = (p) => Math.round(p * 10)

// The one way we show uncertainty everywhere: "N in 10 futures".
export function FuturesDots({ probability, label }) {
  const n = outOfTen(probability)
  return (
    <div className="futures" role="img" aria-label={`${n} in 10 futures${label ? ', ' + label : ''}`}>
      <div className="futures-dots" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < n ? 'dot on' : 'dot'} />
        ))}
      </div>
      <span className="futures-text">
        <strong>{n} in 10</strong> futures{label ? ` ${label}` : ''}
      </span>
    </div>
  )
}

// A range from a bad case (10th percentile) to a good case (90th), with
// the typical outcome (median) marked. All bars in a group share one scale.
export function RangeBar({ p10, p50, p90, min, max, highlight, reference }) {
  const pos = (v) => `${((v - min) / (max - min)) * 100}%`
  return (
    <div className={highlight ? 'range highlight' : 'range'}>
      <div className="range-track">
        {reference != null && <span className="range-ref" style={{ left: pos(reference) }} />}
        <span className="range-span" style={{ left: pos(p10), width: `calc(${pos(p90)} - ${pos(p10)})` }} />
        <span className="range-mid" style={{ left: pos(p50) }} />
      </div>
      <div className="range-labels">
        <span>Bad case {money(p10)}</span>
        <span className="range-typical">Typical {money(p50)}</span>
        <span>Good case {money(p90)}</span>
      </div>
    </div>
  )
}

// Wealth over time: the band from bad to good case widens because the
// further out we look, the less certain we can be.
export function FanChart({ fan, height = 260, marker }) {
  const W = 900, H = height, padL = 60, padR = 12, padT = 12, padB = 26
  const maxV = Math.max(...fan.map((f) => f.p90)) * 1.05
  const years = fan.length - 1
  const x = (y) => padL + (y / years) * (W - padL - padR)
  const yv = (v) => padT + (1 - v / maxV) * (H - padT - padB)
  const band =
    fan.map((f, i) => `${i ? 'L' : 'M'}${x(f.year)},${yv(f.p90)}`).join('') +
    [...fan].reverse().map((f) => `L${x(f.year)},${yv(f.p10)}`).join('') + 'Z'
  const mid = fan.map((f, i) => `${i ? 'L' : 'M'}${x(f.year)},${yv(f.p50)}`).join('')
  const ticks = [0, maxV / 2, maxV]
  return (
    <svg className="fan" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Range of possible wealth over 30 years">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={yv(t)} y2={yv(t)} className="fan-grid" />
          <text x={padL - 8} y={yv(t) + 4} textAnchor="end" className="fan-tick">{money(t)}</text>
        </g>
      ))}
      {[0, 10, 20, 30].filter((y) => y <= years).map((y) => (
        <text key={y} x={x(y)} y={H - 6} textAnchor={y === years ? 'end' : y === 0 ? 'start' : 'middle'} className="fan-tick">
          {y === 0 ? 'Today' : `Year ${y}`}
        </text>
      ))}
      <path d={band} className="fan-band" />
      <path d={mid} className="fan-mid" />
      {marker && (
        <g>
          <line x1={x(marker.year)} x2={x(marker.year)} y1={padT} y2={H - padB} className="fan-marker" />
          <text x={x(marker.year) + 6} y={padT + 14} className="fan-tick fan-marker-label">{marker.label}</text>
        </g>
      )}
    </svg>
  )
}

// The signature element: the ladder from Explore to Own.
export function TrustLadder({ level, compact }) {
  return (
    <ol className={compact ? 'ladder compact' : 'ladder'} aria-label={`Trust Ladder, level ${level} of 5`}>
      {[...LADDER].reverse().map((r) => {
        const state = r.level < level ? 'done' : r.level === level ? 'current' : 'ahead'
        return (
          <li key={r.level} className={`rung ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="rung-bar" aria-hidden="true" />
            <span className="rung-name">{r.name}</span>
            {!compact && <span className="rung-unlock">{r.unlock}</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function ProbabilityBar({ probability }) {
  const pct = Math.round(probability * 100)
  const tone = pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low'
  return (
    <div className={`pbar ${tone}`} role="img" aria-label={`${pct}% chance`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
