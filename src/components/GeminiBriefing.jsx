import { useState, useEffect, useRef } from 'react'
import { useDemo, DEFAULT_REPORT_RECORD } from '../state.jsx'
import { FAMILY } from '../data/demo.js'
import { generateDualLensBriefing, askAdvisorJames } from '../engine/gemini.js'

// Simple default briefing for instant render before generation
const FALLBACK_BRIEFING = DEFAULT_REPORT_RECORD

export function AudioVoicenotePlayer({ script, advisorName = 'James Ortiz' }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const togglePlay = () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (timerRef.current) clearInterval(timerRef.current)
      setIsPlaying(false)
      setProgress(0)
    } else {
      setIsPlaying(true)
      setProgress(0)

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(script)
        utterance.rate = 1.05
        utterance.pitch = 0.98

        // Select a natural voice if available
        const voices = window.speechSynthesis.getVoices()
        const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Alex')))
        if (englishVoice) utterance.voice = englishVoice

        utterance.onend = () => {
          setIsPlaying(false)
          setProgress(100)
          if (timerRef.current) clearInterval(timerRef.current)
        }

        utterance.onerror = () => {
          setIsPlaying(false)
          if (timerRef.current) clearInterval(timerRef.current)
        }

        window.speechSynthesis.speak(utterance)
      }

      // Simulate 45 second progress if audio is playing
      const durationMs = 45000
      const start = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start
        const pct = Math.min(100, Math.round((elapsed / durationMs) * 100))
        setProgress(pct)
        if (pct >= 100) {
          clearInterval(timerRef.current)
          setIsPlaying(false)
        }
      }, 500)
    }
  }

  return (
    <div className="audio-voicenote-card card">
      <div className="audio-header">
        <div className="avatar-chip">
          <span className="avatar-initials">JO</span>
          <div>
            <strong>{advisorName}</strong>
            <span className="muted small" style={{ display: 'block' }}>Senior Wealth Advisor · 60s Voice Note</span>
          </div>
        </div>
        <span className="badge-gemini">✨ Gemini Audio Briefing</span>
      </div>

      <div className="audio-controls-row">
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio note' : 'Play audio note'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="audio-waveform-container">
          <div className="audio-waveform-bars">
            {[40, 75, 50, 90, 60, 30, 85, 95, 45, 70, 80, 55, 65, 90, 40, 85, 75, 60, 95, 50].map((h, i) => (
              <span
                key={i}
                className={`wave-bar ${isPlaying ? 'animated' : ''}`}
                style={{
                  height: `${h}%`,
                  animationDelay: `${(i % 5) * 0.15}s`,
                  opacity: progress >= (i / 20) * 100 ? 1 : 0.45
                }}
              />
            ))}
          </div>
          <div className="audio-progress-bar">
            <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <span className="audio-time">{isPlaying ? `${Math.round(progress * 0.45)}s` : '0:45'}</span>
      </div>

      <div className="transcript-toggle-row">
        <button className="text-btn small" onClick={() => setShowTranscript(v => !v)}>
          {showTranscript ? 'Hide transcript ▴' : 'Read transcript ▾'}
        </button>
      </div>

      {showTranscript && (
        <blockquote className="audio-transcript">
          <p>"{script}"</p>
        </blockquote>
      )}
    </div>
  )
}

/**
 * Interactive Jargon Decoder Component
 */
export function JargonDecoder({ terms = [] }) {
  const [activeTerm, setActiveTerm] = useState(null)

  if (!terms || terms.length === 0) return null

  return (
    <div className="jargon-decoder card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>💡 Jargon Decoder (Plain English)</h4>
        <span className="muted small">Click any term to decode</span>
      </div>
      <div className="jargon-chips">
        {terms.map((item, idx) => (
          <button
            key={idx}
            className={`jargon-chip ${activeTerm?.term === item.term ? 'active' : ''}`}
            onClick={() => setActiveTerm(activeTerm?.term === item.term ? null : item)}
          >
            {item.term}
          </button>
        ))}
      </div>
      {activeTerm && (
        <div className="jargon-explanation">
          <strong>{activeTerm.term}:</strong> {activeTerm.explanation}
        </div>
      )}
    </div>
  )
}

