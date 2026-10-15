import { useState } from 'react'
import { useDemo } from '../state.jsx'
import { BENEFITS, FAMILY, SCENARIOS } from '../data/demo.js'

// ---- Derived milestone completion from state --------------------------------
export function useBenefitsMilestones(state) {
  const { simulations, proposal } = state
  const simCount = Object.keys(simulations).length
  const hasAdvisorReview = proposal?.advisor != null
  const hasParentApproval = proposal?.status === 'approved'

  return BENEFITS.milestones.map((m) => {
    let done = false
    switch (m.criteriaKey) {
      case 'simulation':
        done = simCount >= 1
        break
      case 'proposal':
        done = !!proposal
        break
      case 'simulation_count':
        done = simCount >= 2
        break
      case 'advisor_review':
        done = hasAdvisorReview
        break
      case 'parent_approval':
        done = hasParentApproval
        break
      default:
        done = false
    }
    return { ...m, done }
  })
}

function QualificationStatus({ milestones, benefits }) {
  const doneMilestones = milestones.filter((m) => m.done).length
  const allDone = doneMilestones === milestones.length
  const { approvalStatus, approvalRequested } = benefits

  if (approvalStatus === 'approved') {
    return (
      <div className="benefit-status approved">
        <span className="status-icon">✓</span>
        <div>
          <strong>Approved for illustrative benefit</strong>
          <p>You are approved for the illustrative 2.50% APY for the next 12 months, subject to the terms below.</p>
        </div>
      </div>
    )
  }
  if (approvalRequested && approvalStatus === 'pending') {
    return (
      <div className="benefit-status pending">
        <span className="status-icon">⏳</span>
        <div>
          <strong>Review in progress</strong>
          <p>{FAMILY.advisor.name} is reviewing your eligibility. You'll see the outcome here.</p>
        </div>
      </div>
    )
  }
  if (allDone) {
    return (
      <div className="benefit-status eligible">
        <span className="status-icon">◎</span>
        <div>
          <strong>Eligible for review</strong>
          <p>You've completed all milestones. Request a review from {FAMILY.advisor.name} to be considered for the illustrative benefit.</p>
        </div>
      </div>
    )
  }
  if (doneMilestones > 0) {
    return (
      <div className="benefit-status progress">
        <span className="status-icon">→</span>
        <div>
          <strong>Working toward eligibility</strong>
          <p>{doneMilestones} of {milestones.length} milestones complete. Finish the remaining steps to qualify for review.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="benefit-status not-started">
      <span className="status-icon">○</span>
      <div>
        <strong>Not yet eligible</strong>
        <p>Complete the milestones below to qualify for the illustrative Heirloom Progress Benefit.</p>
      </div>
    </div>
  )
}

function ApyCalculator({ benefits, onBalanceChange }) {
  const { eligibleBalance } = benefits
  const standard = BENEFITS.standardApy
  const qualified = BENEFITS.qualifiedApy
  const bonus = BENEFITS.bonusApy

  const standardInterest = eligibleBalance * standard
  const qualifiedInterest = eligibleBalance * qualified
  const incremental = qualifiedInterest - standardInterest

  const fmt = (v) => '$' + Math.round(v).toLocaleString('en-US')
  const pct = (v) => (v * 100).toFixed(2) + '%'

  return (
    <div className="apy-calculator">
      <h3>Estimate your illustrative benefit</h3>
      <p className="muted">Adjust your eligible savings balance to see the estimated annual difference.</p>

      <label className="slider">
        <span className="slider-head">
          <span>Eligible savings balance</span>
          <strong>{fmt(eligibleBalance)}</strong>
        </span>
        <input
          type="range"
          min={1000}
          max={BENEFITS.maxEligibleBalance}
          step={1000}
          value={eligibleBalance}
          onChange={(e) => onBalanceChange(Number(e.target.value))}
          aria-label="Eligible savings balance"
        />
        <span className="slider-scale">
          <span>$1,000</span>
          <span>{fmt(BENEFITS.maxEligibleBalance)} max</span>
        </span>
      </label>

      <div className="apy-compare">
        <div className="apy-col">
          <span className="apy-label">Standard APY</span>
          <span className="apy-rate standard">{pct(standard)}</span>
          <span className="apy-interest">≈ {fmt(standardInterest)} / year</span>
        </div>
        <div className="apy-divider" aria-hidden="true">vs</div>
        <div className="apy-col qualified-col">
          <span className="apy-label">Heirloom-qualified APY</span>
          <span className="apy-rate qualified">{pct(qualified)}</span>
          <span className="apy-interest">≈ {fmt(qualifiedInterest)} / year</span>
        </div>
      </div>

      <div className="apy-benefit-row">
        <span>Illustrative annual benefit from qualifying:</span>
        <strong className="apy-gain">+{fmt(incremental)}</strong>
        <span className="muted">({pct(bonus)} additional)</span>
      </div>

      <p className="assumption">
        Illustrative estimate only. Assumes constant balance of {fmt(eligibleBalance)} for one year and
        uses simple interest consistent with the stated APYs. Not a guaranteed return or offer of any actual financial product.
        Actual rates, availability, and eligibility depend on the participating financial institution and applicable requirements.
      </p>
    </div>
  )
}

function MilestoneList({ milestones, dispatch, state }) {
  const doneMilestones = milestones.filter((m) => m.done).length
  const allDone = doneMilestones === milestones.length
  const { approvalStatus, approvalRequested } = state.benefits
  const canRequest = allDone && !approvalRequested

  const scenarioDone = (id) => id in state.simulations
  const simCount = Object.keys(state.simulations).length

  return (
    <div className="milestones">
      <div className="milestone-header">
        <div>
          <h3>Qualification milestones</h3>
          <p className="muted">{doneMilestones} of {milestones.length} complete</p>
        </div>
        <div className="milestone-track-wrap">
          <div className="progress-track">
            <span style={{ width: `${(doneMilestones / milestones.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <ol className="milestone-list">
        {milestones.map((m, i) => (
          <li key={m.id} className={`milestone-item ${m.done ? 'done' : ''}`}>
            <div className="milestone-num" aria-hidden="true">{m.done ? '✓' : i + 1}</div>
            <div className="milestone-body">
              <div className="milestone-title">{m.label}</div>
              <div className="milestone-desc">{m.description}</div>
              {!m.done && <div className="milestone-detail muted">{m.detail}</div>}
              {m.criteriaKey === 'simulation_count' && (
                <div className="milestone-progress-note muted">
                  {simCount} of 2 scenarios complete
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {canRequest && (
        <div className="milestone-cta">
          <p>All milestones complete. Request a review from {FAMILY.advisor.name} to be considered for the illustrative benefit.</p>
          <button
            className="btn primary"
            onClick={() => dispatch({ type: 'requestBenefitApproval' })}
          >
            Request eligibility review
          </button>
        </div>
      )}
      {approvalRequested && approvalStatus === 'pending' && (
        <div className="callout">
          Eligibility review requested. {FAMILY.advisor.name.split(' ')[0]} will review and respond here.
          Switch to the Advisor view to approve.
        </div>
      )}
    </div>
  )
}

export default function Benefits() {
  const { state, dispatch } = useDemo()
  const milestones = useBenefitsMilestones(state)
  const [showTerms, setShowTerms] = useState(false)

  return (
    <div className="benefits-page">
      <h1>Your Progress Benefits</h1>
      <p className="lede">
        Build your financial confidence. Earn access to enhanced savings benefits by demonstrating your
        readiness to participate in family financial decisions.
      </p>

      <div className="benefits-grid">
        <div className="benefits-main">
          <section className="benefit-hero card">
            <div className="benefit-hero-rates">
              <div className="hero-rate">
                <span className="hero-rate-label">Standard APY</span>
                <span className="hero-rate-value">{(BENEFITS.standardApy * 100).toFixed(2)}%</span>
              </div>
              <div className="hero-arrow" aria-hidden="true">→</div>
              <div className="hero-rate qualified">
                <span className="hero-rate-label">Heirloom-qualified APY</span>
                <span className="hero-rate-value">{(BENEFITS.qualifiedApy * 100).toFixed(2)}%</span>
                <span className="hero-rate-bonus">+{(BENEFITS.bonusApy * 100).toFixed(2)} percentage points</span>
              </div>
            </div>
            <QualificationStatus milestones={milestones} benefits={state.benefits} />
          </section>

          <section className="card">
            <ApyCalculator
              benefits={state.benefits}
              onBalanceChange={(v) => dispatch({ type: 'benefits', benefits: { eligibleBalance: v } })}
            />
          </section>

          <MilestoneList milestones={milestones} dispatch={dispatch} state={state} />
        </div>

        <aside className="benefits-sidebar">
          <div className="card sidebar-card">
            <h3>How it works</h3>
            <ol className="how-list">
              <li>Complete learning milestones in the order that suits you.</li>
              <li>Request an eligibility review once all milestones are done.</li>
              <li>{FAMILY.advisor.name} reviews your progress and approves eligibility.</li>
              <li>The illustrative bonus APY applies to your eligible savings balance for the benefit period.</li>
            </ol>
          </div>

          <div className="card sidebar-card">
            <h3>Illustrative conditions</h3>
            <dl className="conditions-list">
              <div>
                <dt>Maximum eligible balance</dt>
                <dd>${BENEFITS.maxEligibleBalance.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Qualification review period</dt>
                <dd>{BENEFITS.qualificationPeriodDays} days</dd>
              </div>
              <div>
                <dt>Benefit duration</dt>
                <dd>{BENEFITS.benefitDurationMonths} months</dd>
              </div>
              <div>
                <dt>Requires</dt>
                <dd>Advisor review and family approval</dd>
              </div>
            </dl>
          </div>

          <div className="card sidebar-card">
            <h3>Alternative benefits</h3>
            <p className="muted small">Other forms this benefit could take in a real program:</p>
            <ul className="alt-benefits-list">
              <li>Family-funded savings contribution</li>
              <li>Financial planning fee credit</li>
              <li>Additional advisor sessions</li>
              <li>Access to advanced financial education</li>
              <li>Contribution toward a savings goal</li>
            </ul>
          </div>

          <button className="text-btn" onClick={() => setShowTerms((v) => !v)}>
            {showTerms ? 'Hide' : 'Show'} illustrative terms & disclosure
          </button>
          {showTerms && (
            <div className="terms-block">
              <p>
                <strong>Illustrative prototype only.</strong> The Heirloom Progress Benefit and APY rates shown
                are fictional and for demonstration purposes only. No actual financial product, banking relationship,
                or guaranteed interest rate is offered or implied.
              </p>
              <p>
                Any real program of this nature would require validation with a participating financial institution,
                appropriate legal and compliance review, and would be subject to applicable regulations. APYs, eligibility
                terms, product availability, and funding arrangements would depend on the participating institution.
              </p>
              <p>
                The reward is not contingent on investment risk, portfolio turnover, or trading activity.
                It recognizes demonstrated financial understanding, planning, and responsible participation.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
