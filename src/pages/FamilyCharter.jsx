import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { FAMILY } from '../data/demo.js'
import { CharterAlignmentScorecard } from '../components/CharterAlignmentScorecard.jsx'

const CATEGORIES = ['All', 'Preservation', 'Sustainability', 'Autonomy', 'Enterprise', 'Governance']

export default function FamilyCharter() {
  const { state, dispatch } = useDemo()
  const { role, charter = [] } = state

  const [activeCategory, setActiveCategory] = useState('All')
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Sustainability')
  const [newClause, setNewClause] = useState('')
  const [newAdvisorNote, setNewAdvisorNote] = useState('')

  // Sandbox state
  const [sandboxThesis, setSandboxThesis] = useState('Allocate $25,000 into community solar microgrid green bonds')
  const [activeEvaluationThesis, setActiveEvaluationThesis] = useState('Allocate $25,000 into community solar microgrid green bonds')

  const isParent = role === 'parent'
  const isHeir = role === 'heir'
  const isAdvisor = role === 'advisor'

  const filteredPrinciples = activeCategory === 'All'
    ? charter
    : charter.filter(p => p.category === activeCategory)

  const handlePropose = (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newClause.trim()) return

    const authorName = isHeir ? `${FAMILY.heir.name} Carter` : isParent ? `${FAMILY.parent.name} Carter` : `${FAMILY.advisor.name}`
    const newPrinciple = {
      id: `charter-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      clause: newClause.trim(),
      author: authorName,
      role,
      status: 'proposed',
      parentVote: isParent ? 'support' : 'pending',
      heirVote: isHeir ? 'support' : 'pending',
      advisorNote: newAdvisorNote.trim() || 'Advisor review in progress.',
    }

    dispatch({
      type: 'proposeCharterPrinciple',
      principle: newPrinciple,
    })

    setNewTitle('')
    setNewClause('')
    setNewAdvisorNote('')
    setShowProposeModal(false)
  }

  const handleVote = (id, vote) => {
    dispatch({
      type: 'voteCharterPrinciple',
      id,
      role,
      vote,
    })
  }

  const ratifiedCount = charter.filter(p => p.status === 'ratified').length
  const proposedCount = charter.filter(p => p.status === 'proposed').length

  const SAMPLE_THESES = [
    { label: 'Community Solar Bonds', text: 'Allocate $25,000 into community solar microgrid green bonds yielding 5.4%' },
    { label: 'Design Studio Seed Fund', text: 'Deploy $50,000 to sign lease and buy initial equipment for Maya’s design studio' },
    { label: 'Leveraged Crypto Speculation', text: 'Allocate $60,000 to high-leverage crypto and speculative token options' },
    { label: 'Sustainable Agritech Syndicate', text: 'Invest $35,000 in a regenerative agriculture angel syndicate with 7-year lockup' }
  ]

  return (
    <div className="charter-page">
      {/* Header */}
      <div className="charter-header-banner">
        <div>
          <span className="kicker-gemini">Family Governance &amp; Values Codex</span>
          <h1>The {FAMILY.name} Family Constitution</h1>
          <p className="lede" style={{ marginBottom: '1rem' }}>
            The founding charter co-authored by {FAMILY.parent.name} and {FAMILY.heir.name}, ratified in fiduciary partnership with {FAMILY.firm}.
          </p>
        </div>

        <div className="charter-meta-pills">
          <div className="meta-pill">
            <span className="pill-num">{ratifiedCount}</span>
            <span className="pill-txt">Ratified Principles</span>
          </div>
          {proposedCount > 0 && (
            <div className="meta-pill proposed">
              <span className="pill-num">{proposedCount}</span>
              <span className="pill-txt">Under Family Vote</span>
            </div>
          )}
          <div className="meta-pill advisor">
            <span className="pill-num">{charter.filter((p) => p.advisorNote).length} of {charter.length}</span>
            <span className="pill-txt">Advisor Verified</span>
          </div>
        </div>
      </div>

      {/* Preamble Parchment Card */}
      <blockquote className="charter-preamble card">
        <span className="preamble-quote-mark">“</span>
        <p>
          We, the {FAMILY.name} family, establish this Constitution to govern our shared wealth across generations.
          We hold that capital is an instrument of <strong>human potential</strong>, <strong>planetary responsibility</strong>,
          and <strong>family trust</strong>. When financial decisions arise, we measure success not merely by numeric returns,
          but by our fidelity to these agreed principles.
        </p>
        <cite>— Signed by {FAMILY.parent.name} Carter &amp; {FAMILY.heir.name} Carter · Witnessed by {FAMILY.advisor.name}, {FAMILY.firm}</cite>
      </blockquote>

      {/* Controls & Filter Bar */}
      <div className="charter-controls-bar">
        <div className="category-filter-group">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          className="btn primary small"
          onClick={() => setShowProposeModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <span>+ Propose Principle</span>
        </button>
      </div>

      {/* Propose Principle Modal Form */}
      {showProposeModal && (
        <form className="propose-principle-card card" onSubmit={handlePropose}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Propose a New Constitutional Principle</h3>
            <button type="button" className="text-btn small" onClick={() => setShowProposeModal(false)}>✕ Cancel</button>
          </div>
          <p className="muted small">
            Proposing as <strong>{isHeir ? `${FAMILY.heir.name} (Heir)` : isParent ? `${FAMILY.parent.name} (Parent)` : `${FAMILY.advisor.name} (Advisor)`}</strong>.
            All principles require mutual family consensus to become ratified.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label className="field" style={{ margin: 0 }}>
              <span>Principle Title</span>
              <input
                type="text"
                required
                placeholder="e.g. Local Community Impact & Endowment"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
            </label>

            <label className="field" style={{ margin: 0 }}>
              <span>Category</span>
              <select
                className="select-field"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="field" style={{ marginTop: '0.75rem' }}>
            <span>Founding Clause Text</span>
            <textarea
              rows={3}
              required
              placeholder="e.g. At least 10% of annual portfolio dividends shall be directed toward community non-profit grants chosen collaboratively by the next generation."
              value={newClause}
              onChange={e => setNewClause(e.target.value)}
            />
          </label>

          <label className="field" style={{ marginTop: '0.75rem' }}>
            <span>Advisor Guidance Note (Optional)</span>
            <input
              type="text"
              placeholder="e.g. Verifiable through annual 990 / donor-advised fund statements."
              value={newAdvisorNote}
              onChange={e => setNewAdvisorNote(e.target.value)}
            />
          </label>

          <div className="actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn outline" onClick={() => setShowProposeModal(false)}>Cancel</button>
            <button type="submit" className="btn primary">Submit for Family Ratification</button>
          </div>
        </form>
      )}

      {/* Principles List */}
      <div className="principles-grid">
        {filteredPrinciples.map((p, idx) => {
          const isRatified = p.status === 'ratified'
          const userHasSupported = isHeir ? p.heirVote === 'support' : isParent ? p.parentVote === 'support' : true

          return (
            <div key={p.id || idx} className={`principle-card card ${!isRatified ? 'pending-card' : ''}`}>
              <div className="principle-card-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="principle-category-badge">{p.category}</span>
                  <span className="principle-num">§ {idx + 1}</span>
                </div>
                {isRatified ? (
                  <span className="ratified-badge">✓ Ratified</span>
                ) : (
                  <span className="proposed-badge">⏳ Under Family Vote</span>
                )}
              </div>

              <h3 className="principle-title">{p.title}</h3>

              <blockquote className="principle-clause">
                <p>"{p.clause}"</p>
              </blockquote>

              <div className="principle-author-row">
                <span className="author-text">Authored by <strong>{p.author}</strong></span>
              </div>

              {/* Family Consensus Status */}
              <div className="consensus-strip">
                <div className="vote-status-col">
                  <span className="vote-chip">
                    {p.parentVote === 'support' ? '✓' : '⏳'} {FAMILY.parent.name} ({p.parentVote})
                  </span>
                  <span className="vote-chip">
                    {p.heirVote === 'support' ? '✓' : '⏳'} {FAMILY.heir.name} ({p.heirVote})
                  </span>
                </div>

                {/* Vote Action if pending */}
                {!isAdvisor && (
                  <div className="vote-actions">
                    {userHasSupported ? (
                      <span className="small muted">You supported this ✓</span>
                    ) : (
                      <button
                        className="btn small primary"
                        onClick={() => handleVote(p.id, 'support')}
                      >
                        Ratify Principle
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Advisor Note */}
              {p.advisorNote && (
                <div className="advisor-note-strip">
                  <span className="mini-jo-badge">JO</span>
                  <span className="small muted">
                    <strong>James Ortiz ({FAMILY.firm}):</strong> {p.advisorNote}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Charter Alignment Sandbox Section */}
      <section className="charter-sandbox-section card" style={{ marginTop: '2.5rem' }}>
        <div className="sandbox-header">
          <div>
            <span className="badge-gemini" style={{ marginBottom: '0.35rem', display: 'inline-block' }}>
              ✨ Northfield Values Intelligence
            </span>
            <h2 style={{ margin: 0 }}>Interactive Charter Alignment Sandbox</h2>
            <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
              Test any hypothetical investment thesis or allocation against the 5 Constitution principles before formally proposing it.
            </p>
          </div>
        </div>

        {/* Sample Thesis Chips */}
        <div className="sample-thesis-chips" style={{ marginTop: '1rem' }}>
          <span className="muted small" style={{ fontWeight: 700 }}>Try a scenario:</span>
          {SAMPLE_THESES.map((t, idx) => (
            <button
              key={idx}
              className="chip-btn"
              onClick={() => {
                setSandboxThesis(t.text)
                setActiveEvaluationThesis(t.text)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Custom Thesis Input */}
        <div className="sandbox-input-row" style={{ marginTop: '1rem' }}>
          <input
            type="text"
            className="sandbox-input"
            value={sandboxThesis}
            onChange={e => setSandboxThesis(e.target.value)}
            placeholder="Type any investment thesis (e.g. Put $30k in solar green infrastructure...)"
          />
          <button
            className="btn primary"
            onClick={() => setActiveEvaluationThesis(sandboxThesis)}
            disabled={!sandboxThesis.trim()}
          >
            ✨ Run Charter Audit
          </button>
        </div>

        {/* Live Alignment Scorecard */}
        <div style={{ marginTop: '1.5rem' }}>
          <CharterAlignmentScorecard
            customThesis={activeEvaluationThesis}
            compact={false}
          />
        </div>
      </section>
    </div>
  )
}
