// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./OneClickAccount.sol";

/**
 * @title OneClickFactory
 * @notice Factory for deploying OneClick smart accounts using CREATE2
 * @dev Deploys accounts with deterministic addresses based on email and passkey
 */
contract OneClickFactory {
    // Events
    event AccountCreated(address indexed account, address indexed owner, bytes32 salt);
    
    // Errors
    error DeploymentFailed();
    
    // XLayer EntryPoint address
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    /**
     * @dev Create a new OneClick account
     * @param publicKey The passkey public key (64 bytes uncompressed)
     * @param salt Unique salt for deterministic deployment
     * @return account The deployed account address
     */
    function createAccount(
        bytes memory publicKey,
        bytes32 salt
    ) external returns (address account) {
        // Calculate deterministic address
        account = getAddress(publicKey, salt);
        
        // Check if already deployed
        if (account.code.length > 0) {
            return account;
        }
        
        // Deploy using CREATE2
        bytes memory bytecode = abi.encodePacked(
            type(OneClickAccount).creationCode,
            abi.encode(ENTRY_POINT, publicKey)
        );
        
        assembly {
            account := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        if (account == address(0)) {
            revert DeploymentFailed();
        }
        
        emit AccountCreated(account, msg.sender, salt);
    }
    
    /**
     * @dev Get the deterministic address for an account
     * @param publicKey The passkey public key
     * @param salt The salt value
     * @return The account address
     */
    function getAddress(
        bytes memory publicKey,
        bytes32 salt
    ) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(OneClickAccount).creationCode,
            abi.encode(ENTRY_POINT, publicKey)
        );
        
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        
        return address(uint160(uint256(hash)));
    }
    
    /**
     * @dev Create initialization code for UserOperation
     * @param publicKey The passkey public key
     * @param salt The salt value
     * @return The initialization code
     */
    function getInitCode(
        bytes memory publicKey,
        bytes32 salt
    ) external view returns (bytes memory) {
        return abi.encodePacked(
            address(this),
            abi.encodeWithSignature(
                "createAccount(bytes,bytes32)",
                publicKey,
                salt
            )
        );
    }
}