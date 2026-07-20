// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title UnderwriterPool — LPs deposit USDC and earn premiums from settled jobs
/// @notice Every passed job routes a premium here, so pool yield is generated
///         by real work, not emissions. v1 is a single shared pool that only
///         accrues premiums; using pool capital to co-sign bonds for agents
///         that can't fully self-stake is the roadmap (see README).
/// @dev Share math is the standard proportional-vault scheme. v1 notes:
///      premiums that arrive while the pool is empty are captured by the
///      first depositor, and no first-depositor inflation guard is included —
///      acceptable on testnet, listed under hardening in the README.
contract UnderwriterPool {
    IERC20 public immutable usdc;
    address public immutable deployer;
    address public escrow; // JobEscrow, wired once at deployment

    uint256 public totalShares;
    uint256 public totalAssets; // internal accounting, 6-decimal USDC
    mapping(address => uint256) public shares;

    event Deposited(address indexed lp, uint256 assets, uint256 sharesMinted);
    event Withdrawn(address indexed lp, uint256 assets, uint256 sharesBurned);
    event PremiumReceived(address indexed agent, uint64 indexed jobId, uint256 amount);

    error NotEscrow();
    error NotDeployer();
    error EscrowAlreadySet();
    error ZeroAmount();
    error InsufficientShares();
    error TransferFailed();

    constructor(IERC20 usdc_) {
        usdc = usdc_;
        deployer = msg.sender;
    }

    function setEscrow(address escrow_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (escrow != address(0)) revert EscrowAlreadySet();
        escrow = escrow_;
    }

    function deposit(uint256 assets) external returns (uint256 minted) {
        if (assets == 0) revert ZeroAmount();
        minted = totalShares == 0 ? assets : (assets * totalShares) / totalAssets;
        totalShares += minted;
        totalAssets += assets;
        shares[msg.sender] += minted;
        if (!usdc.transferFrom(msg.sender, address(this), assets)) revert TransferFailed();
        emit Deposited(msg.sender, assets, minted);
    }

    function withdraw(uint256 sharesToBurn) external returns (uint256 assets) {
        if (sharesToBurn == 0 || sharesToBurn > shares[msg.sender]) revert InsufficientShares();
        assets = (sharesToBurn * totalAssets) / totalShares;
        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalAssets -= assets;
        if (!usdc.transfer(msg.sender, assets)) revert TransferFailed();
        emit Withdrawn(msg.sender, assets, sharesToBurn);
    }

    /// @notice Credited by the JobEscrow, which transfers the premium USDC
    ///         here before calling. Raises the value of every share.
    function notifyPremium(address agent, uint64 jobId, uint256 amount) external {
        if (msg.sender != escrow) revert NotEscrow();
        totalAssets += amount;
        emit PremiumReceived(agent, jobId, amount);
    }

    /// @notice USDC the LP would receive for burning all their shares today.
    function previewWithdraw(address lp) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lp] * totalAssets) / totalShares;
    }
}
