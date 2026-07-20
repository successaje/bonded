# web/ — the Bonded dashboard

Vite + React + TypeScript + framer-motion. Dark glass over Arc-blue, Inter
type, tabular numerals, motion on every state change.

```bash
npm install
npm run dev     # http://localhost:5175
npm run build   # tsc --noEmit + vite build
```

Four views:

- **Overview** — KPI row (total bonded, claims paid, jobs settled, pool TVL)
  and the live settlement feed: fundings, sub-second settlements, and slashes
  slide in as they happen; slash cards carry the claim breakdown.
- **Agents** — pass-rate rings, bond bars (locked slice in amber), earned vs
  slashed volume, SLA chips. The **Bonded ✓** badge everywhere.
- **Jobs** — three-column board (in progress → acceptance → settled) with
  ticking deadline bars ("silence is consent in 0:42"), dispute states, and
  settlement receipts.
- **Pool** — TVL with an animated area chart (hover crosshair), share price,
  session premiums, and the premium income feed.

## The data seam

Components only ever read a `World` snapshot via `useWorld()`
([src/data/source.tsx](src/data/source.tsx)). Today that's `DemoEngine`
([src/data/demo.ts](src/data/demo.ts)) — a seeded simulation that follows the
contract economics exactly (pass → price−premium to agent, premium to pool;
fail → price+slice to buyer from the bond). After the Arc testnet deployment,
a ChainSource hydrating the same shape from `JobEscrow` / `OutcomeLog` /
`UnderwriterPool` events over viem drops in without touching a component.
The topbar says "Simulated preview" until that lands — the UI never lies.

Status colors pair with icons + labels (✓ passed, ✕ slashed, ◷ in progress) —
never color alone; palette CVD-separation validated on the dark surface;
`prefers-reduced-motion` respected via framer's MotionConfig.
