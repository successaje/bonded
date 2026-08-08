# Bonded

**Performance bonds for AI agents.** Work that fails pays you back — in USDC,
in under a second.

The agent economy has identity (ERC-8004), discovery (Circle's Agent
Marketplace), and payments (x402 / Nanopayments). It has no accountability:
when a paid agent delivers bad work, nothing makes the buyer whole. Bonded is
that missing layer — "licensed & bonded," rebuilt as programmable money on
[Arc](https://docs.arc.io/), Circle's stablecoin-native L1.

Live app: **[bonded-nine.vercel.app](https://bonded-nine.vercel.app)** — connect
a wallet, browse the marketplace, hire an agent for real.

## Live on Arc testnet

Deployed and proven end-to-end on chain `5042002` — **both** settlement paths,
with real USDC. All six contracts are **source-verified on ArcScan**;
`JobEscrow` is at
[`0x7dc16d44…97dA`](https://testnet.arcscan.app/address/0x7dc16d44789283279b28C940359011F2649897dA?tab=contract).
Full address table and transaction receipts in
[docs/deployments.md](docs/deployments.md).

| Live transaction | Outcome |
|---|---|
| [Job #1 — passed](https://testnet.arcscan.app/tx/0x4484d2eefdccbe87e9df1e3580c6555fe8371665eaa549e4f1d0ab924088a2d9) | agent **+$0.98**, pool **+$0.02**, bond released — one tx, 211k gas |
| [Job #2 — slashed](https://testnet.arcscan.app/tx/0x6492b0b808741024bb2b74021d01d042a380de33fce0f700fcda40d83c657e1f) | buyer **refunded $1.00 + $0.50 from the bond**; agent's stake cut $5.00 → $4.50 |
| [Job #4 — agent-to-agent](https://testnet.arcscan.app/tx/0x47e13e5db7b98d94587f1d27c4f54f4e0e12ee1ee5b69293d49f2bce3a0fbd5d) | a buyer **agent** hired a worker **agent**, the work failed, and the buyer ended **+$0.50 ahead** — no human in the loop |

The failing delivery claimed $1,200/yr recoverable against a $2,000/yr SLA
minimum — the on-chain `AuditChecker` rejected it and compensated the buyer
without a human, a claims process, or a dispute.

## Why this matters

**It's the missing piece, not an incremental one.** Identity (ERC-8004),
payments (x402, Nanopayments), and discovery (Circle's Agent Marketplace) all
shipped in the last few months. None of them answer the question a buyer
actually has: *if this agent's work is bad, what happens to my money?*
Reputation tells you who failed *before* — and anyone looks good until the
day they don't. Escrow returns a fee, at best, on one deal. Neither makes a
promise cost anything to break. Bonded is the layer where breaking a promise
has a price, paid automatically, to the person it hurt.

**It's a wedge, not a silo.** `claimTimeout` in `JobEscrow` already
implements "respond in time or the buyer is compensated" — that's an
uptime/latency bond on *any* x402-paid service, not just an AI agent's audit
work. A thin gateway in front of an existing x402 endpoint (see Roadmap)
turns Bonded from one bonded agent into the trust layer over the whole
ecosystem, with almost no new contract code.

**Why it's specifically good for Arc:**

- **It's the demo that makes sub-second finality *matter*, not just
  *fast*.** Job #2 above is a real insurance claim — refund plus penalty,
  paid out — that would take weeks through a real-world underwriter and
  takes about a second on Arc. That's not a faster swap; it's a category of
  product (surety, insurance, SLA-backed commerce) that simply doesn't work
  without deterministic sub-second settlement, running natively on Arc.
- **Every unit of activity is USDC gas.** Staking, hiring, settling,
  slashing — every step in the lifecycle is an Arc transaction paid in the
  same USDC the bond itself is denominated in. An agent economy that
  actually transacts at volume is USDC throughput on Arc, directly.
- **It's infrastructure other builders can stand on, not a standalone app.**
  Because the primitive is generic (stake → SLA → settle), any Arc-based
  agent marketplace or service can plug into `JobEscrow` rather than build
  its own escrow-and-slashing logic — the same way payment processors don't
  each reinvent card networks.
- **It's the kind of primitive that legitimizes a chain for serious
  capital.** Bonds and underwriting are TradFi's oldest trust mechanism,
  rebuilt as programmable money. A chain that can host real surety
  instruments — not just token swaps — is the "real financial applications"
  story Arc is explicitly built to tell.

That's also why one build genuinely strengthens both hackathon tracks
instead of stretching thin across them: the buyer agent pricing counterparty
risk and acting alone is Agentic Economy; the underwriter pool pricing that
same risk for yield is DeFi. Same contracts, same transactions, two answers.

## How it works

1. **Stake** — a service agent locks USDC in the `BondVault` as capital at
   risk behind its promises.
2. **Offer** — it publishes a machine-readable SLA in the `SLARegistry`:
   price, delivery deadline, acceptance criteria (a deterministic checker
   contract + committed criteria hash), dispute window, penalty.
3. **Hire** — a buyer (human or agent) funds a job in the `JobEscrow`; a
   slice of the agent's bond locks alongside the fee.
4. **Settle** — delivery runs the offer's own acceptance check.
   - **Pass** → agent paid, premium to the `UnderwriterPool`, bond released.
   - **Fail** (bad delivery, missed deadline, or upheld dispute) → the buyer
     receives a full refund **plus the bond slice**, straight from the
     agent's stake. Compensation, not just a refund — settled in ~1s.
5. **Record** — every outcome lands in the `OutcomeLog`: a public, portable,
   ERC-8004-feedable track record. Bonded history is an agent's credit
   history.

LPs deposit USDC into the `UnderwriterPool` and earn the premium from every
passed job — yield generated by real work, not emissions.

## Agents, not scripts

`agents/` runs two long-lived autonomous processes, each holding its own
wallet key — no human signs a transaction in either one. The **worker**
watches Arc for jobs against its own offers and delivers on its own key. The
**buyer** surveys every live offer and decides who to hire with one formula:

```
E = price + ((1 − q) / q) · max(0, delayCost − bondSlice)
```

`q` is a Laplace-smoothed pass rate, so a new agent prices as a coin flip
rather than flawless. Compensation is capped at the delay it offsets — remove
that cap and an over-bonded agent makes *failure* profitable, which is exactly
the exploit 17 unit tests in `agents/src/underwriting.test.ts` guard against.
One consequence worth naming: a big enough bond fully substitutes for a track
record — how a new agent breaks into a market that would otherwise only ever
hire incumbents.

That model produced job #4 above without a script telling it to: the buyer
agent rejected a cheaper offer with a decorative bond, hired the one whose
bond actually covered the risk, and when *that* agent had a bad day, walked
away $0.50 richer than it started — made whole by code, not a support ticket.

The same `hire()` path is now reachable from a human wallet, too —
`web/src/wallet/` runs the identical approve → hire → poll-to-settlement
sequence, just signed by MetaMask instead of a burner key.

## The demo SLA (locked in tests)

[Leak](https://github.com/successaje/leaq), our production spend-audit agent,
is the first bonded agent. Its SLA: a recurring-spend audit for **$50**,
backed by a **$25 slice** of a **$500 bond**, **$1 premium** to underwriters,
1-hour delivery. Acceptance is deterministic: the delivered report must state
criteria matching the SLA's commitment, hash-bind to the deliverable, claim
≥ $2,000/yr recoverable, ≥ $1,000/yr high-confidence, ≥ 3 findings, and be
internally coherent (floor ≤ headline). Leak's locked demo totals
($5,693.88/yr recoverable, $2,969.88/yr floor, 5 findings) pass; a thin
report, a missed deadline, or tampered criteria triggers instant slash.

## Run it

```bash
cd contracts
forge build
forge test        # 31 tests: lifecycle, slash paths, disputes, pool math, guards
```

```bash
cd agents
npm install
cp .env.example .env       # DEPLOYER_KEY — a burner funded at faucet.circle.com
npm run bootstrap           # gives each agent a wallet, bond, and offer
npm run buyer                # survey → decide → hire → settle, no human
npm test                     # 17 tests on the underwriting model
```

```bash
cd web
npm install
npm run dev        # http://localhost:5175 — or just use the live app above
```

Deploy the contracts yourself against Arc testnet:

```bash
cd contracts
cp .env.example .env   # fill PRIVATE_KEY
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
```

## Architecture

```
contracts/src/
  BondVault.sol        each agent's staked USDC; lock / unlock / slash per job
  SLARegistry.sol      signed offer terms: price, deadline, checker, penalty
  JobEscrow.sol        per-job state machine: Funded → Delivered → Passed | Failed
  UnderwriterPool.sol  LP vault: deposits, premium accrual, proportional withdrawal
  OutcomeLog.sol       settlement attestations + per-agent track record
  checkers/AuditChecker.sol   deterministic acceptance for audit deliverables

agents/    autonomous worker + buyer, own wallets, viem — src/underwriting.ts
           is the risk model both the agents and the dashboard run
web/       the app: landing, dashboard, marketplace, jobs, reputation explorer,
           proof — plus src/wallet/, real browser-wallet connect + hire flow
```

Acceptance is deliberately two-mode: **deterministic** where the work permits
it (checker contracts — pure math, no oracles), **optimistic** everywhere else
(dispute window; silence is consent; a fixed arbiter resolves v1 disputes —
see Known limitations below).

## Deployed contracts

Arc Testnet, chain `5042002`. **All six are source-verified on ArcScan** —
click through to read the exact code, or call it directly from the explorer.

| Contract | Address |
|---|---|
| `JobEscrow` | [`0x7dc16d44…97dA`](https://testnet.arcscan.app/address/0x7dc16d44789283279b28C940359011F2649897dA?tab=contract) |
| `BondVault` | [`0x6444f16e…1b9c`](https://testnet.arcscan.app/address/0x6444f16e29Bf33a8C9da2B89E472b58Bafe41b9c?tab=contract) |
| `SLARegistry` | [`0x86C41594…0dBc`](https://testnet.arcscan.app/address/0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc?tab=contract) |
| `UnderwriterPool` | [`0xC310b437…FE54`](https://testnet.arcscan.app/address/0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54?tab=contract) |
| `OutcomeLog` | [`0xF673F508…9b40`](https://testnet.arcscan.app/address/0xF673F508104876c72C8724728f81d50E01649b40?tab=contract) |
| `AuditChecker` | [`0x7CC324d1…68f6`](https://testnet.arcscan.app/address/0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6?tab=contract) |
| USDC (Arc native, ERC-20 view) | `0x3600000000000000000000000000000000000000` |
| Arbiter (v1, deployer) | `0x60eF148485C2a5119fa52CA13c52E9fd98F28e87` |

Compiled with solc `v0.8.26+commit.8a97fa7a`, optimizer on, 200 runs. Full
deployment log, gas per transaction, and the Blockscout verify command (no
API key needed) are in [`docs/deployments.md`](docs/deployments.md).

## Why Arc

- **USDC gas** — an agent's entire economic loop (earn, stake, pay penalties,
  pay fees) is one stable asset. Autonomous agents can't sanely hold a
  volatile gas token.
- **Sub-second deterministic finality** — a claims process measured in
  seconds, not months; the whole "made whole" moment in job #4 above happens
  in one block.
- **ArcScan / Blockscout verification, no API key** — anyone can read the
  exact code behind a bond before trusting it. Discovery is Circle's Agent
  Marketplace, where **Bonded ✓** is designed to become the badge worth
  demanding.

| Network | Value |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| USDC (ERC-20 view of native, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.circle.com |

Amounts throughout are 6-decimal USDC (Arc's ERC-20 view). Native gas is the
same USDC pool seen at 18 decimals — never add the two views.

## Known limitations

Named on purpose, not hidden: **v1's arbiter is a single address** (the
deployer's), and only matters on the optimistic dispute path — deterministic
jobs never touch it. There's **no unbonding delay**, so a track record can in
principle be abandoned the moment the last job settles. `UnderwriterPool` has
**no first-depositor inflation guard** yet. And there's **no pause
mechanism** — consistent with no contract in the system having a standing
admin key beyond a one-time, self-only `setEscrow()` wiring call, but it means
a bug is fixed by redeploying, not freezing in place. All four are scoped
below.

## Roadmap (deliberately out of v1)

- **x402 latency-bond gateway** — `claimTimeout` in `JobEscrow` already is
  "respond in time or the buyer is compensated." A thin gateway in front of
  any x402-paid service turns Bonded into the trust layer over that whole
  ecosystem, with almost no new contract code.
- Decentralized dispute oracle replacing the v1 arbiter — UMA's optimistic
  oracle, already live on Arc, is the natural fit.
- Underwriter pools **co-signing bonds** for agents that can't fully
  self-stake, priced off the `OutcomeLog` track record.
- Unbonding delay, so a track record can't be abandoned the moment the last
  job settles.
- ERC-8004 registry integration, publishing `OutcomeLog` outcomes as
  standard reputation attestations.
- Pool hardening: first-depositor inflation guard, per-agent exposure caps.

## More in `docs/`

- [`deployments.md`](docs/deployments.md) — the full deployment log: every
  contract address, gas per transaction, block numbers, the Blockscout
  verify command, and reproduction steps.
- [`pitch.md`](docs/pitch.md) — the pitch in narrative form: the gap, the
  mechanism, and why Arc.
- [`bonded-deck.pdf`](docs/bonded-deck.pdf) / [`.pptx`](docs/bonded-deck.pptx) —
  the slide deck, generated from [`deck.js`](docs/deck.js).

## Hackathon

Built for **Build on Arc** (Encode × Circle, July–Aug 2026) by
[@successaje](https://github.com/successaje), entering both tracks:
Agentic Economy and DeFi. Status: contracts + full test suite ✅ · deployed,
verified & proven on Arc testnet ✅ · autonomous buyer + worker agents
settling on-chain ✅ · full app live, wallet connect + real hire flow ✅ ·
3-minute video ⏳.

MIT licensed — see [`LICENSE`](LICENSE).
