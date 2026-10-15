import { useState } from 'react'
import { useDemo, DEFAULT_REPORT_RECORD } from '../state.jsx'
import { FAMILY } from '../data/demo.js'
import { generateDualLensBriefing } from '../engine/gemini.js'

// Simple default briefing for instant render before generation
const FALLBACK_BRIEFING = DEFAULT_REPORT_RECORD

/**
 * Advisor Notes & Records Component (for HeirHome and ParentHome)
 */
export function AdvisorNotesAndRecords({ role = 'heir' }) {
  const { state, dispatch } = useDemo()
  const records = state.advisorRecords && state.advisorRecords.length > 0
    ? state.advisorRecords
    : [FALLBACK_BRIEFING]

  const [selectedRecordId, setSelectedRecordId] = useState(records[0]?.id || 'report-initial')
  const [showMayaLens, setShowMayaLens] = useState(false)

  // Keep selected record in sync if new ones are added
  const activeRecord = records.find(r => r.id === selectedRecordId) || records[0]

  const isHeir = role === 'heir'
  const isUnread = isHeir ? activeRecord?.unreadHeir : activeRecord?.unreadParent

  const formatTimestamp = (ts) => {
    if (!ts) return 'Recent update'
    const date = new Date(ts)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const markRead = () => {
    if (activeRecord?.id) {
      dispatch({
        type: 'markAdvisorRecordRead',
        id: activeRecord.id,
        role,
      })
    }
  }

  const heirContent = activeRecord?.heirBriefing || FALLBACK_BRIEFING.heirBriefing
  const parentContent = activeRecord?.parentBriefing || FALLBACK_BRIEFING.parentBriefing

  return (
    <section className="advisor-records-section" id="advisor-notes-section">
      {/* Top Notification Banner if Unread */}
      {isUnread && (
        <div className="new-report-alert card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="alert-bell-icon">🔔</span>
            <div>
              <strong>New Report from Advisor {FAMILY.advisor.name}</strong>
              <p className="small muted" style={{ margin: '0.15rem 0 0' }}>
                "{activeRecord.title || heirContent.headline}" · Received {formatTimestamp(activeRecord.timestamp)}
              </p>
            </div>
          </div>
          <button className="btn small primary" onClick={markRead}>
            Mark as Reviewed
          </button>
        </div>
      )}

      {/* Main Section Header */}
      <div className="section-head-gemini" style={{ marginTop: '1.5rem' }}>
        <div>
          <span className="kicker-gemini">Official Advisor Dispatch</span>
          <h2 style={{ margin: '0.25rem 0' }}>Notes &amp; Records from Advisor</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Quarterly briefings written for you, with every figure from the simulation engine, from {FAMILY.advisor.name} ({FAMILY.firm})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isHeir && (
            <button
              className={`btn small ${showMayaLens ? 'primary' : 'outline'}`}
              onClick={() => setShowMayaLens(v => !v)}
            >
              {showMayaLens ? '✓ Viewing Maya\'s Lens' : '👁️ Preview Maya\'s Lens'}
            </button>
          )}
          {isUnread && (
            <span className="badge-new-message">🔴 NEW MESSAGE</span>
          )}
        </div>
      </div>

      {/* Record Selector Tabs if multiple reports exist */}
      {records.length > 1 && (
        <div className="records-tabs-row">
          <span className="muted small" style={{ fontWeight: 700 }}>Record History:</span>
          {records.map((rec, idx) => {
            const unread = isHeir ? rec.unreadHeir : rec.unreadParent
            const isSelected = rec.id === activeRecord.id
            return (
              <button
                key={rec.id || idx}
                className={`record-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedRecordId(rec.id)
                  if (unread) {
                    dispatch({ type: 'markAdvisorRecordRead', id: rec.id, role })
                  }
                }}
              >
                <span>{rec.focusArea || `Report #${records.length - idx}`}</span>
                <span className="record-date-badge">{formatTimestamp(rec.timestamp)}</span>
                {unread && <span className="unread-dot" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Active Record Detail Card */}
      <div className="record-detail-card card">
        <div className="record-card-topbar">
          <div className="advisor-author-tag">
            <span className="author-avatar">JO</span>
            <div>
              <strong>{FAMILY.advisor.name}</strong>
              <span className="muted small" style={{ display: 'block' }}>Senior Wealth Advisor · {FAMILY.firm}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="record-timestamp-pill">📅 {formatTimestamp(activeRecord.timestamp)}</span>
            {activeRecord.focusArea && (
              <span className="focus-pill">#{activeRecord.focusArea}</span>
            )}
            {isUnread ? (
              <button className="btn small outline" onClick={markRead}>
                Mark as Reviewed
              </button>
            ) : (
              <span className="reviewed-badge">✓ Reviewed</span>
            )}
          </div>
        </div>

        {/* Advisor's Direct Note to the Family */}
        {activeRecord.advisorNote && (
          <div className="advisor-note-callout">
            <span className="note-quote-icon">❝</span>
            <div>
              <strong>Advisor's Direct Note for the Carter Family:</strong>
              <p style={{ margin: '0.25rem 0 0', fontStyle: 'italic' }}>
                "{activeRecord.advisorNote}"
              </p>
            </div>
          </div>
        )}

        {/* Heir Content View */}
        {isHeir && (
          <div>
            <div style={{ marginTop: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem' }}>{heirContent.headline}</h3>
              <p className="summary-text">{heirContent.summary}</p>
            </div>

            <div className="card summary-card">
              <div className="impact-box">
                <span className="impact-icon">🌱</span>
                <div>
                  <strong>Sustainability &amp; Family Values</strong>
                  <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{heirContent.impactHighlight}</p>
                </div>
              </div>

              <div className="milestone-box" style={{ marginTop: '0.75rem' }}>
                <span className="impact-icon">🎯</span>
                <div>
                  <strong>Your Design Studio Goal</strong>
                  <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{heirContent.milestoneImpact}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parent Content View */}
        {!isHeir && (
          <div>
            <div style={{ marginTop: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem' }}>{parentContent.headline}</h3>
              <p className="summary-text">{parentContent.fiduciarySummary}</p>
            </div>

            {showMayaLens && (
              <div className="lens-preview-banner card" style={{ background: 'var(--spruce-soft)', borderColor: 'var(--primary)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong>Transparency View: What Maya Was Sent</strong>
                  <span className="badge-gemini">Next-Gen Educational Translation</span>
                </div>
                <blockquote className="ask-why" style={{ margin: 0 }}>
                  <p><strong>Maya's Headline:</strong> {heirContent.headline}</p>
                  <p style={{ marginTop: '0.5rem' }}>"{heirContent.summary}"</p>
                </blockquote>
              </div>
            )}

            <div className="briefing-cards-grid">
              <div className="card summary-card">
                <div className="parent-metric-row" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <div className="parent-metric-item">
                    <span className="muted small">Capital Preservation Stress Test</span>
                    <p className="small" style={{ margin: '0.25rem 0 0' }}>{parentContent.capitalPreservation}</p>
                  </div>
                  <div className="parent-metric-item">
                    <span className="muted small">Tax Strategy &amp; Offset</span>
                    <p className="small" style={{ margin: '0.25rem 0 0' }}>{parentContent.taxStrategy}</p>
                  </div>
                </div>

                <div className="readiness-affirmation" style={{ marginTop: '1rem' }}>
                  <span className="impact-icon">🛡️</span>
                  <div>
                    <strong>Maya's Governance Readiness Note</strong>
                    <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{parentContent.readinessNote}</p>
                  </div>
                </div>
              </div>

              <div className="sidebar-cards-col">
                <div className="card talking-points-card">
                  <h3>Family Council Agenda Points</h3>
                  <p className="muted small">Suggested items for your next meeting with {FAMILY.advisor.name}:</p>
                  <ul className="bullet-list" style={{ marginTop: '0.5rem' }}>
                    {(parentContent.talkingPoints || []).map((pt, i) => (
                      <li key={i} className="small">{pt}</li>
                    ))}
                  </ul>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// Backward compatible aliases
export const HeirBriefingSection = () => <AdvisorNotesAndRecords role="heir" />
export const ParentBriefingSection = () => <AdvisorNotesAndRecords role="parent" />

/**
 * Advisor Studio & Persona Tuner (for AdvisorDashboard.jsx)
 */
export function AdvisorBriefingStudio() {
  const { state, dispatch } = useDemo()
  const [focusArea, setFocusArea] = useState('Clean Energy & Studio Milestone')
  const [advisorTone, setAdvisorTone] = useState('Encouraging & Mentoring')
  const [customNote, setCustomNote] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [publishedToast, setPublishedToast] = useState(false)

  const FOCUS_OPTIONS = [
    'Clean Energy & Studio Milestone',
    'Capital Preservation & Volatility Buffer',
    'Level 2 Practice Fund Governance',
    'Tax-Loss Harvesting & Year-End Rebalancing'
  ]

  const TONE_OPTIONS = [
    'Encouraging & Mentoring',
    'Direct & Analytical',
    'Prudent & Risk-Conscious',
    'Conversational & Visionary'
  ]

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const generated = await generateDualLensBriefing({
        advisorNote: customNote,
        focusArea,
        advisorTone,
        state,
      })

      dispatch({
        type: 'publishAdvisorBriefing',
        briefing: generated,
        focusArea,
        advisorTone,
        advisorNote: customNote,
      })

      setPublishedToast(true)
      setTimeout(() => setPublishedToast(false), 4000)
    } catch (err) {
      console.error('Failed to generate briefing:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const current = state.briefing || FALLBACK_BRIEFING

  return (
    <div className="advisor-studio card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span className="badge-gemini" style={{ marginBottom: '0.25rem', display: 'inline-block' }}>✨ Gemini 2.5 Flash Persona Engine</span>
          <h2 style={{ margin: 0 }}>Advisor AI Scribe: Multi-Audience Briefing Studio</h2>
          <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
            Draft once, dynamically personalize for Elena (fiduciary preservation) and Maya (plain-English empowerment).
          </p>
        </div>
        {publishedToast && (
          <div className="toast-success">
            ✓ Published to Elena &amp; Maya's Portals!
          </div>
        )}
      </div>

      <div className="studio-grid">
        <div className="studio-controls-col">
          <label className="field">
            <span>Primary Focus Angle</span>
            <select
              className="select-field"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
            >
              {FOCUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ marginTop: '0.75rem' }}>
            <span>Advisor Persona Tone</span>
            <select
              className="select-field"
              value={advisorTone}
              onChange={(e) => setAdvisorTone(e.target.value)}
            >
              {TONE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ marginTop: '0.75rem' }}>
            <span>Custom Advisor Note / Emphasis</span>
            <textarea
              rows={3}
              className="textarea-field"
              placeholder="e.g. Highlight Maya's responsible liquidity buffer in her recent plan, and assure Elena that trust assets remain safe."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
          </label>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn primary"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>{isGenerating ? '✨ Generating with Gemini...' : '✨ Generate & Sync Briefings'}</span>
            </button>
            <span className="muted small">Gemini writes the wording; every number comes from the simulation engine</span>
          </div>
        </div>

        <div className="studio-preview-col">
          <div className="preview-split">
            <div className="preview-pane">
              <div className="preview-tag">Maya's Lens (Heir)</div>
              <h4>{current.heirBriefing.headline}</h4>
              <p className="small muted">{current.heirBriefing.summary}</p>
            </div>

            <div className="preview-pane">
              <div className="preview-tag parent-tag">Elena's Lens (Parent)</div>
              <h4>{current.parentBriefing.headline}</h4>
              <p className="small muted">{current.parentBriefing.fiduciarySummary}</p>
              <div className="mini-audio-badge" style={{ background: 'var(--spruce-soft)' }}>
                <span>🛡️ Figures computed by the engine, not the AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
