# agents/ — autonomous buyer and worker agents

Agents that hold their own wallets, spend their own USDC, and settle with each
other on Arc. No human approves anything in the money path.

```bash
npm install
cp .env.example .env        # add DEPLOYER_KEY (a funded burner)
npm run bootstrap           # gives each agent a wallet, bond and offer
npm run survey              # what the buyer sees before deciding
npm run worker -- leak      # a worker, watching for its jobs
npm run buyer               # survey → decide → hire → settle
```

`npm run buyer -- --dry` decides without spending. `npm run worker -- swift --fail`
simulates an agent having a bad day. `npm test` runs the underwriting suite.

## Who does what

| Agent | Role |
|---|---|
| **Buyer** | Needs an audit. Reads the market, prices risk, hires, gets settled. |
| **Leak** | The incumbent: $1.00, $0.50 bond slice, delivers to spec. |
| **SwiftAudit** | The challenger: $0.80, $0.50 slice — buys trust with capital, not history. |
| **FlakyLabs** | Cheapest at $0.60, but a $0.06 bond. Rejected before a cent moves. |

Each agent pays Arc gas in USDC, so there is no second asset anywhere in the
loop — the thing an agent earns is the thing it spends.

## How the buyer decides

Every input is public on-chain state — offer terms from `SLARegistry`, free
bond from `BondVault`, settled history from `OutcomeLog`. No oracle, no API
key, no LLM anywhere in the money path. The model
([underwriting.ts](src/underwriting.ts)) asks one question: *what do I expect
to spend to actually get this job done?*

```
E = price + ((1-q)/q) · max(0, delayCost - bondSlice)
```

`q` is a Laplace-smoothed pass rate, so a brand-new agent reads as a coin flip
rather than as flawless, and a single failure isn't read as hopeless.

Compensation is **capped at the delay it offsets**. Without that cap the model
is perverse: an over-bonded agent makes failure profitable, so the rational
buyer farms unreliable agents and the whole incentive inverts. A bond exists to
make you whole, never to pay you for being let down. (`npm test` pins this.)

What the model implies, and what the live run then confirmed:

- a bigger bond monotonically buys down the risk premium, to zero but no further;
- **a large enough bond fully substitutes for a track record** — which is how a
  newcomer breaks into a market that would otherwise only ever hire incumbents;
- reputation settles ties.

## The live run on Arc

The buyer surveyed five offers and **rejected FlakyLabs before spending a
cent** — a $0.06 bond on a $0.60 job is decorative. It then passed over the
incumbent and hired the challenger at $0.80, because SwiftAudit's bond fully
covered the risk.

SwiftAudit had a bad day and delivered a thin report — $1,200/yr recovered
against a $2,000/yr SLA minimum
([tx](https://testnet.arcscan.app/tx/0x47e13e5db7b98d94587f1d27c4f54f4e0e12ee1ee5b69293d49f2bce3a0fbd5d)).
The checker rejected it and the buyer was compensated in the same transaction:
$0.80 refunded plus $0.50 from the bond. **The buyer ended the job $0.49 ahead
despite the work failing** — that is what a bond is for.

Then the market re-priced SwiftAudit on its own, with no admin and no
governance: its pass rate fell to 33%, and the slash left its bond too small to
back its own offer. The buyer now rejects it on both grounds and falls back to
Leak.

## Layout

```
src/underwriting.ts   the decision model — pure, 17 unit tests
src/marketplace.ts    reads offers + bonds + track records off Arc
src/deliverable.ts    audit claims → the evidence AuditChecker verifies
src/jobs.ts           job state as the escrow sees it
src/fleet.ts          the demo cast and their offer terms
src/cli/              bootstrap · survey · buyer · worker
```

`src/abis.ts` is generated from the compiled contracts (`npm run gen:abis`), so
the agents can never drift from what is deployed. The public Arc RPC rate-limits
bursts, so reads are paced and retried with jittered backoff ([rpc.ts](src/rpc.ts)).

## Wiring in the real Leak engine

`deliverable.ts` holds Leak's audit output as a constant — $5,693.88/yr
recoverable, $2,969.88/yr high-confidence, 5 findings, the totals its own test
suite locks. That determinism is exactly what makes the work bondable, because
acceptance can be deterministic too. Swapping in the live engine means
replacing that constant with the parsed output of `npm run audit -- charges.json`;
the shape is identical.

Keys live in `.env` (gitignored) and are never logged.
