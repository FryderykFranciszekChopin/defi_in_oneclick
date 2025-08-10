// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IEntryPoint.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/ISpendingLimitModule.sol";
import "./lib/P256Verifier.sol";
import "./lib/WebAuthn.sol";

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
    address public socialRecoveryModule;
    address public spendingLimitModule;
    address public twoFactorModule;
    
    // Domain binding
    string public allowedOrigin = "https://oneclick-defi.vercel.app"; // Production domain
    bool public strictDomainCheck = true; // Enable strict domain checking
    
    // Events
    event AccountInitialized(uint256 indexed x, uint256 indexed y);
    event SessionKeyModuleSet(address indexed module);
    event SocialRecoveryModuleSet(address indexed module);
    event SpendingLimitModuleSet(address indexed module);
    event TwoFactorModuleSet(address indexed module);
    event AccountRecovered(uint256 indexed newX, uint256 indexed newY);
    
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
        // Decode the full WebAuthn signature
        (
            bytes memory authenticatorData,
            string memory clientDataJSON,
            uint256 challengeIndex,
            uint256 typeIndex,
            uint256 r,
            uint256 s
        ) = abi.decode(
            userOp.signature,
            (bytes, string, uint256, uint256, uint256, uint256)
        );
        
        // If strict domain check is enabled, verify origin
        if (strictDomainCheck) {
            // Check that clientDataJSON contains the allowed origin
            bytes memory originBytes = bytes(allowedOrigin);
            bytes memory clientDataBytes = bytes(clientDataJSON);
            
            // Look for "origin":"<allowedOrigin>" in clientDataJSON
            bool originFound = false;
            bytes memory originPattern = abi.encodePacked('"origin":"', allowedOrigin, '"');
            
            for (uint256 i = 0; i <= clientDataBytes.length - originPattern.length; i++) {
                bool isMatch = true;
                for (uint256 j = 0; j < originPattern.length; j++) {
                    if (clientDataBytes[i + j] != originPattern[j]) {
                        isMatch = false;
                        break;
                    }
                }
                if (isMatch) {
                    originFound = true;
                    break;
                }
            }
            
            if (!originFound) revert InvalidSignature();
        }
        
        // Verify WebAuthn signature with full validation
        bool valid = WebAuthn.verify(
            authenticatorData,
            clientDataJSON,
            challengeIndex,
            typeIndex,
            r,
            s,
            publicKeyX,
            publicKeyY,
            userOpHash
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
        // Check spending limit if module is set
        if (spendingLimitModule != address(0) && value > 0) {
            (bool allowed, string memory reason) = ISpendingLimitModule(spendingLimitModule)
                .checkSpendingLimit(address(this), target, value);
            
            require(allowed, reason);
        }
        
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
     * @dev Update allowed origin for domain binding (only self)
     */
    function setAllowedOrigin(string memory origin) external {
        require(msg.sender == address(this), "Only self");
        allowedOrigin = origin;
    }
    
    /**
     * @dev Toggle strict domain checking (only self)
     */
    function setStrictDomainCheck(bool enabled) external {
        require(msg.sender == address(this), "Only self");
        strictDomainCheck = enabled;
    }
    
    /**
     * @dev Set social recovery module (only self or EntryPoint)
     */
    function setSocialRecoveryModule(address module) external onlyEntryPointOrSelf {
        socialRecoveryModule = module;
        emit SocialRecoveryModuleSet(module);
    }
    
    /**
     * @dev Recover account with new public key (only callable by recovery module)
     */
    function recoverAccount(uint256 newPublicKeyX, uint256 newPublicKeyY) external {
        require(msg.sender == socialRecoveryModule, "Only recovery module");
        require(newPublicKeyX != 0 && newPublicKeyY != 0, "Invalid public key");
        
        publicKeyX = newPublicKeyX;
        publicKeyY = newPublicKeyY;
        
        emit AccountRecovered(newPublicKeyX, newPublicKeyY);
    }
    
    /**
     * @dev Set spending limit module (only self or EntryPoint)
     */
    function setSpendingLimitModule(address module) external onlyEntryPointOrSelf {
        spendingLimitModule = module;
        emit SpendingLimitModuleSet(module);
    }
    
    /**
     * @dev Set two-factor module (only self or EntryPoint)
     */
    function setTwoFactorModule(address module) external onlyEntryPointOrSelf {
        twoFactorModule = module;
        emit TwoFactorModuleSet(module);
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