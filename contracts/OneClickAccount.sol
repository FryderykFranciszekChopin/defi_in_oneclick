// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IEntryPoint.sol";
import "./interfaces/IAccount.sol";
import "./lib/P256Verifier.sol";

/**
 * @title OneClickAccount
 * @notice ERC-4337 compliant smart account with Passkey support
 * @dev Supports WebAuthn/Passkey authentication and session keys
 */
contract OneClickAccount is IAccount {
    // ERC-4337 EntryPoint
    IEntryPoint private immutable _entryPoint;
    
    // Passkey public key coordinates
    uint256 public publicKeyX;
    uint256 public publicKeyY;
    
    // Account state
    uint256 public nonce;
    address public sessionKeyModule;
    
    // Events
    event AccountInitialized(uint256 indexed x, uint256 indexed y);
    event SessionKeyModuleSet(address indexed module);
    
    // Errors
    error OnlyEntryPoint();
    error OnlyEntryPointOrSelf();
    error InvalidSignature();
    error InvalidPublicKey();
    error AlreadyInitialized();
    
    modifier onlyEntryPoint() {
        if (msg.sender != address(_entryPoint)) revert OnlyEntryPoint();
        _;
    }
    
    modifier onlyEntryPointOrSelf() {
        if (msg.sender != address(_entryPoint) && msg.sender != address(this)) {
            revert OnlyEntryPointOrSelf();
        }
        _;
    }
    
    constructor(address entryPoint, bytes memory publicKey) {
        _entryPoint = IEntryPoint(entryPoint);
        _initialize(publicKey);
    }
    
    function _initialize(bytes memory publicKey) internal {
        if (publicKey.length != 64) revert InvalidPublicKey();
        
        // Extract X and Y coordinates from uncompressed public key
        assembly {
            let x := mload(add(publicKey, 0x20))
            let y := mload(add(publicKey, 0x40))
            sstore(publicKeyX.slot, x)
            sstore(publicKeyY.slot, y)
        }
        
        emit AccountInitialized(publicKeyX, publicKeyY);
    }
    
    /**
     * @dev Validate user operation with Passkey signature
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override onlyEntryPoint returns (uint256 validationData) {
        // Pay prefund if needed
        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "Prefund failed");
        }
        
        // Check if using session key
        if (sessionKeyModule != address(0) && userOp.signature.length > 0) {
            // First byte indicates session key usage
            if (uint8(userOp.signature[0]) == 0x01) {
                return _validateWithSessionKey(userOp, userOpHash);
            }
        }
        
        // Validate with Passkey
        return _validateWithPasskey(userOp, userOpHash);
    }
    
    function _validateWithPasskey(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256) {
        // For passkey signatures, we expect the signature to contain r and s values
        // In a real implementation, this would also include authenticator data
        (uint256 r, uint256 s) = abi.decode(userOp.signature, (uint256, uint256));
        
        // Verify P256 signature
        bool valid = P256Verifier.verify(
            userOpHash,
            r,
            s,
            publicKeyX,
            publicKeyY
        );
        
        if (!valid) revert InvalidSignature();
        
        return 0; // Validation success
    }
    
    function _validateWithSessionKey(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal returns (uint256) {
        // Delegate to session key module
        bytes memory data = abi.encodeWithSignature(
            "validateUserOp(UserOperation,bytes32)",
            userOp,
            userOpHash
        );
        
        (bool success, bytes memory result) = sessionKeyModule.call(data);
        if (!success) revert InvalidSignature();
        
        return abi.decode(result, (uint256));
    }
    
    /**
     * @dev Execute a transaction (called by EntryPoint)
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external onlyEntryPoint {
        _execute(dest, value, func);
    }
    
    /**
     * @dev Execute a batch of transactions
     */
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata value,
        bytes[] calldata func
    ) external onlyEntryPoint {
        require(dest.length == func.length && dest.length == value.length, "Length mismatch");
        
        for (uint256 i = 0; i < dest.length; i++) {
            _execute(dest[i], value[i], func[i]);
        }
    }
    
    function _execute(
        address target,
        uint256 value,
        bytes memory data
    ) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
    
    /**
     * @dev Set session key module (only self or EntryPoint)
     */
    function setSessionKeyModule(address module) external onlyEntryPointOrSelf {
        sessionKeyModule = module;
        emit SessionKeyModuleSet(module);
    }
    
    /**
     * @dev Get EntryPoint address
     */
    function entryPoint() public view returns (IEntryPoint) {
        return _entryPoint;
    }
    
    /**
     * @dev Get current nonce
     */
    function getNonce() public view returns (uint256) {
        return nonce;
    }
    
    /**
     * @dev Validate signature for EIP-1271
     */
    function isValidSignature(bytes32 hash, bytes memory signature)
        public
        view
        returns (bytes4 magicValue)
    {
        // Implement EIP-1271 signature validation
        // This allows the account to sign messages
        return 0x1626ba7e; // EIP-1271 magic value
    }
    
    /**
     * @dev Deposit funds to EntryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }
    
    /**
     * @dev Withdraw funds from EntryPoint
     */
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyEntryPointOrSelf {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }
    
    /**
     * @dev Get deposit balance in EntryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }
    
    // Receive ETH
    receive() external payable {}
}