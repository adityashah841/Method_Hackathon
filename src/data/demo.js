// Synthetic demo family. All names, firms and numbers are fictional.

export const FAMILY = {
  name: 'Carter',
  firm: 'Northfield Wealth',
  heir: { name: 'Maya', age: 24 },
  parent: { name: 'Elena' },
  advisor: { name: 'James Ortiz' },
  // Money set aside for Maya's plan (her future share of the family portfolio)
  heirShare: 1_200_000,
  smallFund: 25_000,
}

export const DEFAULT_CHARTER = [
  {
    id: 'charter-1',
    title: 'Multi-Generational Capital Preservation',
    category: 'Preservation',
    clause: 'Core family trust assets must be managed to withstand prolonged downturns; no speculative leverage that could impair 30-year wealth continuity.',
    author: 'Elena Carter',
    role: 'parent',
    status: 'ratified',
    parentVote: 'support',
    heirVote: 'support',
    advisorNote: 'Fiduciary benchmark: maintains a 3-year cash flow and short-duration bond buffer.',
  },
  {
    id: 'charter-2',
    title: 'Planetary Stewardship & Climate Transition',
    category: 'Sustainability',
    clause: 'At least 15% to 25% of growth capital should be allocated to renewable infrastructure, decarbonization, or ESG-screened enterprises.',
    author: 'Maya Carter',
    role: 'heir',
    status: 'ratified',
    parentVote: 'support',
    heirVote: 'support',
    advisorNote: 'Enables values-aligned growth while capturing infrastructure yield.',
  },
  {
    id: 'charter-3',
    title: 'Graduated Financial Autonomy via Sandboxes',
    category: 'Autonomy',
    clause: 'The next generation earns increasing investment authority through demonstrated practice and simulations, starting with a $25,000 to $50,000 practice fund.',
    author: 'James Ortiz',
    role: 'advisor',
    status: 'ratified',
    parentVote: 'support',
    heirVote: 'support',
    advisorNote: 'Provides a safe learning environment with pre-trade advisor oversight.',
  },
  {
    id: 'charter-4',
    title: 'Productive Enterprise & Human Capital',
    category: 'Enterprise',
    clause: 'Wealth should act as a launchpad for meaningful work and entrepreneurship (such as Maya’s design studio) rather than passive consumption.',
    author: 'Maya & Elena',
    role: 'heir',
    status: 'ratified',
    parentVote: 'support',
    heirVote: 'support',
    advisorNote: 'Encourages commercial discipline; funded via defined milestones.',
  },
  {
    id: 'charter-5',
    title: 'Consensual Family Governance & Transparency',
    category: 'Governance',
    clause: 'Any major strategic asset reallocation or unlisted venture allocation over $100,000 requires joint family review and advisor fiduciary sign-off.',
    author: 'Elena Carter',
    role: 'parent',
    status: 'ratified',
    parentVote: 'support',
    heirVote: 'support',
    advisorNote: 'Prevents unilateral family friction and promotes transparent dialogue.',
  },
]

export const LADDER = [
  {
    level: 1,
    name: 'Explore',
    unlock: 'Lessons and simulations',
    description: 'Learn financial fundamentals and understand the family\'s high-level financial objectives.',
    criteria: [
      { id: 'complete_scenario', label: 'Complete at least one financial scenario', kind: 'simulation' },
      { id: 'read_fundamentals', label: 'Review the financial basics', kind: 'static', done: true },
    ],
  },
  {
    level: 2,
    name: 'Propose',
    unlock: 'Propose plans for a small fund',
    description: 'Create financial plans, compare scenarios, explain assumptions, and receive advisor feedback.',
    criteria: [
      { id: 'one_scenario', label: 'Complete at least one practice scenario', kind: 'simulation' },
      { id: 'read_fundamentals', label: 'Review financial fundamentals and asset classes', kind: 'static', done: true },
    ],
  },
  {
    level: 3,
    name: 'Manage',
    unlock: 'Run the small fund yourself',
    description: 'Practice making decisions with a limited, supervised practice fund or simulated allocation.',
    criteria: [
      { id: 'two_scenarios', label: 'Complete at least two practice scenarios', kind: 'simulation_count', count: 2 },
      { id: 'submit_plan', label: 'Submit a proposed plan with written rationale', kind: 'proposal' },
      { id: 'advisor_review', label: 'Receive advisor review from James', kind: 'advisor_review' },
      { id: 'parent_approved', label: 'Receive family approval from Elena', kind: 'parent_approval' },
    ],
  },
  {
    level: 4,
    name: 'Co-own',
    unlock: 'Larger share, lighter oversight',
    description: 'Participate in larger family financial discussions and share defined responsibilities.',
    criteria: [
      { id: 'quarterly_review', label: 'Pass a quarterly advisor review', kind: 'static', done: false },
      { id: 'family_meeting', label: 'Present at a family financial meeting', kind: 'static', done: false },
    ],
  },
  {
    level: 5,
    name: 'Own',
    unlock: 'Full handoff',
    description: 'Exercise independent authority within the boundaries agreed upon by the family.',
    criteria: [
      { id: 'independent_track', label: 'Maintain independent track record for one year', kind: 'static', done: false },
      { id: 'legal_review', label: 'Complete legal and estate review with counsel', kind: 'static', done: false },
    ],
  },
]

