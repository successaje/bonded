import type { Address, Hex } from "viem";

/**
 * How a buyer agent decides who to hire.
 *
 * The signals are all on-chain and all public: the offer's terms, how much
 * bond the agent actually has free, and its settled track record in the
 * OutcomeLog. No oracle, no vibes, no LLM in the money path.
 *
 * The model asks one question: **what do I expect to spend to actually get
 * this job done?** A failure is not a dead loss — Bonded refunds the fee and
 * pays a penalty from the agent's bond — but it does cost the buyer time,
 * because the work still has to be redone.
 *
 *   E = q·price + (1-q)·(E - compensation + delayCost)
 *
 * Solving for E:
 *
 *   E = price + ((1-q)/q)·(delayCost - compensation)
 *
 * with one essential guard: **compensation is capped at the delay it offsets**
 *
 *   compensation = min(bondSlice, delayCost)
 *   E = price + ((1-q)/q)·max(0, delayCost - bondSlice)
 *
 * Without that cap the model is perverse — an over-bonded agent makes failure
 * *profitable*, so the rational buyer farms unreliable agents and the whole
 * incentive inverts. A bond exists to make you whole, never to pay you for
 * being let down.
 *
 * What the capped model says, and why it is the product thesis:
 *
 *   - expected cost never drops below the sticker price;
 *   - a bigger bond monotonically buys down the risk premium to zero;
 *   - **a large enough bond fully substitutes for a track record.** That is
 *     how a brand-new agent breaks into a market that would otherwise only
 *     ever hire incumbents — it posts capital instead of history. Reputation
 *     then settles ties.
 */

export interface OfferView {
  offerId: bigint;
  agent: Address;
  price: bigint;
  bondSlice: bigint;
  premium: bigint;
  deliveryWindow: number;
  disputeWindow: number;
  checker: Address;
  criteriaHash: Hex;
  uri: string;
  active: boolean;
}

export interface AgentStats {
  staked: bigint;
  locked: bigint;
  available: bigint;
  jobs: number;
  passed: number;
  failed: number;
  volumePaid: bigint;
  volumeSlashed: bigint;
}

export interface Candidate {
  offer: OfferView;
  stats: AgentStats;
  label?: string;
}

export interface BuyerPolicy {
  /** Won't pay more than this for the job. */
  maxPrice: bigint;
  /** Minimum bondSlice/price. Below this the bond is decorative. */
  minCoverage: number;
  /** Hard ceiling on estimated failure probability. */
  maxFailureRate: number;
  /** What one failed attempt costs the buyer in delay, in micro-USDC. */
  delayCost: bigint;
}

export const DEFAULT_POLICY: BuyerPolicy = {
  maxPrice: 2_000_000n, // $2.00
  minCoverage: 0.25, // bond must cover >= 25% of the fee
  maxFailureRate: 0.5,
  delayCost: 400_000n, // a redo is worth $0.40 of waiting
};

export interface Assessment {
  offerId: bigint;
  agent: Address;
  label?: string;
  price: bigint;
  bondSlice: bigint;
  coverage: number;
  passRate: number;
  /** micro-USDC; lower is better. Only meaningful when eligible. */
  expectedCost: number;
  eligible: boolean;
  rejections: string[];
}

/**
 * Laplace-smoothed pass rate. An agent with no history lands at 0.5 rather
 * than a perfect 1.0, so a brand-new agent can't look flawless — it has to
 * earn its record. One failure out of one job reads as 0.33, not 0.0.
 */
export function smoothedPassRate(stats: AgentStats): number {
  return (stats.passed + 1) / (stats.jobs + 2);
}

export function assess(c: Candidate, policy: BuyerPolicy = DEFAULT_POLICY): Assessment {
  const { offer, stats } = c;
  const rejections: string[] = [];

  const coverage = offer.price === 0n ? 0 : Number(offer.bondSlice) / Number(offer.price);
  const q = smoothedPassRate(stats);
  const failureRate = 1 - q;

  if (!offer.active) rejections.push("offer inactive");
  if (offer.price > policy.maxPrice) rejections.push(`price above budget`);
  if (coverage < policy.minCoverage) rejections.push(`bond covers only ${(coverage * 100).toFixed(0)}% of fee`);
  if (failureRate > policy.maxFailureRate) rejections.push(`failure rate ${(failureRate * 100).toFixed(0)}% too high`);
  // The hire() call reverts if the agent can't reserve the slice — check first
  // rather than burn gas discovering it.
  if (stats.available < offer.bondSlice) rejections.push("insufficient free bond to cover the slice");

  // Compensation offsets delay but can never exceed it — see the header note.
  const uncovered = Math.max(0, Number(policy.delayCost) - Number(offer.bondSlice));
  const expectedCost = Number(offer.price) + (failureRate / q) * uncovered;

  return {
    offerId: offer.offerId,
    agent: offer.agent,
    label: c.label,
    price: offer.price,
    bondSlice: offer.bondSlice,
    coverage,
    passRate: q,
    expectedCost: Math.round(expectedCost),
    eligible: rejections.length === 0,
    rejections,
  };
}

/**
 * Eligible offers first, then cheapest expected cost. When a fully-covering
 * bond flattens the risk premium and two offers tie on cost, the better track
 * record wins — reputation is the tiebreak, not the entry fee.
 */
export function rank(candidates: Candidate[], policy: BuyerPolicy = DEFAULT_POLICY): Assessment[] {
  return candidates
    .map((c) => assess(c, policy))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      if (a.expectedCost !== b.expectedCost) return a.expectedCost - b.expectedCost;
      return b.passRate - a.passRate;
    });
}

export function choose(candidates: Candidate[], policy: BuyerPolicy = DEFAULT_POLICY): Assessment | null {
  const best = rank(candidates, policy)[0];
  return best && best.eligible ? best : null;
}
