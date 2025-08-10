// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/OneClickAccount.sol";
import "../contracts/OneClickFactory.sol";
import "../contracts/SessionKeyModule.sol";

contract DeployScript is Script {
    // ERC-4337 EntryPoint on XLayer
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Factory
        OneClickFactory factory = new OneClickFactory();
        console.log("OneClickFactory deployed at:", address(factory));

        // 2. Deploy SessionKeyModule (optional)
        SessionKeyModule sessionModule = new SessionKeyModule();
        console.log("SessionKeyModule deployed at:", address(sessionModule));

        // Note: OneClickAccount instances are deployed via the factory using CREATE2
        // No need to deploy an implementation contract separately

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Network: XLayer");
        console.log("EntryPoint:", ENTRY_POINT);
        console.log("OneClickFactory:", address(factory));
        console.log("SessionKeyModule:", address(sessionModule));
        console.log("========================\n");
        
        // Example: Create a sample account to verify deployment
        console.log("\n=== Verification ===");
        bytes memory samplePublicKey = hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        bytes32 sampleSalt = keccak256("test-account");
        address predictedAddress = factory.getAddress(samplePublicKey, sampleSalt);
        console.log("Sample account would be deployed at:", predictedAddress);
        console.log("==================\n");
    }
}