// Planner: growth slider sets the stock share; 10% stays in real estate.
export function planWeights(stockShare) {
  const realEstate = 0.1
  return { stocks: stockShare, bonds: Math.max(0, 1 - realEstate - stockShare), realEstate }
}

export function planGoals(travelPerYear, extraGoal) {
  const base = [
    { id: 'travel', name: 'Travel', detail: 'every year', kind: 'annual', amount: travelPerYear, importance: 'Medium' },
    { id: 'business', name: 'Start a design studio', detail: 'in year 5', kind: 'lump', amount: 950_000, year: 5, importance: 'High' },
    { id: 'family', name: 'Keep the family wealth', detail: 'left in 30 years', kind: 'floor', amount: 1_200_000, importance: 'High' },
  ]
  if (extraGoal === 'home') {
    base.splice(1, 0, { id: 'home', name: 'Home down payment', detail: 'in year 3', kind: 'lump', amount: 200_000, year: 3, importance: 'High' })
  }
  if (extraGoal === 'charity') {
    base.push({ id: 'charity', name: 'Charitable initiative', detail: 'in year 7', kind: 'lump', amount: 150_000, year: 7, importance: 'Medium' })
  }
  return base
}

export const PLAN_DEFAULTS = { travelPerYear: 20_000, stockShare: 0.5, extraGoal: null }

// ---- Benefits (incentive) config -------------------------------------------
export const BENEFITS = {
  standardApy: 0.0200,          // 2.00% illustrative standard APY
  bonusApy: 0.0050,             // +0.50 percentage points
  qualifiedApy: 0.0250,         // 2.50% illustrative qualified APY
  maxEligibleBalance: 100_000,  // illustrative cap on eligible balance
  qualificationPeriodDays: 90,  // illustrative review period
  benefitDurationMonths: 12,    // illustrative benefit duration

  milestones: [
    {
      id: 'learn',
      label: 'Learn',
      description: 'Complete the financial fundamentals pathway.',
      detail: 'Demonstrate understanding of asset allocation, diversification, and risk by completing at least one practice scenario.',
      criteriaKey: 'simulation',
    },
    {
      id: 'plan',
      label: 'Plan',
      description: 'Define personal financial goals and create a proposed financial plan.',
      detail: 'Submit a plan that explains why the proposed allocation aligns with your goals.',
      criteriaKey: 'proposal',
    },
    {
      id: 'practice',
      label: 'Practice',
      description: 'Complete interactive financial scenarios.',
      detail: 'Complete at least two scenarios and review alternative outcomes.',
      criteriaKey: 'simulation_count',
    },
    {
      id: 'collaborate',
      label: 'Collaborate',
      description: 'Discuss your proposed plan with the advisor.',
      detail: 'Receive advisor feedback and present the revised proposal to the parent.',
      criteriaKey: 'advisor_review',
    },
    {
      id: 'demonstrate',
      label: 'Demonstrate Readiness',
      description: 'Complete an advisor review and receive required family approval.',
      detail: 'Meet the program\'s illustrative eligibility conditions.',
      criteriaKey: 'parent_approval',
    },
  ],
}

// ---- Scenarios ---------------------------------------------------------------
// Market drop: before the drop the family held $1.5M stocks + $1.0M bonds
// ($2.5M, a 60/40 mix). Stocks fell a third, so the portfolio is now $2.0M,
// a 20% drop, and the mix has drifted to 50/50.
const sixtyForty = { stocks: 0.6, bonds: 0.4 }

