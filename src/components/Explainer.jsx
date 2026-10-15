// Contextual AI-style explainer component
// In this prototype, explanations are curated predefined content.
// A real implementation would call an LLM API with appropriate safeguards.

export function ExplainBtn({ label, onClick }) {
  return (
    <button className="explain-btn" type="button" onClick={onClick}>
      <span className="explain-icon" aria-hidden="true">?</span>
      {label}
    </button>
  )
}

export function Explainer({ topic, onClose, onRelated, related = [] }) {
  if (!topic) return null
  return (
    <div className="explainer-panel" role="complementary" aria-label="Financial explanation">
      <div className="explainer-header">
        <span className="explainer-tag">Explain this</span>
        <button className="text-btn" onClick={onClose} aria-label="Close explanation">✕</button>
      </div>
      <h3 className="explainer-question">{topic.q}</h3>
      <p className="explainer-answer">{topic.a}</p>
      {topic.note && <p className="explainer-note muted">{topic.note}</p>}
      <p className="assumption" style={{ marginTop: '0.75rem' }}>
        This is a general explanation. It is not financial advice. The trade-offs that apply to your
        specific situation depend on your goals, time horizon, and the family's full financial picture.
      </p>
      {related.length > 0 && (
        <div className="explainer-related">
          <span className="muted small">Follow-up questions:</span>
          <div className="explainer-related-list">
            {related.slice(0, 3).map((r) => (
              <button key={r.id} className="explain-btn" type="button" onClick={() => onRelated(r.id)}>
                <span className="explain-icon" aria-hidden="true">?</span>
                {r.q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
