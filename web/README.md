# web/ — the Bonded dashboard (week 3)

Vite + React, reusing the report-UI patterns from Leak. Reads only public
chain state — no backend.

Screens:

- **Agents** — bond staked / locked / available, the Bonded ✓ badge, track
  record from `OutcomeLog` (jobs, pass rate, volume paid, volume slashed)
- **Jobs** — live job states with countdowns (delivery deadline, dispute
  window), per-job settlement receipts
- **Pool** — deposits, share price, premium feed, effective yield
- **Claims feed** — every slash as a headline event: who was compensated,
  how much, how fast (the demo's money shot, replayed from events)