export const SCENARIOS = [
  {
    id: 'market-drop',
    title: 'The market just dropped 20%',
    story:
      "Stocks fell sharply this month. Your family's portfolio went from $2.5M to $2.0M, a loss of $500,000. Your mom asks what you think the family should do.",
    tags: ['market', 'beginner'],
    holdings: { stocks: 1_000_000, bonds: 1_000_000 },
    years: 5,
    recoveryTarget: 2_500_000,
    recoveryYears: 5,
    goalTarget: 2_600_000, // family's 5-year target
    goalLabel: 'reach the 5-year family target of $2.6M',
    choices: [
      {
        id: 'sell',
        label: 'Sell stocks and wait in cash',
        hint: 'Avoid further drops, then reinvest next year',
        policy: (y) => (y === 0 ? { rebalanceTo: { cash: 1 } } : y === 1 ? { rebalanceTo: sixtyForty } : { rebalanceTo: sixtyForty }),
      },
      {
        id: 'hold',
        label: 'Hold and do nothing',
        hint: 'Keep everything as it is now',
        policy: () => null,
      },
      {
        id: 'rebalance',
        label: 'Rebalance back to 60/40',
        hint: 'Buy stocks so the mix returns to the family plan',
        policy: () => ({ rebalanceTo: sixtyForty }),
      },
    ],
    lesson:
      'Selling after a drop locks in the loss and misses part of any recovery. Rebalancing means buying what just got cheaper, which keeps the family on its long-term plan.',
  },
  {
    id: 'concentration',
    title: "Grandpa's company is 40% of everything",
    story:
      "Your grandfather's company stock is now 40% of the family portfolio ($2.0M of $5.0M). It has done well, but one company is a lot to depend on. What would you suggest?",
    tags: ['concentration', 'beginner'],
    holdings: { familyCo: 2_000_000, stocks: 1_800_000, bonds: 1_200_000 },
    years: 10,
    recoveryTarget: 5_000_000,
    recoveryYears: 10,
    goalTarget: 6_500_000,
    goalLabel: 'grow to $6.5M in 10 years',
    choices: [
      { id: 'keep', label: 'Keep all of it', hint: 'Stay loyal to the company', policy: () => null },
      {
        id: 'trim',
        label: 'Sell half, spread it out',
        hint: 'Company stock drops to about 20%',
        policy: (y) => (y === 0 ? { rebalanceTo: { familyCo: 0.2, stocks: 0.5, bonds: 0.3 } } : null),
      },
      {
        id: 'sellAll',
        label: 'Sell it all',
        hint: 'Move everything into a broad mix',
        policy: (y) => (y === 0 ? { rebalanceTo: { stocks: 0.65, bonds: 0.35 } } : null),
      },
    ],
    lesson:
      'One company can swing much more than the whole market. Spreading the money out raises the bad-case outcome a lot. Selling all of it diversifies most; trimming keeps the family connection while capturing most of the benefit.',
  },
  {
    id: 'business-withdrawal',
    title: 'Maya wants to start a business',
    story:
      "You've found a promising opportunity: a sustainable design studio with a co-founder. You'd need $300,000 upfront from the portfolio to cover the first two years. The potential is real, but so is the risk.",
    tags: ['entrepreneurship', 'liquidity', 'intermediate'],
    holdings: { stocks: 750_000, bonds: 350_000, realEstate: 100_000 },
    years: 7,
    recoveryTarget: 1_200_000,
    recoveryYears: 7,
    goalTarget: 1_400_000,
    goalLabel: 'grow to $1.4M in 7 years',
    choices: [
      {
        id: 'withdraw',
        label: 'Withdraw $300k and fund the studio',
        hint: 'Reduces portfolio; business could return multiples or fail',
        policy: (y) =>
          y === 0
            ? { rebalanceTo: { stocks: 0.68, bonds: 0.32 } } // after withdrawal, rebalance remaining
            : null,
      },
      {
        id: 'stage',
        label: 'Take a smaller first tranche of $100k',
        hint: 'Lower the risk; revisit in year 2 based on early results',
        policy: (y) => (y === 0 ? { rebalanceTo: { stocks: 0.69, bonds: 0.31 } } : null),
      },
      {
        id: 'external',
        label: 'Seek external funding, keep the portfolio intact',
        hint: 'No portfolio withdrawal; apply for a startup loan or investors',
        policy: () => null,
      },
    ],
    lesson:
      'Using your portfolio to fund a business trades diversified growth for concentrated opportunity. Staging investments limits downside. External funding preserves the portfolio but requires a credible business plan and often dilutes ownership.',
  },
  {
    id: 'inflation',
    title: 'Inflation is running hotter than expected',
    story:
      "Inflation has risen to 6% annually—well above historical averages. The family's spending goals are in today's dollars, but the real cost is rising. How should the portfolio be adjusted?",
    tags: ['inflation', 'intermediate'],
    holdings: { stocks: 800_000, bonds: 900_000, realEstate: 300_000 },
    years: 10,
    recoveryTarget: 2_000_000,
    recoveryYears: 10,
    goalTarget: 2_300_000,
    goalLabel: 'maintain real purchasing power at $2.3M in 10 years',
    choices: [
      {
        id: 'shift_growth',
        label: 'Shift more into stocks and real estate',
        hint: 'Historically stronger inflation hedges over long horizons',
        policy: () => ({ rebalanceTo: { stocks: 0.6, bonds: 0.2, realEstate: 0.2 } }),
      },
      {
        id: 'hold_bonds',
        label: 'Keep the current mix',
        hint: 'No change; accept the inflation drag on bonds',
        policy: () => null,
      },
      {
        id: 'reduce_spending',
        label: 'Reduce planned annual spending',
        hint: 'Adjust lifestyle goals to reflect higher costs',
        policy: () => ({ rebalanceTo: { stocks: 0.55, bonds: 0.3, realEstate: 0.15 } }),
      },
    ],
    lesson:
      'Bonds suffer in high-inflation environments because their fixed coupons lose real value. Stocks and real estate have historically provided better inflation protection over long periods, though with higher short-term volatility. Adjusting spending expectations may be as important as adjusting the portfolio.',
  },
  {
    id: 'family-liquidity',
    title: 'The family needs cash for a major expense',
    story:
      "Your grandparents need significant medical care. The family estimates $180,000 is needed over the next 18 months. Elena asks whether funds should come from the portfolio, or whether other arrangements are possible.",
    tags: ['liquidity', 'family', 'intermediate'],
    holdings: { stocks: 600_000, bonds: 400_000, cash: 50_000 },
    years: 5,
    recoveryTarget: 1_050_000,
    recoveryYears: 5,
    goalTarget: 1_200_000,
    goalLabel: 'recover to $1.2M in 5 years',
    choices: [
      {
        id: 'sell_bonds',
        label: 'Liquidate bonds first to raise the cash',
        hint: 'Less market risk; bonds are the steadier asset',
        policy: (y) => (y === 0 ? { rebalanceTo: { stocks: 0.73, bonds: 0.09, cash: 0.18 } } : y === 1 ? { rebalanceTo: { stocks: 0.7, bonds: 0.3 } } : null),
      },
      {
        id: 'sell_mixed',
        label: 'Sell proportionally across stocks and bonds',
        hint: 'Maintain asset mix; reduces both holdings equally',
        policy: (y) => (y === 0 ? { rebalanceTo: { stocks: 0.57, bonds: 0.38, cash: 0.05 } } : null),
      },
      {
        id: 'use_cash',
        label: 'Use existing cash reserves and a short-term credit facility',
        hint: 'Preserve investments; add a loan to cover the gap',
        policy: () => null,
      },
    ],
    lesson:
      'When liquidity is needed quickly, selling the steadier part of the portfolio (bonds, cash) typically causes less long-term disruption than selling equities, especially during volatile periods. Using credit can preserve investment returns but adds interest cost.',
  },
  {
    id: 'underperformance',
    title: 'A major holding underperforms for three years',
    story:
      "One of the family's significant positions—a real estate holding—has returned only 1% per year for three years, well below the 6% historical average. The rest of the portfolio performed normally. Should the family cut their losses?",
    tags: ['patience', 'diversification', 'advanced'],
    holdings: { stocks: 900_000, bonds: 500_000, realEstate: 600_000 },
    years: 7,
    recoveryTarget: 2_000_000,
    recoveryYears: 7,
    goalTarget: 2_500_000,
    goalLabel: 'reach $2.5M in 7 years',
    choices: [
      {
        id: 'hold_re',
        label: 'Hold the real estate position',
        hint: 'Mean reversion: underperformers sometimes catch up',
        policy: () => null,
      },
      {
        id: 'trim_re',
        label: 'Trim real estate by half, add to stocks',
        hint: 'Reduce concentration in underperformer',
        policy: (y) => (y === 0 ? { rebalanceTo: { stocks: 0.62, bonds: 0.23, realEstate: 0.15 } } : null),
      },
      {
        id: 'sell_all_re',
        label: 'Exit real estate entirely',
        hint: 'Reallocate to stocks and bonds',
        policy: (y) => (y === 0 ? { rebalanceTo: { stocks: 0.65, bonds: 0.35 } } : null),
      },
    ],
    lesson:
      'Selling an underperformer after a bad stretch often means selling near the bottom. Diversification means accepting that not everything performs at the same time—that\'s the point. Trimming can be rational if concentration has grown too large.',
  },
]

