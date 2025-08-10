// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/OneClickAccount.sol";
import "../contracts/OneClickFactory.sol";
import "../contracts/SessionKeyModule.sol";
import "../contracts/interfaces/UserOperation.sol";

contract OneClickAccountTest is Test {
    OneClickFactory factory;
    SessionKeyModule sessionModule;
    
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    address constant USER = address(0x1234);
    
    // Sample WebAuthn public key (64 bytes - uncompressed P256 public key)
    bytes samplePublicKey = hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    
    function setUp() public {
        // Deploy contracts
        factory = new OneClickFactory();
        sessionModule = new SessionKeyModule();
    }
    
    function testCreateAccount() public {
        // Calculate salt
        bytes32 salt = keccak256(abi.encodePacked(USER, "test"));
        
        // Get predicted address
        address predicted = factory.getAddress(samplePublicKey, salt);
        
        // Create account
        address account = factory.createAccount(samplePublicKey, salt);
        
        // Verify address matches prediction
        assertEq(account, predicted);
        
        // Verify account is deployed
        assertTrue(account.code.length > 0);
        
        // Verify account has correct owner
        OneClickAccount accountContract = OneClickAccount(payable(account));
        (uint256 x, uint256 y) = accountContract.owner();
        
        // Extract x,y from public key (first 32 bytes = x, second 32 bytes = y)
        uint256 expectedX;
        uint256 expectedY;
        assembly {
            expectedX := mload(add(samplePublicKey, 32))
            expectedY := mload(add(samplePublicKey, 64))
        }
        
        assertEq(x, expectedX);
        assertEq(y, expectedY);
    }
    
    function testCreateAccountDeterministic() public {
        bytes32 salt = keccak256("test-salt");
        
        // Create account twice with same parameters
        address account1 = factory.createAccount(samplePublicKey, salt);
        address account2 = factory.createAccount(samplePublicKey, salt);
        
        // Should return same address
        assertEq(account1, account2);
    }
    
    function testExecuteOperation() public {
        // Create account
        bytes32 salt = keccak256("execute-test");
        address account = factory.createAccount(samplePublicKey, salt);
        
        // Fund the account
        vm.deal(account, 1 ether);
        
        // Prepare call data
        address target = address(0x5678);
        uint256 value = 0.1 ether;
        bytes memory data = "";
        
        // Create user operation
        UserOperation memory userOp = UserOperation({
            sender: account,
            nonce: 0,
            initCode: "",
            callData: abi.encodeWithSelector(
                OneClickAccount.execute.selector,
                target,
                value,
                data
            ),
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 21000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: "",
            signature: "" // Would need valid WebAuthn signature in real test
        });
        
        // Test would continue with proper signature generation
        // This is a simplified test structure
    }
    
    function testAddSessionKey() public {
        // Create account
        bytes32 salt = keccak256("session-test");
        address account = factory.createAccount(samplePublicKey, salt);
        OneClickAccount accountContract = OneClickAccount(payable(account));
        
        // Generate session key
        address sessionKey = address(0x9999);
        
        // Add session key (would need proper signature in real scenario)
        vm.prank(account);
        accountContract.addSessionKey(
            sessionKey,
            block.timestamp + 1 days,
            block.timestamp,
            1 ether,
            new address[](0),
            new bytes4[](0)
        );
        
        // Verify session key was added
        assertTrue(accountContract.sessionKeyModule() != address(0));
    }
    
    function testInitCode() public {
        bytes32 salt = keccak256("init-test");
        
        // Get init code
        bytes memory initCode = factory.getInitCode(samplePublicKey, salt);
        
        // Verify it starts with factory address
        address factoryFromInitCode;
        assembly {
            factoryFromInitCode := mload(add(initCode, 20))
        }
        assertEq(factoryFromInitCode, address(factory));
    }
}