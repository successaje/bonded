// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title BondVault — each agent's staked USDC performance bond
/// @notice Agents stake USDC as capital-at-risk behind their SLAs. The
///         JobEscrow locks a slice per active job and can slash it straight
///         to the wronged buyer. An agent can only withdraw bond that no
///         active job has reserved.
/// @dev Amounts are 6-decimal USDC (Arc's ERC-20 view of native USDC).
///      v1 has no unbonding delay; adding one is on the roadmap so a track
///      record can't be abandoned the moment the last job settles.
contract BondVault {
    IERC20 public immutable usdc;
    address public immutable deployer;
    address public escrow; // JobEscrow, wired once at deployment

    mapping(address => uint256) public staked; // total bond per agent
    mapping(address => uint256) public locked; // portion reserved by active jobs

    event Staked(address indexed agent, uint256 amount);
    event Withdrawn(address indexed agent, uint256 amount);
    event Locked(address indexed agent, uint256 amount);
    event Unlocked(address indexed agent, uint256 amount);
    event Slashed(address indexed agent, address indexed to, uint256 amount);

    error NotEscrow();
    error NotDeployer();
    error EscrowAlreadySet();
    error InsufficientAvailable();
    error InsufficientLocked();
    error TransferFailed();
    error ZeroAmount();

    modifier onlyEscrow() {
        if (msg.sender != escrow) revert NotEscrow();
        _;
    }

    constructor(IERC20 usdc_) {
        usdc = usdc_;
        deployer = msg.sender;
    }

    function setEscrow(address escrow_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (escrow != address(0)) revert EscrowAlreadySet();
        escrow = escrow_;
    }

    function stake(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        staked[msg.sender] += amount;
        if (!usdc.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraw bond not reserved by any active job.
    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (amount > availableBond(msg.sender)) revert InsufficientAvailable();
        staked[msg.sender] -= amount;
        if (!usdc.transfer(msg.sender, amount)) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Reserve a slice of the agent's bond for a newly funded job.
    function lock(address agent, uint256 amount) external onlyEscrow {
        if (amount > availableBond(agent)) revert InsufficientAvailable();
        locked[agent] += amount;
        emit Locked(agent, amount);
    }

    /// @notice Release a reserved slice after a job passes.
    function unlock(address agent, uint256 amount) external onlyEscrow {
        if (amount > locked[agent]) revert InsufficientLocked();
        locked[agent] -= amount;
        emit Unlocked(agent, amount);
    }

    /// @notice Move a reserved slice of the agent's bond to `to` — the
    ///         compensation path when an SLA is broken.
    function slash(address agent, address to, uint256 amount) external onlyEscrow {
        if (amount > locked[agent]) revert InsufficientLocked();
        locked[agent] -= amount;
        staked[agent] -= amount;
        if (!usdc.transfer(to, amount)) revert TransferFailed();
        emit Slashed(agent, to, amount);
    }

    /// @notice Bond the agent could still commit to new jobs (or withdraw).
    function availableBond(address agent) public view returns (uint256) {
        return staked[agent] - locked[agent];
    }
}
