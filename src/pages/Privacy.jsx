import { useState } from 'react'
import { FAMILY, PERMISSION_CATEGORIES } from '../data/demo.js'

const ROLE_LABELS = {
  maya: `${FAMILY.heir.name} (Heir)`,
  james: `${FAMILY.advisor.name} (Advisor)`,
  elena: `${FAMILY.parent.name} (Parent)`,
}

const ACCESS_LABELS = {
  'view': 'Can view',
  'view+edit': 'Can view & edit',
  'hidden': 'Not visible',
}

const ACCESS_COLORS = {
  'view': 'var(--spruce-soft)',
  'view+edit': 'var(--brass-soft)',
  'hidden': 'var(--mist)',
}

function AccessBadge({ level }) {
  return (
    <span
      className="access-badge"
      style={{ background: ACCESS_COLORS[level] }}
      aria-label={ACCESS_LABELS[level]}
    >
      {ACCESS_LABELS[level]}
    </span>
  )
}

export default function Privacy() {
  const [activeRole, setActiveRole] = useState(null)

  const roles = ['maya', 'james', 'elena']

  return (
    <div className="privacy-page">
      <h1>Privacy &amp; Transparency</h1>
      <p className="lede">
        This table shows which information each family member and advisor can access in Heirloom.
        Permissions are configured by the wealth management firm and the family.
      </p>

      <div className="privacy-filter">
        <span className="muted">Filter by role:</span>
        {roles.map((r) => (
          <button
            key={r}
            className={activeRole === r ? 'chip on' : 'chip'}
            onClick={() => setActiveRole(activeRole === r ? null : r)}
          >
            <input type="checkbox" style={{ display: 'none' }} />
            {r === 'maya' ? FAMILY.heir.name : r === 'james' ? FAMILY.advisor.name.split(' ')[0] : FAMILY.parent.name}
          </button>
        ))}
      </div>

      <div className="privacy-table-wrap">
        <table className="privacy-table" aria-label="Permission matrix">
          <thead>
            <tr>
              <th>Information category</th>
              {(activeRole ? [activeRole] : roles).map((r) => (
                <th key={r}>{ROLE_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map((cat) => (
              <tr key={cat.id}>
                <td>
                  <strong>{cat.label}</strong>
                  <p className="muted small">{cat.description}</p>
                </td>
                {(activeRole ? [activeRole] : roles).map((r) => (
                  <td key={r}>
                    <AccessBadge level={cat[r]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="privacy-notes">
        <section className="card privacy-note-card">
          <h3>How sensitive financial information is protected</h3>
          <p>
            In a production implementation, Heirloom would use industry-standard security practices:
            encryption of data in transit (TLS) and at rest, multi-factor authentication, role-based access
            control enforced at the server level, and regular security audits.
          </p>
          <p>
            <strong>Important:</strong> This prototype uses a frontend-only demo architecture with no real authentication
            or server-side permission enforcement. Role switching is for demonstration purposes only.
            In production, all access control would be enforced on the server, not by hiding buttons in the UI.
          </p>
        </section>

        <section className="card privacy-note-card">
          <h3>What is shared with whom</h3>
          <dl className="role-list">
            <div>
              <dt>Shared with the family</dt>
              <dd>Portfolio overview, learning progress, proposed plans, decision history, and advisor feedback visible to all three parties.</dd>
            </div>
            <div>
              <dt>Shared with the advisor</dt>
              <dd>All information visible to family members, plus full access to review and edit advisor feedback.</dd>
            </div>
            <div>
              <dt>Private to Maya</dt>
              <dd>Personal profile preferences (learning style, involvement level) are private by default.</dd>
            </div>
            <div>
              <dt>Actions that require approval</dt>
              <dd>Moving to the next Trust Ladder stage requires advisor review and parent approval. Progress Benefits require advisor sign-off. No real financial transactions can be executed from this prototype.</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
