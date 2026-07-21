# Deployments

## Arc Testnet (chain id `5042002`)

Deployed 2026-07-21. Explorer: <https://testnet.arcscan.app>

| Contract | Address |
|---|---|
| **JobEscrow** | `0x7dc16d44789283279b28C940359011F2649897dA` |
| **BondVault** | `0x6444f16e29Bf33a8C9da2B89E472b58Bafe41b9c` |
| **SLARegistry** | `0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc` |
| **UnderwriterPool** | `0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54` |
| **OutcomeLog** | `0xF673F508104876c72C8724728f81d50E01649b40` |
| **AuditChecker** | `0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6` |
| USDC (Arc native, ERC-20 view) | `0x3600000000000000000000000000000000000000` |
| Arbiter (v1, deployer) | `0x60eF148485C2a5119fa52CA13c52E9fd98F28e87` |

Wiring verified on-chain: `BondVault.escrow`, `UnderwriterPool.escrow` and
`OutcomeLog.escrow` all point at JobEscrow; JobEscrow's `vault` / `pool` /
`usdc` / `arbiter` all resolve correctly.

## Live proof — both settlement paths, on Arc

Demo SLA (offer #1): **$1.00** job · **$0.50** bond slice · **$0.02** premium ·
deterministic acceptance via `AuditChecker` · agent bond **$5.00**.
Acceptance criteria commit to Leak's audit minimums (≥$2,000/yr recoverable,
≥$1,000/yr high-confidence, ≥3 findings).

### Job #1 — work passes, settles in one transaction

[`0x4484d2ee…88a2d9`](https://testnet.arcscan.app/tx/0x4484d2eefdccbe87e9df1e3580c6555fe8371665eaa549e4f1d0ab924088a2d9)
— 211,507 gas, block 52,945,774

| Effect | Result |
|---|---|
| Agent paid | **+$0.98** (price − premium) |
| Underwriter pool | **+$0.02** premium (`totalAssets` = 20000) |
| Escrow | drained to `0` |
| Bond | slice released, **$5.00 intact** |

### Job #2 — work fails the acceptance check, bond slashed instantly

[`0x6492b0b8…57e1f`](https://testnet.arcscan.app/tx/0x6492b0b808741024bb2b74021d01d042a380de33fce0f700fcda40d83c657e1f)
— 152,888 gas, block 52,945,908

A report claiming $1,200/yr recoverable against a $2,000/yr SLA minimum.

| Effect | Result |
|---|---|
| Buyer compensated | **$1.00 refund + $0.50 from the bond** |
| Agent bond | **$5.00 → $4.50** (slashed) |
| Agent paid | nothing |
| Job state | `Failed` |

### Resulting on-chain track record (`OutcomeLog.trackRecord`)

```
jobs 2 · passed 1 · failed 1 · volumePaid $0.98 · volumeSlashed $0.50
```

Total cost of the deployment plus all eight transactions: **~$4.64 USDC**,
of which $0.52 is protocol value (premium + slash), not gas.

## Reproducing

```bash
cd contracts
cp .env.example .env      # add a burner PRIVATE_KEY funded at faucet.circle.com
forge script script/Deploy.s.sol:Deploy --rpc-url arc_testnet --broadcast
```

Never commit `.env`; `broadcast/` and `cache/` are gitignored because Foundry
writes sensitive values there.
