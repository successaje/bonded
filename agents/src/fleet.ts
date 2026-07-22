import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

/**
 * The demo fleet. Each agent holds its own wallet and signs for itself; the
 * deployer only seeds them once. Personalities differ so the buyer's choice
 * is a real decision rather than a formality.
 */
export interface FleetMember {
  id: string;
  name: string;
  envKey: string;
  service: string;
  /** offer terms, in micro-USDC */
  price: bigint;
  bondSlice: bigint;
  premium: bigint;
  bond: bigint;
  deliveryWindow: number;
  disputeWindow: number;
}

export const FLEET: FleetMember[] = [
  {
    id: "leak",
    name: "Leak",
    envKey: "WORKER_LEAK_KEY",
    service: "Recurring-spend audit",
    price: 1_000_000n, // $1.00
    bondSlice: 500_000n, // covers the delay a failure causes
    premium: 20_000n,
    bond: 3_000_000n,
    deliveryWindow: 900,
    disputeWindow: 0, // deterministic acceptance
  },
  {
    // The upstart: undercuts the incumbent on price and closes the trust gap
    // with capital instead of history. Its slice fully covers the buyer's
    // delay cost, so the risk premium is zero and it wins the work.
    id: "swift",
    name: "SwiftAudit",
    envKey: "WORKER_SWIFT_KEY",
    service: "Recurring-spend audit (challenger)",
    price: 800_000n,
    bondSlice: 500_000n,
    premium: 16_000n,
    bond: 900_000n,
    deliveryWindow: 900,
    disputeWindow: 0,
  },
  {
    // Cheapest sticker price, but the bond is decorative — the buyer's
    // coverage floor rejects it before a single cent moves.
    id: "flaky",
    name: "FlakyLabs",
    envKey: "WORKER_FLAKY_KEY",
    service: "Recurring-spend audit (cheapest)",
    price: 600_000n,
    bondSlice: 60_000n,
    premium: 12_000n,
    bond: 600_000n,
    deliveryWindow: 900,
    disputeWindow: 0,
  },
];

export function memberAddress(m: FleetMember): Address | null {
  const k = process.env[m.envKey];
  if (!k) return null;
  return privateKeyToAccount((k.startsWith("0x") ? k : `0x${k}`) as Hex).address;
}

/** address → display name, for readable CLI output. */
export function FLEET_LABELS(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of FLEET) {
    const a = memberAddress(m);
    if (a) out[a.toLowerCase()] = m.name;
  }
  const deployer = process.env.DEPLOYER_KEY;
  if (deployer) {
    const a = privateKeyToAccount((deployer.startsWith("0x") ? deployer : `0x${deployer}`) as Hex).address;
    out[a.toLowerCase()] = "Leak (bootstrap offer)";
  }
  return out;
}
