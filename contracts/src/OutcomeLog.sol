// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title OutcomeLog — every settlement, recorded where anyone can read it
/// @notice One event per settled job plus running per-agent counters. This is
///         the reputation feed: an agent's bonded history (jobs, passes,
///         slashes, volumes) is public, portable, and consumable as an
///         ERC-8004 reputation signal by any marketplace.
contract OutcomeLog {
    struct TrackRecord {
        uint64 jobs;
        uint64 passed;
        uint64 failed;
        uint128 volumePaid; // USDC earned across passed jobs
        uint128 volumeSlashed; // USDC paid to buyers across failed jobs
    }

    address public immutable deployer;
    address public escrow; // JobEscrow, wired once at deployment

    mapping(address => TrackRecord) internal records;

    event OutcomeRecorded(
        uint64 indexed jobId,
        address indexed agent,
        address indexed buyer,
        bool passed,
        uint256 paidToAgent,
        uint256 slashedToBuyer,
        bytes32 deliverableHash
    );

    error NotEscrow();
    error NotDeployer();
    error EscrowAlreadySet();

    constructor() {
        deployer = msg.sender;
    }

    function setEscrow(address escrow_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (escrow != address(0)) revert EscrowAlreadySet();
        escrow = escrow_;
    }

    function record(
        uint64 jobId,
        address agent,
        address buyer,
        bool passed,
        uint256 paidToAgent,
        uint256 slashedToBuyer,
        bytes32 deliverableHash
    ) external {
        if (msg.sender != escrow) revert NotEscrow();
        TrackRecord storage r = records[agent];
        r.jobs += 1;
        if (passed) {
            r.passed += 1;
            r.volumePaid += uint128(paidToAgent);
        } else {
            r.failed += 1;
            r.volumeSlashed += uint128(slashedToBuyer);
        }
        emit OutcomeRecorded(jobId, agent, buyer, passed, paidToAgent, slashedToBuyer, deliverableHash);
    }

    function trackRecord(address agent) external view returns (TrackRecord memory) {
        return records[agent];
    }
}
