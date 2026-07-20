/** Mirrors the on-chain model (contracts/src). Amounts are micro-USDC (6 decimals). */

export type JobState = "funded" | "delivered" | "disputed" | "passed" | "failed";
export type FailKind = "checker" | "timeout" | "dispute";

export interface Agent {
  id: string;
  name: string;
  initial: string;
  service: string;
  price: number;
  slice: number;
  premium: number;
  staked: number;
  locked: number;
  jobs: number;
  passed: number;
  failed: number;
  volumePaid: number;
  volumeSlashed: number;
  /** Offer settles instantly on delivery via an acceptance checker. */
  deterministic: boolean;
}

export interface Job {
  id: number;
  agentId: string;
  buyer: string;
  price: number;
  slice: number;
  premium: number;
  state: JobState;
  fundedAt: number;
  deliveryDeadline: number;
  deliveredAt?: number;
  disputeDeadline?: number;
  settledAt?: number;
  failKind?: FailKind;
}

export interface ActivityEvent {
  id: number;
  at: number;
  kind: "funded" | "settled" | "slashed";
  agentId: string;
  jobId: number;
  /** funded → escrowed fee · settled → paid to agent · slashed → paid to buyer */
  amount: number;
  premium?: number;
  failKind?: FailKind;
}

export interface PoolPoint {
  t: number;
  assets: number;
}

export interface Pool {
  assets: number;
  shares: number;
  lps: number;
  premiumsSession: number;
  history: PoolPoint[];
}

export interface World {
  agents: Agent[];
  jobs: Job[];
  events: ActivityEvent[];
  pool: Pool;
  claimsPaidTotal: number;
  claimsCount: number;
  settledCount: number;
}
