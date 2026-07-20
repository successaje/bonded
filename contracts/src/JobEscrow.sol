// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "./interfaces/IERC20.sol";
import {IAcceptanceChecker} from "./interfaces/IAcceptanceChecker.sol";
import {BondVault} from "./BondVault.sol";
import {SLARegistry} from "./SLARegistry.sol";
import {UnderwriterPool} from "./UnderwriterPool.sol";
import {OutcomeLog} from "./OutcomeLog.sol";

/// @title JobEscrow — funds a job against a published SLA and settles it
/// @notice The lifecycle: a buyer funds a job at the offer's price and a slice
///         of the agent's bond locks alongside it. The agent delivers before
///         the deadline. Acceptance is deterministic where possible (checker
///         contract), optimistic otherwise (dispute window; silence is
///         consent). Pass: agent is paid, premium flows to underwriters, bond
///         unlocks. Fail (bad delivery, missed deadline, or upheld dispute):
///         the buyer is refunded the full price PLUS the bond slice —
///         compensation, not just a refund — in one sub-second settlement.
/// @dev Amounts are 6-decimal USDC (Arc's ERC-20 view of native USDC).
///      Disputes resolve via a fixed arbiter in v1; an optimistic oracle
///      (e.g. UMA, already live on Arc) is the planned replacement.
contract JobEscrow {
    enum State {
        None,
        Funded,
        Delivered,
        Disputed,
        Passed,
        Failed
    }

    struct Job {
        uint64 offerId;
        address buyer;
        address agent;
        uint96 price;
        uint96 bondSlice;
        uint96 premium;
        uint40 fundedAt;
        uint40 deliveredAt;
        uint32 deliveryWindow;
        uint32 disputeWindow;
        address checker;
        bytes32 criteriaHash;
        bytes32 deliverableHash;
        State state;
    }

    IERC20 public immutable usdc;
    BondVault public immutable vault;
    SLARegistry public immutable registry;
    UnderwriterPool public immutable pool;
    OutcomeLog public immutable outcomes;
    address public immutable arbiter;

    uint64 public nextJobId = 1;
    mapping(uint64 => Job) internal jobs;

    uint256 private entered;

    event JobFunded(
        uint64 indexed jobId, uint64 indexed offerId, address indexed buyer, address agent, uint96 price, uint96 bondSlice
    );
    event WorkDelivered(uint64 indexed jobId, bytes32 deliverableHash);
    event JobDisputed(uint64 indexed jobId);
    event JobPassed(uint64 indexed jobId, uint256 paidToAgent, uint256 premium);
    event JobFailed(uint64 indexed jobId, uint256 refundedToBuyer, uint256 slashedToBuyer);

    error OfferInactive();
    error BadState();
    error NotAgent();
    error NotBuyer();
    error NotArbiter();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error WindowOpen();
    error WindowClosed();
    error Reentrancy();
    error TransferFailed();

    modifier nonReentrant() {
        if (entered == 1) revert Reentrancy();
        entered = 1;
        _;
        entered = 0;
    }

    constructor(
        IERC20 usdc_,
        BondVault vault_,
        SLARegistry registry_,
        UnderwriterPool pool_,
        OutcomeLog outcomes_,
        address arbiter_
    ) {
        usdc = usdc_;
        vault = vault_;
        registry = registry_;
        pool = pool_;
        outcomes = outcomes_;
        arbiter = arbiter_;
    }

    /// @notice Fund a job against an active offer. Pulls the price from the
    ///         buyer and reserves the offer's bond slice in the vault.
    function hire(uint64 offerId) external nonReentrant returns (uint64 jobId) {
        SLARegistry.Offer memory o = registry.getOffer(offerId);
        if (!o.active) revert OfferInactive();

        jobId = nextJobId++;
        jobs[jobId] = Job({
            offerId: offerId,
            buyer: msg.sender,
            agent: o.agent,
            price: o.price,
            bondSlice: o.bondSlice,
            premium: o.premium,
            fundedAt: uint40(block.timestamp),
            deliveredAt: 0,
            deliveryWindow: o.deliveryWindow,
            disputeWindow: o.disputeWindow,
            checker: o.checker,
            criteriaHash: o.criteriaHash,
            deliverableHash: bytes32(0),
            state: State.Funded
        });

        vault.lock(o.agent, o.bondSlice);
        if (!usdc.transferFrom(msg.sender, address(this), o.price)) revert TransferFailed();
        emit JobFunded(jobId, offerId, msg.sender, o.agent, o.price, o.bondSlice);
    }

    /// @notice Agent submits the deliverable. Submitting work that fails the
    ///         offer's own acceptance check settles against the agent on the
    ///         spot — delivery is putting your bond where your mouth is.
    ///         Passing the check settles instantly when the offer has no
    ///         dispute window, or opens the window when it has one.
    function deliver(uint64 jobId, bytes32 deliverableHash, bytes calldata evidence) external nonReentrant {
        Job storage j = jobs[jobId];
        if (j.state != State.Funded) revert BadState();
        if (msg.sender != j.agent) revert NotAgent();
        if (block.timestamp > uint256(j.fundedAt) + j.deliveryWindow) revert DeadlinePassed();

        j.deliverableHash = deliverableHash;
        j.deliveredAt = uint40(block.timestamp);

        if (j.checker != address(0)) {
            bool ok = IAcceptanceChecker(j.checker).verify(j.criteriaHash, deliverableHash, evidence);
            if (!ok) {
                _fail(jobId, j);
                return;
            }
            if (j.disputeWindow == 0) {
                _pass(jobId, j);
                return;
            }
        }
        j.state = State.Delivered;
        emit WorkDelivered(jobId, deliverableHash);
    }

    /// @notice The buyer can settle (accept) at any time after delivery;
    ///         anyone can settle once the dispute window has lapsed —
    ///         silence is consent.
    function settle(uint64 jobId) external nonReentrant {
        Job storage j = jobs[jobId];
        if (j.state != State.Delivered) revert BadState();
        if (msg.sender != j.buyer && block.timestamp <= uint256(j.deliveredAt) + j.disputeWindow) {
            revert WindowOpen();
        }
        _pass(jobId, j);
    }

    function dispute(uint64 jobId) external {
        Job storage j = jobs[jobId];
        if (j.state != State.Delivered) revert BadState();
        if (msg.sender != j.buyer) revert NotBuyer();
        if (block.timestamp > uint256(j.deliveredAt) + j.disputeWindow) revert WindowClosed();
        j.state = State.Disputed;
        emit JobDisputed(jobId);
    }

    function resolve(uint64 jobId, bool buyerWins) external nonReentrant {
        Job storage j = jobs[jobId];
        if (j.state != State.Disputed) revert BadState();
        if (msg.sender != arbiter) revert NotArbiter();
        if (buyerWins) _fail(jobId, j);
        else _pass(jobId, j);
    }

    /// @notice Deadline passed with nothing delivered — anyone may claim the
    ///         timeout on the buyer's behalf.
    function claimTimeout(uint64 jobId) external nonReentrant {
        Job storage j = jobs[jobId];
        if (j.state != State.Funded) revert BadState();
        if (block.timestamp <= uint256(j.fundedAt) + j.deliveryWindow) revert DeadlineNotPassed();
        _fail(jobId, j);
    }

    function getJob(uint64 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }

    function _pass(uint64 jobId, Job storage j) internal {
        j.state = State.Passed;
        uint256 toAgent = uint256(j.price) - j.premium;
        vault.unlock(j.agent, j.bondSlice);
        if (!usdc.transfer(j.agent, toAgent)) revert TransferFailed();
        if (j.premium > 0) {
            if (!usdc.transfer(address(pool), j.premium)) revert TransferFailed();
            pool.notifyPremium(j.agent, jobId, j.premium);
        }
        outcomes.record(jobId, j.agent, j.buyer, true, toAgent, 0, j.deliverableHash);
        emit JobPassed(jobId, toAgent, j.premium);
    }

    function _fail(uint64 jobId, Job storage j) internal {
        j.state = State.Failed;
        vault.slash(j.agent, j.buyer, j.bondSlice);
        if (!usdc.transfer(j.buyer, j.price)) revert TransferFailed();
        outcomes.record(jobId, j.agent, j.buyer, false, 0, j.bondSlice, j.deliverableHash);
        emit JobFailed(jobId, j.price, j.bondSlice);
    }
}
