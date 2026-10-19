// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AirPaySettlement} from "../src/AirPaySettlement.sol";

/**
 * Deploys the settlement contract.
 *
 * Required env:
 *   SETTLEMENT_ADMIN_PRIVATE_KEY  deployer + initial owner key
 *   SETTLEMENT_OWNER              on-chain owner (defaults to deployer)
 *   SETTLEMENT_TREASURY           platform fee recipient
 *
 * Usage:
 *   forge script script/Deploy.s.sol \
 *     --rpc-url base_sepolia --broadcast --verify
 */
contract DeploySettlement is Script {
    function run() external returns (AirPaySettlement settlement) {
        uint256 pk = vm.envUint("SETTLEMENT_ADMIN_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address initialOwner = vm.envOr("SETTLEMENT_OWNER", deployer);
        address treasury = vm.envAddress("SETTLEMENT_TREASURY");

        vm.startBroadcast(pk);
        settlement = new AirPaySettlement(initialOwner, treasury);
        vm.stopBroadcast();

        console2.log("AirPaySettlement deployed at:", address(settlement));
        console2.log("  owner:   ", initialOwner);
        console2.log("  treasury:", treasury);
    }
}
