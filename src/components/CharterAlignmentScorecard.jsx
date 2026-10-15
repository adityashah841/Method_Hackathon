import { useState, useEffect } from 'react'
import { useDemo } from '../state.jsx'
import { evaluateCharterAlignment } from '../engine/gemini.js'

/**
 * Reusable Charter Alignment Scorecard
 * Scores come from fixed rules plus the simulation engine (engine/facts.js);
 * Gemini only rewords the summary and advice. Evaluates Maya's active
 * proposal or custom investment text.
 */
export function CharterAlignmentScorecard({ proposal = null, customThesis = '', compact = false }) {
  const { state, dispatch } = useDemo()
  const [evaluation, setEvaluation] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(!compact)

  const activeProposal = proposal || state.proposal || {
    amount: 25000,
    use: 'clean tech and practice sandbox fund',
    why: 'Balanced growth with planetary sustainability and liquid reserve buffer',
    plan: state.plan,
  }

  // Everything the rule-based score depends on is part of the cache key
  const planKey = `${state.plan?.stockShare}_${state.plan?.travelPerYear}_${state.plan?.extraGoal}_${state.proposal?.status}`
  const cacheKey = customThesis
    ? `thesis_${customThesis.slice(0, 30)}_${planKey}`
    : `proposal_${activeProposal.amount}_${activeProposal.use}_${planKey}`

  useEffect(() => {
    // Check if evaluation already cached in state
    if (state.charterEvaluations?.[cacheKey]) {
      setEvaluation(state.charterEvaluations[cacheKey])
      return
    }

    let isMounted = true
    setIsLoading(true)

    evaluateCharterAlignment({
      proposal: activeProposal,
      charter: state.charter,
      customThesis,
      state,
    }).then((res) => {
      if (isMounted) {
        setEvaluation(res)
        setIsLoading(false)
        dispatch({
          type: 'setCharterEvaluation',
          key: cacheKey,
          evaluation: res,
        })
      }
    }).catch(() => {
      if (isMounted) setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [cacheKey, state.charter])

  const handleManualReevaluate = async () => {
    setIsLoading(true)
    try {
      const res = await evaluateCharterAlignment({
        proposal: activeProposal,
        charter: state.charter,
        customThesis,
        state,
      })
      setEvaluation(res)
      dispatch({
        type: 'setCharterEvaluation',
        key: cacheKey,
        evaluation: res,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !evaluation) {
    return (
      <div className="charter-scorecard card loading">
        <div className="eval-loading-spinner">Checking the plan against the family charter...</div>
      </div>
    )
  }

  const score = evaluation?.overallScore ?? 0
  const isHigh = score >= 80
  const isModerate = score >= 60 && score < 80

  const scoreColor = isHigh ? 'var(--good)' : isModerate ? 'var(--brass)' : 'var(--low)'
  const scoreBg = isHigh ? '#ecfdf5' : isModerate ? '#fefce8' : '#fef2f2'

  return (
    <div className="charter-scorecard card">
      <div className="scorecard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className="charter-icon">📜</span>
          <div>
            <h3 style={{ margin: 0, fontSize: compact ? '1rem' : '1.15rem' }}>
              Family Charter Alignment Score
            </h3>
            <span className="muted small">
              Audited against {state.charter?.length || 5} Carter Family Constitution Principles
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="score-badge-circle"
            style={{ borderColor: scoreColor, background: scoreBg, color: scoreColor }}
          >
            <span className="score-num">{score}%</span>
            <span className="score-label">Aligned</span>
          </div>
          {compact && (
            <button
              className="text-btn small"
              onClick={() => setShowDetails(v => !v)}
            >
              {showDetails ? 'Hide breakdown ▴' : 'View breakdown ▾'}
            </button>
          )}
        </div>
      </div>

      <div className="verdict-banner" style={{ borderLeftColor: scoreColor }}>
        <strong>{evaluation?.verdict || 'Strongly Aligned with Family Constitution'}</strong>
        <p className="small" style={{ margin: '0.25rem 0 0' }}>
          {evaluation?.summary}
        </p>
      </div>

      {showDetails && (
        <div className="scorecard-breakdown">
          {/* Aligned Points */}
          {evaluation?.alignedPoints?.length > 0 && (
            <div className="aligned-section">
              <span className="breakdown-title" style={{ color: 'var(--good)' }}>
                ✓ Principles Honored &amp; Upheld
              </span>
              <ul className="audit-points-list">
                {evaluation.alignedPoints.map((pt, i) => (
                  <li key={i} className="small">{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tension / Boundary Pushing Points */}
          {evaluation?.tensionPoints?.length > 0 && (
            <div className="tension-section" style={{ marginTop: '0.75rem' }}>
              <span className="breakdown-title" style={{ color: 'var(--brass)' }}>
                ⚡ Principles Testing Boundaries (Dialogue Needed)
              </span>
              <ul className="audit-points-list">
                {evaluation.tensionPoints.map((pt, i) => (
                  <li key={i} className="small">{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Advisor Guidance */}
          {evaluation?.advisorGuidance && (
            <div className="advisor-charter-note">
              <span className="note-mini-avatar">JO</span>
              <div>
                <strong>Advisor James Ortiz:</strong>
                <p className="small" style={{ margin: '0.15rem 0 0', fontStyle: 'italic' }}>
                  "{evaluation.advisorGuidance}"
                </p>
              </div>
            </div>
          )}

          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge-gemini" title="Each principle is scored by a fixed rule using the simulation engine's goal odds. Gemini only writes the summary and advice.">
              Score: fixed rules + simulation engine{evaluation?.source === 'gemini' ? ' · Wording: Gemini' : ''}
            </span>
            <button
              className="text-btn small"
              onClick={handleManualReevaluate}
              disabled={isLoading}
            >
              {isLoading ? 'Re-checking...' : '↻ Re-check'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
