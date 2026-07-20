// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {BondVault} from "../src/BondVault.sol";
import {SLARegistry} from "../src/SLARegistry.sol";
import {UnderwriterPool} from "../src/UnderwriterPool.sol";
import {OutcomeLog} from "../src/OutcomeLog.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {AuditChecker} from "../src/checkers/AuditChecker.sol";

/// Full-lifecycle tests over the demo SLA: Leak sells a recurring-spend audit
/// for $50, backed by a $25 slice of a $500 bond, with a $1 premium to
/// underwriters. The acceptance criteria and claimed results mirror Leak's
/// locked demo dataset ($5,693.88/yr recoverable, $2,969.88/yr floor,
/// 5 findings), so the numbers judges see on-chain match the audit report.
contract BondedTest is Test {
    uint96 constant PRICE = 50e6;
    uint96 constant SLICE = 25e6;
    uint96 constant PREMIUM = 1e6;
    uint256 constant BOND = 500e6;
    uint256 constant BUYER_FUNDS = 100e6;
    uint32 constant DELIVERY_WINDOW = 1 hours;
    uint32 constant DISPUTE_WINDOW = 1 days;

    // SLA-committed minimums (report-domain cents/yr): at least $2,000
    // recoverable, at least $1,000 high-confidence, at least 3 findings.
    uint256 constant MIN_RECOVERABLE = 200_000;
    uint256 constant MIN_HIGH_CONF = 100_000;
    uint256 constant MIN_FINDINGS = 3;

    // What the delivered report actually claims (Leak's locked demo totals).
    uint256 constant CLAIM_RECOVERABLE = 569_388;
    uint256 constant CLAIM_HIGH_CONF = 296_988;
    uint256 constant CLAIM_FINDINGS = 5;

    MockUSDC usdc;
    BondVault vault;
    SLARegistry registry;
    UnderwriterPool pool;
    OutcomeLog outcomes;
    JobEscrow escrow;
    AuditChecker checker;

    address worker = makeAddr("worker");
    address buyer = makeAddr("buyer");
    address rando = makeAddr("rando");
    address arbiter = makeAddr("arbiter");

    uint64 offerDet; // deterministic: checker, no dispute window
    uint64 offerOpt; // optimistic: checker plus dispute window

    bytes32 criteriaHash;

    function setUp() public {
        usdc = new MockUSDC();
        vault = new BondVault(IERC20(address(usdc)));
        registry = new SLARegistry();
        pool = new UnderwriterPool(IERC20(address(usdc)));
        outcomes = new OutcomeLog();
        checker = new AuditChecker();
        escrow = new JobEscrow(IERC20(address(usdc)), vault, registry, pool, outcomes, arbiter);
        vault.setEscrow(address(escrow));
        pool.setEscrow(address(escrow));
        outcomes.setEscrow(address(escrow));

        criteriaHash = keccak256(abi.encode(MIN_RECOVERABLE, MIN_HIGH_CONF, MIN_FINDINGS));

        usdc.mint(worker, BOND);
        usdc.mint(buyer, BUYER_FUNDS);

        vm.startPrank(worker);
        usdc.approve(address(vault), type(uint256).max);
        vault.stake(BOND);
        offerDet = registry.publishOffer(
            PRICE, SLICE, PREMIUM, DELIVERY_WINDOW, 0, address(checker), criteriaHash, "ipfs://bonded-sla-audit-v1"
        );
        offerOpt = registry.publishOffer(
            PRICE,
            SLICE,
            PREMIUM,
            DELIVERY_WINDOW,
            DISPUTE_WINDOW,
            address(checker),
            criteriaHash,
            "ipfs://bonded-sla-audit-v1"
        );
        vm.stopPrank();

        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ---------- helpers ----------

    function goodEvidence() internal pure returns (bytes memory) {
        return abi.encode(
            MIN_RECOVERABLE,
            MIN_HIGH_CONF,
            MIN_FINDINGS,
            CLAIM_RECOVERABLE,
            CLAIM_HIGH_CONF,
            CLAIM_FINDINGS,
            keccak256("leak-audit-report-v1")
        );
    }

    /// A report that honestly states results below the SLA minimums.
    function badEvidence() internal pure returns (bytes memory) {
        return abi.encode(
            MIN_RECOVERABLE, MIN_HIGH_CONF, MIN_FINDINGS, 120_000, 80_000, 1, keccak256("leak-audit-report-thin")
        );
    }

    function hire(uint64 offerId) internal returns (uint64 jobId) {
        vm.prank(buyer);
        jobId = escrow.hire(offerId);
    }

    function deliver(uint64 jobId, bytes memory evidence) internal {
        vm.prank(worker);
        escrow.deliver(jobId, keccak256(evidence), evidence);
    }

    function assertFailedSettlement(uint64 jobId) internal view {
        JobEscrow.Job memory j = escrow.getJob(jobId);
        assertEq(uint256(j.state), uint256(JobEscrow.State.Failed), "state");
        // Buyer is made whole and then some: full refund plus the bond slice.
        assertEq(usdc.balanceOf(buyer), BUYER_FUNDS + SLICE, "buyer compensated");
        assertEq(vault.staked(worker), BOND - SLICE, "bond slashed");
        assertEq(vault.locked(worker), 0, "nothing left locked");
        assertEq(usdc.balanceOf(worker), 0, "agent earned nothing");
        assertEq(usdc.balanceOf(address(pool)), 0, "no premium on failure");
        assertEq(usdc.balanceOf(address(escrow)), 0, "escrow drained");
        OutcomeLog.TrackRecord memory r = outcomes.trackRecord(worker);
        assertEq(r.jobs, 1, "jobs");
        assertEq(r.failed, 1, "failed");
        assertEq(r.volumeSlashed, SLICE, "slashed volume");
    }

    // ---------- the two demo paths ----------

    function test_HappyPath_DeterministicJobSettlesInstantly() public {
        uint64 jobId = hire(offerDet);
        assertEq(vault.locked(worker), SLICE, "bond slice reserved");
        assertEq(usdc.balanceOf(address(escrow)), PRICE, "fee escrowed");

        deliver(jobId, goodEvidence());

        JobEscrow.Job memory j = escrow.getJob(jobId);
        assertEq(uint256(j.state), uint256(JobEscrow.State.Passed), "state");
        assertEq(usdc.balanceOf(worker), PRICE - PREMIUM, "worker paid $49");
        assertEq(usdc.balanceOf(address(pool)), PREMIUM, "pool earned $1");
        assertEq(pool.totalAssets(), PREMIUM, "pool accounting");
        assertEq(usdc.balanceOf(buyer), BUYER_FUNDS - PRICE, "buyer paid $50");
        assertEq(vault.staked(worker), BOND, "bond untouched");
        assertEq(vault.locked(worker), 0, "slice released");
        assertEq(usdc.balanceOf(address(escrow)), 0, "escrow drained");

        OutcomeLog.TrackRecord memory r = outcomes.trackRecord(worker);
        assertEq(r.jobs, 1, "jobs");
        assertEq(r.passed, 1, "passed");
        assertEq(r.volumePaid, PRICE - PREMIUM, "paid volume");
    }

    function test_BadDelivery_SlashesInstantly() public {
        uint64 jobId = hire(offerDet);
        deliver(jobId, badEvidence());
        assertFailedSettlement(jobId);
    }

    // ---------- the other roads to failure ----------

    function test_Timeout_AnyoneCanClaimForBuyer() public {
        uint64 jobId = hire(offerDet);
        vm.warp(block.timestamp + DELIVERY_WINDOW + 1);
        vm.prank(rando);
        escrow.claimTimeout(jobId);
        assertFailedSettlement(jobId);
    }

    function test_DeliverAfterDeadlineReverts() public {
        uint64 jobId = hire(offerDet);
        vm.warp(block.timestamp + DELIVERY_WINDOW + 1);
        bytes memory evidence = goodEvidence();
        vm.prank(worker);
        vm.expectRevert(JobEscrow.DeadlinePassed.selector);
        escrow.deliver(jobId, keccak256(evidence), evidence);
    }

    function test_TamperedCriteria_FailsEvenWithBigClaims() public {
        // The agent tries to settle against weaker minimums than the SLA
        // committed to. The evidence hashes to the deliverable, the claims
        // are huge — but the criteria don't match the offer's commitment.
        uint64 jobId = hire(offerDet);
        bytes memory tampered = abi.encode(
            uint256(1),
            uint256(1),
            uint256(1),
            CLAIM_RECOVERABLE,
            CLAIM_HIGH_CONF,
            CLAIM_FINDINGS,
            keccak256("leak-audit-report-v1")
        );
        deliver(jobId, tampered);
        assertFailedSettlement(jobId);
    }

    // ---------- optimistic path (checker + dispute window) ----------

    function test_Optimistic_DeliveryOpensWindow_NoMoneyMovesYet() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        JobEscrow.Job memory j = escrow.getJob(jobId);
        assertEq(uint256(j.state), uint256(JobEscrow.State.Delivered), "state");
        assertEq(usdc.balanceOf(worker), 0, "not paid yet");
        assertEq(vault.locked(worker), SLICE, "slice still locked");
    }

    function test_Optimistic_BuyerCanSettleEarly() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        vm.prank(buyer);
        escrow.settle(jobId);
        assertEq(uint256(escrow.getJob(jobId).state), uint256(JobEscrow.State.Passed));
        assertEq(usdc.balanceOf(worker), PRICE - PREMIUM);
    }

    function test_Optimistic_SilenceIsConsent() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());

        vm.prank(rando);
        vm.expectRevert(JobEscrow.WindowOpen.selector);
        escrow.settle(jobId);

        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        vm.prank(rando);
        escrow.settle(jobId);
        assertEq(uint256(escrow.getJob(jobId).state), uint256(JobEscrow.State.Passed));
    }

    function test_Optimistic_DisputeUpheld_BuyerCompensated() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        vm.prank(buyer);
        escrow.dispute(jobId);
        vm.prank(arbiter);
        escrow.resolve(jobId, true);
        assertFailedSettlement(jobId);
    }

    function test_Optimistic_DisputeRejected_AgentPaid() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        vm.prank(buyer);
        escrow.dispute(jobId);
        vm.prank(arbiter);
        escrow.resolve(jobId, false);
        assertEq(uint256(escrow.getJob(jobId).state), uint256(JobEscrow.State.Passed));
        assertEq(usdc.balanceOf(worker), PRICE - PREMIUM);
        assertEq(vault.staked(worker), BOND);
    }

    function test_Optimistic_DisputeAfterWindowReverts() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        vm.warp(block.timestamp + DISPUTE_WINDOW + 1);
        vm.prank(buyer);
        vm.expectRevert(JobEscrow.WindowClosed.selector);
        escrow.dispute(jobId);
    }

    // ---------- guards ----------

    function test_Hire_RequiresAvailableBond() public {
        address small = makeAddr("small");
        usdc.mint(small, 10e6);
        vm.startPrank(small);
        usdc.approve(address(vault), type(uint256).max);
        vault.stake(10e6); // less than the $25 slice the offer requires
        uint64 thinOffer =
            registry.publishOffer(PRICE, SLICE, PREMIUM, DELIVERY_WINDOW, 0, address(checker), criteriaHash, "ipfs://thin");
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert(BondVault.InsufficientAvailable.selector);
        escrow.hire(thinOffer);
    }

    function test_Hire_InactiveOfferReverts() public {
        vm.prank(worker);
        registry.setActive(offerDet, false);
        vm.prank(buyer);
        vm.expectRevert(JobEscrow.OfferInactive.selector);
        escrow.hire(offerDet);
    }

    function test_OnlyAgentCanDeliver() public {
        uint64 jobId = hire(offerDet);
        bytes memory evidence = goodEvidence();
        vm.prank(rando);
        vm.expectRevert(JobEscrow.NotAgent.selector);
        escrow.deliver(jobId, keccak256(evidence), evidence);
    }

    function test_OnlyBuyerCanDispute() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        vm.prank(rando);
        vm.expectRevert(JobEscrow.NotBuyer.selector);
        escrow.dispute(jobId);
    }

    function test_OnlyArbiterCanResolve() public {
        uint64 jobId = hire(offerOpt);
        deliver(jobId, goodEvidence());
        vm.prank(buyer);
        escrow.dispute(jobId);
        vm.prank(rando);
        vm.expectRevert(JobEscrow.NotArbiter.selector);
        escrow.resolve(jobId, true);
    }

    function test_SettledJobCannotBeTouchedAgain() public {
        uint64 jobId = hire(offerDet);
        deliver(jobId, goodEvidence());
        bytes memory evidence = goodEvidence();

        vm.prank(worker);
        vm.expectRevert(JobEscrow.BadState.selector);
        escrow.deliver(jobId, keccak256(evidence), evidence);

        vm.prank(rando);
        vm.expectRevert(JobEscrow.BadState.selector);
        escrow.claimTimeout(jobId);
    }
}
