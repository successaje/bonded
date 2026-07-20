// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {BondVault} from "../src/BondVault.sol";

contract BondVaultTest is Test {
    MockUSDC usdc;
    BondVault vault;

    address agent = makeAddr("agent");
    address wrongedBuyer = makeAddr("wrongedBuyer");
    address rando = makeAddr("rando");

    function setUp() public {
        usdc = new MockUSDC();
        vault = new BondVault(IERC20(address(usdc)));
        // The test contract plays the escrow role for unit-level access.
        vault.setEscrow(address(this));

        usdc.mint(agent, 100e6);
        vm.startPrank(agent);
        usdc.approve(address(vault), type(uint256).max);
        vault.stake(100e6);
        vm.stopPrank();
    }

    function test_StakeWithdrawRoundtrip() public {
        assertEq(vault.staked(agent), 100e6);
        assertEq(vault.availableBond(agent), 100e6);
        vm.prank(agent);
        vault.withdraw(40e6);
        assertEq(vault.staked(agent), 60e6);
        assertEq(usdc.balanceOf(agent), 40e6);
    }

    function test_LockedBondCannotBeWithdrawn() public {
        vault.lock(agent, 60e6);
        assertEq(vault.availableBond(agent), 40e6);

        vm.prank(agent);
        vm.expectRevert(BondVault.InsufficientAvailable.selector);
        vault.withdraw(50e6);

        vm.prank(agent);
        vault.withdraw(40e6); // the unreserved remainder is fine
        assertEq(vault.staked(agent), 60e6);
    }

    function test_LockBeyondAvailableReverts() public {
        vault.lock(agent, 80e6);
        vm.expectRevert(BondVault.InsufficientAvailable.selector);
        vault.lock(agent, 30e6);
    }

    function test_SlashPaysTheBuyerAndShrinksTheBond() public {
        vault.lock(agent, 25e6);
        vault.slash(agent, wrongedBuyer, 25e6);
        assertEq(usdc.balanceOf(wrongedBuyer), 25e6);
        assertEq(vault.staked(agent), 75e6);
        assertEq(vault.locked(agent), 0);
    }

    function test_UnlockRestoresAvailability() public {
        vault.lock(agent, 25e6);
        vault.unlock(agent, 25e6);
        assertEq(vault.availableBond(agent), 100e6);
    }

    function test_OnlyEscrowMayLockUnlockSlash() public {
        vm.startPrank(rando);
        vm.expectRevert(BondVault.NotEscrow.selector);
        vault.lock(agent, 1);
        vm.expectRevert(BondVault.NotEscrow.selector);
        vault.unlock(agent, 1);
        vm.expectRevert(BondVault.NotEscrow.selector);
        vault.slash(agent, rando, 1);
        vm.stopPrank();
    }

    function test_EscrowWiringIsOnceOnly() public {
        vm.expectRevert(BondVault.EscrowAlreadySet.selector);
        vault.setEscrow(rando);

        BondVault fresh = new BondVault(IERC20(address(usdc)));
        vm.prank(rando);
        vm.expectRevert(BondVault.NotDeployer.selector);
        fresh.setEscrow(rando);
    }

    function test_ZeroAmountGuards() public {
        vm.startPrank(agent);
        vm.expectRevert(BondVault.ZeroAmount.selector);
        vault.stake(0);
        vm.expectRevert(BondVault.ZeroAmount.selector);
        vault.withdraw(0);
        vm.stopPrank();
    }
}