/**
 * Interactive "Ask James (Gemini AI)" Q&A Component
 */
export function AskAdvisorBar({ briefing, role = 'heir' }) {
  const { state, dispatch } = useDemo()
  const [question, setQuestion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isHeir = role === 'heir'

  const qnaList = (state.briefingQnA || []).filter(item => item.role === role)
  const suggestions = briefing?.heirBriefing?.suggestedQuestions || [
    "How does our portfolio growth help my design studio?",
    "What happens to my $25k fund if the market dips?",
    "Can we increase our green energy investments?"
  ]

  const handleAsk = async (queryText) => {
    const q = (queryText || question).trim()
    if (!q || isLoading) return

    setIsLoading(true)
    setQuestion('')

    try {
      const answer = await askAdvisorJames({
        question: q,
        role,
        state,
      })

      dispatch({
        type: 'addBriefingQnA',
        item: {
          id: Date.now().toString(),
          role,
          question: q,
          answer,
          at: Date.now(),
        }
      })
    } catch (err) {
      console.error('Failed to ask advisor:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ask-advisor-card card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💬</span> Ask James a Question
        </h3>
        <span className="badge-gemini">✨ Gemini Advisor AI</span>
      </div>

      <p className="muted small" style={{ marginBottom: '0.75rem' }}>
        {isHeir
          ? "Ask anything about your portfolio, risks, or how this impacts your $25k fund in plain English."
          : "Inquire about fiduciary projections, downside stress tests, or estate continuity."}
      </p>

      {/* Suggested chips */}
      {isHeir && (
        <div className="suggestion-chips" style={{ marginBottom: '0.75rem' }}>
          {suggestions.slice(0, 3).map((s, idx) => (
            <button
              key={idx}
              className="chip-btn small"
              onClick={() => handleAsk(s)}
              disabled={isLoading}
            >
              "{s}"
            </button>
          ))}
        </div>
      )}

      {/* Chat History */}
      {qnaList.length > 0 && (
        <div className="qna-conversation" style={{ marginBottom: '1rem' }}>
          {qnaList.map((item) => (
            <div key={item.id} className="qna-bubble-group">
              <div className="qna-question-bubble">
                <span className="qna-author">{isHeir ? 'Maya' : 'Elena'}</span>
                <p>{item.question}</p>
              </div>
              <div className="qna-answer-bubble">
                <span className="qna-author">James Ortiz (Advisor)</span>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        className="ask-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk()
        }}
      >
        <input
          type="text"
          className="ask-input"
          placeholder={isHeir ? "Ask James about your investments or studio goal..." : "Ask James about fiduciary strategy..."}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
        />
        <button className="btn primary" type="submit" disabled={isLoading || !question.trim()}>
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  )
}

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
  const voicenoteScript = activeRecord?.audioVoicenoteScript || FALLBACK_BRIEFING.audioVoicenoteScript

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
            Fiduciary reports, personalized voicenotes, and strategic governance memos from {FAMILY.advisor.name} ({FAMILY.firm})
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

            {/* Audio Voicenote */}
            <AudioVoicenotePlayer script={voicenoteScript} advisorName={FAMILY.advisor.name} />

            <div className="briefing-cards-grid">
              <div className="card summary-card">
                <div className="impact-box">
                  <span className="impact-icon">🌱</span>
                  <div>
                    <strong>Sustainability &amp; Clean Energy Impact</strong>
                    <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{heirContent.impactHighlight}</p>
                  </div>
                </div>

                <div className="milestone-box" style={{ marginTop: '0.75rem' }}>
                  <span className="impact-icon">🎯</span>
                  <div>
                    <strong>Impact on Your Year 5 Design Studio ($950k)</strong>
                    <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{heirContent.milestoneImpact}</p>
                  </div>
                </div>
              </div>

              <div className="sidebar-cards-col">
                <JargonDecoder terms={heirContent.jargonDecoded} />
                <AskAdvisorBar briefing={activeRecord} role="heir" />
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

                <AskAdvisorBar briefing={activeRecord} role="parent" />
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
              <div className="mini-audio-badge">
                <span>🎙️ 60s Voicenote Script generated</span>
              </div>
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
