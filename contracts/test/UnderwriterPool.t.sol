// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {UnderwriterPool} from "../src/UnderwriterPool.sol";

contract UnderwriterPoolTest is Test {
    MockUSDC usdc;
    UnderwriterPool pool;

    address lpA = makeAddr("lpA");
    address lpB = makeAddr("lpB");
    address agent = makeAddr("agent");
    address rando = makeAddr("rando");

    function setUp() public {
        usdc = new MockUSDC();
        pool = new UnderwriterPool(IERC20(address(usdc)));
        // The test contract plays the escrow role for unit-level access.
        pool.setEscrow(address(this));

        usdc.mint(lpA, 1_000e6);
        usdc.mint(lpB, 1_000e6);
        vm.prank(lpA);
        usdc.approve(address(pool), type(uint256).max);
        vm.prank(lpB);
        usdc.approve(address(pool), type(uint256).max);
    }

    /// Simulates what JobEscrow does on a passed job: transfer the premium
    /// in, then notify the pool.
    function payPremium(uint256 amount) internal {
        usdc.mint(address(this), amount);
        usdc.transfer(address(pool), amount);
        pool.notifyPremium(agent, 1, amount);
    }

    function test_FirstDepositMintsOneToOne() public {
        vm.prank(lpA);
        uint256 minted = pool.deposit(100e6);
        assertEq(minted, 100e6);
        assertEq(pool.previewWithdraw(lpA), 100e6);
    }

    function test_PremiumsRaiseShareValue() public {
        vm.prank(lpA);
        pool.deposit(100e6);

        payPremium(1e6); // one settled $50 job at a $1 premium

        assertEq(pool.totalAssets(), 101e6);
        assertEq(pool.previewWithdraw(lpA), 101e6);

        // A later LP pays the higher share price and captures none of the
        // yield that predates them.
        vm.prank(lpB);
        uint256 mintedB = pool.deposit(101e6);
        assertEq(mintedB, 100e6);
        assertEq(pool.previewWithdraw(lpB), 101e6);
    }

    function test_WithdrawReturnsProportionalAssets() public {
        vm.prank(lpA);
        pool.deposit(100e6);
        payPremium(1e6);

        vm.prank(lpA);
        uint256 assets = pool.withdraw(100e6);
        assertEq(assets, 101e6);
        assertEq(usdc.balanceOf(lpA), 1_000e6 + 1e6);
        assertEq(pool.totalShares(), 0);
        assertEq(pool.totalAssets(), 0);
    }

    function test_OnlyEscrowMayNotifyPremium() public {
        vm.prank(rando);
        vm.expectRevert(UnderwriterPool.NotEscrow.selector);
        pool.notifyPremium(agent, 1, 1e6);
    }

    function test_WithdrawMoreThanSharesReverts() public {
        vm.prank(lpA);
        pool.deposit(100e6);
        vm.prank(lpA);
        vm.expectRevert(UnderwriterPool.InsufficientShares.selector);
        pool.withdraw(101e6);
    }

    function test_ZeroDepositReverts() public {
        vm.prank(lpA);
        vm.expectRevert(UnderwriterPool.ZeroAmount.selector);
        pool.deposit(0);
    }
}
