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

export const LADDER = [
  { level: 1, name: 'Explore', unlock: 'Lessons and simulations' },
  { level: 2, name: 'Propose', unlock: 'Propose plans for a small fund' },
  { level: 3, name: 'Manage', unlock: 'Run the small fund yourself' },
  { level: 4, name: 'Co-own', unlock: 'Larger share, lighter oversight' },
  { level: 5, name: 'Own', unlock: 'Full handoff' },
]

// Planner: growth slider sets the stock share; 10% stays in real estate.
export function planWeights(stockShare) {
  const realEstate = 0.1
  return { stocks: stockShare, bonds: Math.max(0, 1 - realEstate - stockShare), realEstate }
}

export function planGoals(travelPerYear) {
  return [
    { id: 'travel', name: 'Travel', detail: 'every year', kind: 'annual', amount: travelPerYear, importance: 'Medium' },
    { id: 'business', name: 'Start a design studio', detail: 'in year 5', kind: 'lump', amount: 950_000, year: 5, importance: 'High' },
    { id: 'family', name: 'Keep the family wealth', detail: 'left in 30 years', kind: 'floor', amount: 1_200_000, importance: 'High' },
  ]
}

export const PLAN_DEFAULTS = { travelPerYear: 20_000, stockShare: 0.5 }

// ---- Scenarios ----------------------------------------------------------
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
]
