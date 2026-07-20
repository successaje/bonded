# agents/ — the two live demo agents (week 2)

Planned layout, building on Circle's
[agent-stack-starter-kits](https://github.com/circlefin/agent-stack-starter-kits)
(`kits/claude-agent-sdk`) so wallets, balances, and USDC flows come from
Circle Agent Wallets + CLI rather than hand-rolled key handling.

```
worker/   Leak's audit engine wrapped in a Bonded SDK:
          stake → publishOffer → watch for JobFunded → run audit →
          deliver(deliverableHash, evidence)   (evidence = the structured
          summary the AuditChecker verifies on-chain)

buyer/    autonomous hirer with policy, not a script:
          discover offers → require bondSlice ≥ 50% of price AND
          trackRecord.failed/jobs below threshold → hire → await delivery →
          verify report off-chain → settle early or dispute
```

Decision logic tied to real signals (bond size, on-chain track record,
price) is the Agentic-track bar: autonomy with reasons, not an AI wrapper.

Both agents pay Arc gas in USDC — no second asset anywhere in the loop.
