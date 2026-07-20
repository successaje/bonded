// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IAcceptanceChecker} from "../interfaces/IAcceptanceChecker.sol";

/// @title AuditChecker — deterministic acceptance for a spend-audit deliverable
/// @notice Demo checker for Bonded's first bonded agent (Leak, a financial-ops
///         audit agent). The SLA commits to minimum results; at delivery the
///         agent states what its report claims. Work passes only if:
///           1. the stated criteria hash to the offer's `criteriaHash`
///              (the agent can't quietly weaken the terms),
///           2. the evidence hashes to `deliverableHash` (the claims are
///              bound to exactly one delivered artifact), and
///           3. the claimed results meet the committed minimums and are
///              internally consistent.
///         Content quality beyond these invariants is what the optimistic
///         dispute window is for.
///
/// criteria = abi.encode(minRecoverableCents, minHighConfidenceCents, minFindings)
/// evidence = abi.encode(minRecoverableCents, minHighConfidenceCents, minFindings,
///                       recoverableCents, highConfidenceCents, findings, reportHash)
contract AuditChecker is IAcceptanceChecker {
    function verify(bytes32 criteriaHash, bytes32 deliverableHash, bytes calldata evidence)
        external
        pure
        returns (bool)
    {
        if (evidence.length != 7 * 32) return false;
        (
            uint256 minRecoverableCents,
            uint256 minHighConfidenceCents,
            uint256 minFindings,
            uint256 recoverableCents,
            uint256 highConfidenceCents,
            uint256 findings,
        ) = abi.decode(evidence, (uint256, uint256, uint256, uint256, uint256, uint256, bytes32));

        // 1. The criteria stated in the evidence must be the ones the SLA committed to.
        if (keccak256(abi.encode(minRecoverableCents, minHighConfidenceCents, minFindings)) != criteriaHash) {
            return false;
        }
        // 2. The evidence must be bound to the delivered artifact.
        if (keccak256(evidence) != deliverableHash) return false;
        // 3. The claimed results must meet the minimums and cohere: the
        //    high-confidence floor can never exceed the headline number.
        if (recoverableCents < minRecoverableCents) return false;
        if (highConfidenceCents < minHighConfidenceCents) return false;
        if (findings < minFindings) return false;
        if (highConfidenceCents > recoverableCents) return false;
        return true;
    }
}
