// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title SLARegistry — machine-readable service offers with penalty terms
/// @notice An offer is the whole deal, committed before any money moves:
///         price, how much bond backs each job, the premium underwriters
///         earn on success, the delivery deadline, the dispute window, and
///         the acceptance criteria (as a checker contract + criteria hash).
contract SLARegistry {
    struct Offer {
        address agent; // service provider
        uint96 price; // job fee, 6-decimal USDC
        uint96 bondSlice; // bond reserved per job; paid to buyer on failure
        uint96 premium; // slice of price paid to the underwriter pool on success
        uint32 deliveryWindow; // seconds the agent has to deliver after funding
        uint32 disputeWindow; // seconds the buyer has to dispute after delivery
        address checker; // IAcceptanceChecker; zero = buyer acceptance only
        bytes32 criteriaHash; // commitment to the acceptance criteria
        string uri; // human-readable SLA document
        bool active;
    }

    uint64 public nextOfferId = 1;
    mapping(uint64 => Offer) internal offers;

    event OfferPublished(
        uint64 indexed offerId, address indexed agent, uint96 price, uint96 bondSlice, address checker
    );
    event OfferActiveSet(uint64 indexed offerId, bool active);

    error NotAgent();
    error ZeroPrice();
    error PremiumExceedsPrice();
    error NoDeadline();
    error NoAcceptancePath();
    error UnknownOffer();

    function publishOffer(
        uint96 price,
        uint96 bondSlice,
        uint96 premium,
        uint32 deliveryWindow,
        uint32 disputeWindow,
        address checker,
        bytes32 criteriaHash,
        string calldata uri
    ) external returns (uint64 offerId) {
        if (price == 0) revert ZeroPrice();
        if (premium >= price) revert PremiumExceedsPrice();
        if (deliveryWindow == 0) revert NoDeadline();
        // A job must have some way to pass: a deterministic checker, a buyer
        // acceptance window, or both.
        if (checker == address(0) && disputeWindow == 0) revert NoAcceptancePath();

        offerId = nextOfferId++;
        offers[offerId] = Offer({
            agent: msg.sender,
            price: price,
            bondSlice: bondSlice,
            premium: premium,
            deliveryWindow: deliveryWindow,
            disputeWindow: disputeWindow,
            checker: checker,
            criteriaHash: criteriaHash,
            uri: uri,
            active: true
        });
        emit OfferPublished(offerId, msg.sender, price, bondSlice, checker);
    }

    function setActive(uint64 offerId, bool active) external {
        Offer storage o = offers[offerId];
        if (o.agent == address(0)) revert UnknownOffer();
        if (o.agent != msg.sender) revert NotAgent();
        o.active = active;
        emit OfferActiveSet(offerId, active);
    }

    function getOffer(uint64 offerId) external view returns (Offer memory o) {
        o = offers[offerId];
        if (o.agent == address(0)) revert UnknownOffer();
    }
}
