// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice A deterministic acceptance check for one delivered piece of work.
///         The SLA offer commits to `criteriaHash` up front; at delivery the
///         agent submits `evidence` (structured claims about the deliverable)
///         whose hash must equal `deliverableHash`. Implementations decide
///         whether the evidence satisfies the committed criteria — pure
///         math, no oracles, no judgment calls.
interface IAcceptanceChecker {
    function verify(bytes32 criteriaHash, bytes32 deliverableHash, bytes calldata evidence)
        external
        view
        returns (bool ok);
}