// ---- Personalization options ------------------------------------------------
export const GOAL_OPTIONS = [
  { id: 'business', label: 'Start a business', scenarios: ['business-withdrawal'], icon: '🏢' },
  { id: 'home', label: 'Buy a home', scenarios: ['family-liquidity'], icon: '🏡' },
  { id: 'education', label: 'Fund further education', scenarios: ['family-liquidity'], icon: '🎓' },
  { id: 'charity', label: 'Support charitable causes', scenarios: ['family-liquidity'], icon: '💚' },
  { id: 'wealth', label: 'Preserve family wealth', scenarios: ['concentration', 'underperformance'], icon: '🌿' },
  { id: 'independence', label: 'Build independent financial security', scenarios: ['market-drop', 'inflation'], icon: '🔐' },
  { id: 'lifestyle', label: 'Travel or pursue lifestyle goals', scenarios: ['market-drop'], icon: '✈️' },
]

export const KNOWLEDGE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'New to investing and financial planning' },
  { id: 'intermediate', label: 'Intermediate', description: 'Comfortable with basic concepts' },
  { id: 'advanced', label: 'Advanced', description: 'Familiar with portfolio theory and financial analysis' },
]

export const LEARNING_STYLES = [
  { id: 'interactive', label: 'Short interactive lessons' },
  { id: 'scenario', label: 'Scenario-based learning' },
  { id: 'charts', label: 'Charts and numerical explanations' },
  { id: 'written', label: 'Detailed written explanations' },
]

