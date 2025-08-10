// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/UserOperation.sol";

/**
 * @title SessionKeyModule
 * @notice Module for temporary session keys with spending limits
 * @dev Allows delegated signing for specific operations
 */
contract SessionKeyModule {
    struct SessionKey {
        address key;
        uint256 validUntil;
        uint256 validAfter;
        uint256 spendingLimit;
        uint256 spent;
        address[] allowedTargets;
        bytes4[] allowedFunctions;
    }
    
    // Account => session key hash => SessionKey
    mapping(address => mapping(bytes32 => SessionKey)) public sessionKeys;
    
    // Events
    event SessionKeyAdded(
        address indexed account,
        bytes32 indexed keyHash,
        address key,
        uint256 validUntil,
        uint256 spendingLimit
    );
    
    event SessionKeyRevoked(address indexed account, bytes32 indexed keyHash);
    event SessionKeyUsed(address indexed account, bytes32 indexed keyHash, uint256 value);
    
    // Errors
    error UnauthorizedCaller();
    error InvalidSessionKey();
    error SessionKeyExpired();
    error SessionKeyNotYetValid();
    error SpendingLimitExceeded();
    error TargetNotAllowed();
    error FunctionNotAllowed();
    
    modifier onlyAccount() {
        if (msg.sender.code.length == 0) revert UnauthorizedCaller();
        _;
    }
    
    /**
     * @dev Add a new session key
     * @param key The session key address
     * @param validUntil Expiration timestamp
     * @param validAfter Start timestamp
     * @param spendingLimit Maximum value that can be spent
     * @param allowedTargets List of allowed contract addresses (empty = all)
     * @param allowedFunctions List of allowed function selectors (empty = all)
     */
    function addSessionKey(
        address key,
        uint256 validUntil,
        uint256 validAfter,
        uint256 spendingLimit,
        address[] calldata allowedTargets,
        bytes4[] calldata allowedFunctions
    ) external onlyAccount {
        bytes32 keyHash = getKeyHash(msg.sender, key);
        
        sessionKeys[msg.sender][keyHash] = SessionKey({
            key: key,
            validUntil: validUntil,
            validAfter: validAfter,
            spendingLimit: spendingLimit,
            spent: 0,
            allowedTargets: allowedTargets,
            allowedFunctions: allowedFunctions
        });
        
        emit SessionKeyAdded(msg.sender, keyHash, key, validUntil, spendingLimit);
    }
    
    /**
     * @dev Revoke a session key
     * @param key The session key to revoke
     */
    function revokeSessionKey(address key) external onlyAccount {
        bytes32 keyHash = getKeyHash(msg.sender, key);
        delete sessionKeys[msg.sender][keyHash];
        emit SessionKeyRevoked(msg.sender, keyHash);
    }
    
    /**
     * @dev Validate a UserOperation signed by a session key
     * @param userOp The user operation
     * @param userOpHash The operation hash
     * @return validationData 0 if valid, 1 if invalid
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) external returns (uint256 validationData) {
        // Extract session key signature (skip first byte which is 0x01)
        bytes memory sessionKeySig = new bytes(userOp.signature.length - 1);
        for (uint i = 1; i < userOp.signature.length; i++) {
            sessionKeySig[i - 1] = userOp.signature[i];
        }
        
        // Recover signer
        address signer = recoverSigner(userOpHash, sessionKeySig);
        bytes32 keyHash = getKeyHash(userOp.sender, signer);
        
        SessionKey storage sessionKey = sessionKeys[userOp.sender][keyHash];
        
        // Validate session key
        if (sessionKey.key == address(0)) revert InvalidSessionKey();
        if (block.timestamp > sessionKey.validUntil) revert SessionKeyExpired();
        if (block.timestamp < sessionKey.validAfter) revert SessionKeyNotYetValid();
        
        // Parse call data to check target and value
        (address target, uint256 value, bytes memory data) = parseCallData(userOp.callData);
        
        // Check spending limit
        if (sessionKey.spent + value > sessionKey.spendingLimit) {
            revert SpendingLimitExceeded();
        }
        
        // Check allowed targets
        if (sessionKey.allowedTargets.length > 0) {
            bool targetAllowed = false;
            for (uint i = 0; i < sessionKey.allowedTargets.length; i++) {
                if (sessionKey.allowedTargets[i] == target) {
                    targetAllowed = true;
                    break;
                }
            }
            if (!targetAllowed) revert TargetNotAllowed();
        }
        
        // Check allowed functions
        if (sessionKey.allowedFunctions.length > 0 && data.length >= 4) {
            bytes4 selector;
            assembly {
                selector := mload(add(data, 0x20))
            }
            
            bool functionAllowed = false;
            for (uint i = 0; i < sessionKey.allowedFunctions.length; i++) {
                if (sessionKey.allowedFunctions[i] == selector) {
                    functionAllowed = true;
                    break;
                }
            }
            if (!functionAllowed) revert FunctionNotAllowed();
        }
        
        // Update spent amount
        sessionKey.spent += value;
        emit SessionKeyUsed(userOp.sender, keyHash, value);
        
        return 0; // Valid
    }
    
    /**
     * @dev Get session key hash
     */
    function getKeyHash(address account, address key) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, key));
    }
    
    /**
     * @dev Parse call data from UserOperation
     */
    function parseCallData(
        bytes calldata callData
    ) internal pure returns (address target, uint256 value, bytes memory data) {
        // Assuming callData is encoded as execute(address,uint256,bytes)
        if (callData.length < 4 + 32 + 32 + 32) {
            return (address(0), 0, "");
        }
        
        assembly {
            let dataOffset := add(callData.offset, 4)
            target := calldataload(dataOffset)
            value := calldataload(add(dataOffset, 32))
            
            let dataLengthOffset := add(dataOffset, 64)
            let dataLength := calldataload(dataLengthOffset)
            
            data := mload(0x40)
            mstore(data, dataLength)
            calldatacopy(add(data, 32), add(dataLengthOffset, 32), dataLength)
            mstore(0x40, add(data, add(32, dataLength)))
        }
    }
    
    /**
     * @dev Recover signer from signature
     */
    function recoverSigner(
        bytes32 hash,
        bytes memory signature
    ) internal pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        if (v != 27 && v != 28) {
            return address(0);
        }
        
        return ecrecover(hash, v, r, s);
    }
    
    /**
     * @dev Get session key details
     */
    function getSessionKey(
        address account,
        address key
    ) external view returns (SessionKey memory) {
        return sessionKeys[account][getKeyHash(account, key)];
    }
}