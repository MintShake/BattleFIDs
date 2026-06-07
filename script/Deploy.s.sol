// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TheProtocol} from "../contracts/TheProtocol.sol";

// Run:
//   forge script script/Deploy.s.sol \
//     --rpc-url base \
//     --broadcast \
//     --verify \
//     -vvvv
//
// Required env vars (.env file, never commit it):
//   PRIVATE_KEY       — deployer/admin wallet private key
//   MINTER_ADDRESS    — server hot wallet that calls mintPack
//   BASESCAN_API_KEY  — from basescan.org/myapikey
//
// Pyth Entropy on Base mainnet:
//   Contract:  0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320
//   Verify at: docs.pyth.network/entropy/contract-addresses
//
// After deploy:
//   1. Fund contract with ETH for oracle fees:
//        cast send <contract> --value 0.01ether --private-key $PRIVATE_KEY --rpc-url base
//   2. Grant MINTER_ROLE to server hot wallet (already done in constructor).

contract Deploy is Script {
    // Pyth Entropy — Base mainnet
    // Verify at: docs.pyth.network/entropy/contract-addresses
    address constant PYTH_ENTROPY = 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320;

    // 0x0 = use entropy.getDefaultProvider() at deploy time
    address constant ENTROPY_PROVIDER = address(0);

    string constant BASE_URI = "https://battle-fids.vercel.app/api/token/";

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address admin       = vm.addr(deployerKey);
        address minter      = vm.envAddress("MINTER_ADDRESS");

        vm.startBroadcast(deployerKey);

        TheProtocol protocol = new TheProtocol(
            PYTH_ENTROPY,
            ENTROPY_PROVIDER,
            BASE_URI,
            admin,
            minter
        );

        console.log("TheProtocol deployed at:", address(protocol));
        console.log("Admin (royalties + withdrawals):", admin);
        console.log("Minter (server hot wallet):", minter);
        console.log("");
        console.log("Fund oracle fees:");
        console.log(
            string(abi.encodePacked(
                "  cast send ", vm.toString(address(protocol)),
                " --value 0.01ether --private-key $PRIVATE_KEY --rpc-url base"
            ))
        );

        vm.stopBroadcast();
    }
}
