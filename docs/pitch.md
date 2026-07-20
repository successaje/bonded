# Bonded — pitch notes

**Tagline:** Performance bonds for AI agents — work that fails pays you back,
in USDC, in under a second.

**One-liner:** "Licensed & bonded," rebuilt as programmable money on Arc.

## The gap

Payments for agents are solved (x402 became a Linux Foundation standard;
Circle shipped Nanopayments). Identity is standardized (ERC-8004, mainnet
Feb 2026, 45k+ agents in its first month). Discovery exists (Circle's Agent
Marketplace). But reputation only tells you who failed *before* — nothing
makes a buyer whole when an agent fails them *now*. Escrow alone protects the
fee, not the outcome. Human commerce solved this centuries ago: surety bonds,
SLAs with penalties, underwriting. That layer is missing for machines, and
industry commentary calls frontier AI agent risk "largely unpriced."

## Why now, why Arc

- Arc mainnet lands summer 2026 — a day-one trust primitive rides the wave.
- USDC-denominated gas: an agent's whole economic loop in one stable asset.
- Sub-second deterministic finality: insurance claims that pay in ~1 second.
- The judging brief asks for "advanced programmable money flows such as
  conditional payments, onchain automation or multi-step settlement" — a
  bonded SLA settlement is precisely that.

## The demo (3-min video spine)

1. Leak — our production spend-audit agent (ERC-8004 #5115 in a previous
   ecosystem) — stakes a $500 bond on Arc and publishes its $50 SLA.
2. A buyer agent discovers the offer, checks the bond and track record
   against its policy, and hires autonomously.
3. Happy path: audit delivered, deterministic acceptance check passes,
   settlement in ~1s — $49 to Leak, $1 premium to underwriters, on-chain
   track record updated.
4. The money shot: a deliberately faulty agent takes a job and delivers a
   thin report. The acceptance check fails and the buyer is compensated —
   full refund plus $25 from the agent's bond — in one sub-second
   transaction. No claims department. No trust required.

## Positioning

- vs. Circle's arc-escrow sample: escrow protects one deal's fee; Bonded adds
  capital-at-risk beyond the fee, penalty schedules, underwriting yield, and
  portable outcomes.
- vs. Virtuals ACP: an escrow flow inside one token ecosystem; Bonded is
  neutral, USDC-native infrastructure any marketplace can attach to.
- vs. ERC-8004: 8004 defines identity/reputation/validation interfaces;
  Bonded is the economic enforcement built on those rails.

## Business

Wedge: the **Bonded ✓** badge on agent-marketplace listings. Model: protocol
fee on premiums and claims. Expansion: underwritten bonds priced off on-chain
track records; then human freelance/gig settlement. The accelerator ask:
intros to agent-platform operators who need exactly this to sell to
enterprises.

## Checkpoint 1 submission (submitted 2026-07-19 weekend)

See README for the description text used on the platform.
Tracks: Agentic Economy + DeFi. Team: Success Aje (+ teammates on platform).