export const INVOLVEMENT_LEVELS = [
  { id: 'observe', label: 'Learn about family finances' },
  { id: 'propose', label: 'Propose financial plans' },
  { id: 'supervised', label: 'Participate in supervised decisions' },
  { id: 'responsible', label: 'Gradually assume more responsibility' },
]

// ---- Privacy permissions config -------------------------------------------
export const PERMISSION_CATEGORIES = [
  {
    id: 'portfolio',
    label: 'Portfolio overview',
    description: 'Top-level asset allocation and total value',
    maya: 'view',
    james: 'view',
    elena: 'view',
  },
  {
    id: 'goals',
    label: 'Personal goals',
    description: 'Maya\'s selected financial goals and priorities',
    maya: 'view+edit',
    james: 'view',
    elena: 'view',
  },
  {
    id: 'learning',
    label: 'Learning progress',
    description: 'Scenario completions, decision scores, and educational progress',
    maya: 'view',
    james: 'view',
    elena: 'view',
  },
  {
    id: 'plans',
    label: 'Proposed financial plans',
    description: 'Draft and submitted financial plans',
    maya: 'view+edit',
    james: 'view',
    elena: 'view',
  },
  {
    id: 'advisor_feedback',
    label: 'Advisor feedback',
    description: 'James\'s notes, recommendations, and review comments',
    maya: 'view',
    james: 'view+edit',
    elena: 'view',
  },
  {
    id: 'decisions',
    label: 'Decision history',
    description: 'Record of approvals, revisions, and milestones',
    maya: 'view',
    james: 'view',
    elena: 'view',
  },
  {
    id: 'benefits',
    label: 'Heirloom Progress Benefits',
    description: 'APY bonus eligibility status and qualification milestones',
    maya: 'view',
    james: 'view',
    elena: 'view',
  },
  {
    id: 'profile',
    label: 'Personal profile & preferences',
    description: 'Maya\'s knowledge level, learning style, and involvement preferences',
    maya: 'view+edit',
    james: 'view',
    elena: 'hidden',
  },
]
