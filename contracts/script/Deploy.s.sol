// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {BondVault} from "../src/BondVault.sol";
import {SLARegistry} from "../src/SLARegistry.sol";
import {UnderwriterPool} from "../src/UnderwriterPool.sol";
import {OutcomeLog} from "../src/OutcomeLog.sol";
import {JobEscrow} from "../src/JobEscrow.sol";
import {AuditChecker} from "../src/checkers/AuditChecker.sol";

/// Deploys the Bonded protocol and wires the one-time escrow permissions.
///
///   forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
///
/// Env: PRIVATE_KEY (burner funded at https://faucet.circle.com),
///      optional USDC_ADDRESS (defaults to Arc testnet's ERC-20 view of
///      native USDC), optional ARBITER (defaults to the deployer).
contract Deploy is Script {
    address constant ARC_TESTNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address usdc = vm.envOr("USDC_ADDRESS", ARC_TESTNET_USDC);
        address arbiter = vm.envOr("ARBITER", deployer);

        vm.startBroadcast(pk);

        BondVault vault = new BondVault(IERC20(usdc));
        SLARegistry registry = new SLARegistry();
        UnderwriterPool pool = new UnderwriterPool(IERC20(usdc));
        OutcomeLog outcomes = new OutcomeLog();
        AuditChecker checker = new AuditChecker();
        JobEscrow escrow = new JobEscrow(IERC20(usdc), vault, registry, pool, outcomes, arbiter);

        vault.setEscrow(address(escrow));
        pool.setEscrow(address(escrow));
        outcomes.setEscrow(address(escrow));

        vm.stopBroadcast();

        console2.log("USDC          ", usdc);
        console2.log("BondVault     ", address(vault));
        console2.log("SLARegistry   ", address(registry));
        console2.log("UnderwriterPool", address(pool));
        console2.log("OutcomeLog    ", address(outcomes));
        console2.log("AuditChecker  ", address(checker));
        console2.log("JobEscrow     ", address(escrow));
        console2.log("Arbiter       ", arbiter);
    }
}
