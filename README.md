# Heirloom

A family wealth app that prepares heirs to take over inherited wealth, built for the Method Hackathon Financial Services challenge.

**The idea: the trust triangle.** Three relationships matter when wealth moves to the next generation: advisor and parent, advisor and heir, parent and heir. Only the first exists today. Heirloom uses it to build the other two before the money moves. Heirs practice on realistic scenarios, plan around their own priorities, and earn decision rights step by step on a Trust Ladder, released by readiness rather than age.

## Run it

```bash
npm install
npm run dev      # open the local URL it prints
npm test         # simulation engine tests
npm run build    # production build in dist/
```

Requires Node 18+.

## The demo (about 3 minutes)

Use the role switcher in the top right to move between Maya (heir), James (advisor) and Elena (parent). State is shared across roles and saved in the browser; **Reset demo** in the footer starts over.

1. **Maya, Home:** level 2 of 5, one next step.
2. **Practice:** "The market just dropped 20%". Pick a choice, tick what you considered, see the outcome ranges and decision score.
3. **My plan:** move the travel slider and watch the long-term goal's odds change. Propose the plan with a use for the $25,000 practice fund.
4. **James, Review:** add a recommendation and comment.
5. **Elena, Home:** the proposal is waiting. Review and approve.
6. **Maya, Home:** she levels up to Manage.

## Pages

| Page | Role | What it does |
| --- | --- | --- |
| Heir Home | Heir | Trust Ladder level, progress, one next step, latest feedback |
| Practice | Heir | Scenarios with choices, reasoning, outcome ranges and a decision-quality score |
| My plan | Heir | Goal cards with chance of success, travel and stock sliders, 30-year range chart, propose button |
| Proposal | All | Shared proposal view; advisor reviews and recommends, parent approves, declines or asks a question |
| Parent Home | Parent | Heir's level and track record, what's waiting, advisor's note |

## How the math works

All numbers come from a deterministic engine in [`src/engine/engine.js`](src/engine/engine.js). No AI produces figures.

1. **Assets** get an average return and volatility (illustrative: stocks 8%/16%, bonds 4%/6%, real estate 6%/12%, cash 3%/1%, single company stock 9%/35%) and a correlation matrix.
2. **1,000 futures** are generated: each year's returns are drawn from a normal distribution, made correlated with a Cholesky decomposition. A fixed seed makes results reproducible, and the same futures are reused whenever a slider moves (common random numbers), so only the decision changes.
3. **Each year:** wealth = wealth × (1 + portfolio return) + contributions − goal spending.
4. **Goal chance** = futures where the goal was met ÷ 1,000. Shown as "N in 10 futures".
5. **Ranges** use the 10th percentile (bad case), median (typical) and 90th percentile (good case).
6. **Scenarios** model each choice as an investing rule (sell to cash, hold, rebalance) and run all choices through the same futures.
7. **Decision-quality score (0–100)**, scoring reasoning rather than luck:
   - Outcome quality, 50: typical and bad-case results compared to the other choices
   - Fit with family goals, 30: chance of reaching the family target versus the best choice
   - Reasoning, 20: 5 points for each factor considered (risk, time horizon, diversification, family goals)

**Limitations:** illustrative assumptions, not forecasts; normal returns understate crash risk (resampling historical returns is a good next step); no inflation or taxes; the sample family, firm and numbers are fictional.

## Project structure

```
src/
  engine/engine.js       Monte Carlo engine, goal probabilities, scenarios, scoring
  engine/engine.test.js  Engine tests (npm test)
  data/demo.js           Sample family, goals, scenarios, Trust Ladder levels
  state.jsx              Shared demo state across roles
  components/visuals.jsx Futures dots, range bars, fan chart, Trust Ladder
  pages/                 HeirHome, Simulation, Planner, Proposal, ParentHome
```

## Next pages, if time allows

Advisor dashboard (all families, engagement), lessons, permission settings, readiness report, family onboarding.
