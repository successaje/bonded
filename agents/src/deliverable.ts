import { encodeAbiParameters, keccak256, parseAbiParameters, toHex, type Hex } from "viem";

/**
 * The bridge between the work an agent actually does and what the chain can
 * check. `AuditChecker` on Arc accepts a job only if all three hold:
 *
 *   1. the criteria in the evidence hash to the offer's committed
 *      `criteriaHash` — the agent cannot quietly lower the bar it sold;
 *   2. the evidence hashes to the delivered `deliverableHash` — the claims
 *      are bound to exactly one artifact;
 *   3. the claimed results clear the committed minimums and cohere
 *      (the high-confidence floor can never exceed the headline).
 *
 * Everything else about report quality is what the optimistic dispute window
 * is for. We are deliberately not claiming an on-chain judge of prose.
 */

/** What every audit offer in this demo commits to delivering. */
export const AUDIT_CRITERIA = {
  minRecoverableCents: 200_000n, // >= $2,000/yr of recoverable spend found
  minHighConfidenceCents: 100_000n, // >= $1,000/yr backed by direct evidence
  minFindings: 3n,
} as const;

export const AUDIT_CRITERIA_HASH: Hex = keccak256(
  encodeAbiParameters(parseAbiParameters("uint256, uint256, uint256"), [
    AUDIT_CRITERIA.minRecoverableCents,
    AUDIT_CRITERIA.minHighConfidenceCents,
    AUDIT_CRITERIA.minFindings,
  ]),
);

/** The headline numbers an audit report claims. */
export interface AuditClaim {
  recoverableCents: bigint;
  highConfidenceCents: bigint;
  findings: bigint;
  /** hash of the actual markdown/JSON deliverable handed to the buyer */
  reportHash: Hex;
}

export interface Deliverable {
  evidence: Hex;
  deliverableHash: Hex;
  claim: AuditClaim;
}

export function buildDeliverable(claim: AuditClaim): Deliverable {
  const evidence = encodeAbiParameters(
    parseAbiParameters("uint256, uint256, uint256, uint256, uint256, uint256, bytes32"),
    [
      AUDIT_CRITERIA.minRecoverableCents,
      AUDIT_CRITERIA.minHighConfidenceCents,
      AUDIT_CRITERIA.minFindings,
      claim.recoverableCents,
      claim.highConfidenceCents,
      claim.findings,
      claim.reportHash,
    ],
  );
  return { evidence, deliverableHash: keccak256(evidence), claim };
}

/**
 * Leak's real audit output on its demo dataset — $5,693.88/yr recoverable
 * with a $2,969.88/yr high-confidence floor across 5 findings. These totals
 * are locked by tests in the Leak repo, which is exactly why the work is
 * bondable: the deliverable is deterministic, so acceptance can be too.
 *
 * Wiring the live engine in means replacing this constant with the parsed
 * output of `npm run audit -- charges.json` — the shape is identical.
 */
export const LEAK_AUDIT: AuditClaim = {
  recoverableCents: 569_388n,
  highConfidenceCents: 296_988n,
  findings: 5n,
  reportHash: keccak256(toHex("leak-audit-report-v1")),
};

/** A thin, under-delivering report — clears nothing, and the chain knows it. */
export function degradedAudit(nonce: number): AuditClaim {
  return {
    recoverableCents: 120_000n,
    highConfidenceCents: 80_000n,
    findings: 1n,
    reportHash: keccak256(toHex(`leak-audit-report-thin-${nonce}`)),
  };
}

/** Does this claim actually satisfy the SLA? Mirrors AuditChecker exactly. */
export function meetsCriteria(claim: AuditClaim): boolean {
  return (
    claim.recoverableCents >= AUDIT_CRITERIA.minRecoverableCents &&
    claim.highConfidenceCents >= AUDIT_CRITERIA.minHighConfidenceCents &&
    claim.findings >= AUDIT_CRITERIA.minFindings &&
    claim.highConfidenceCents <= claim.recoverableCents
  );
}
