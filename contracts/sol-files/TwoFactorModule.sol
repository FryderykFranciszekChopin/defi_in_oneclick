// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TwoFactorModule
 * @notice Two-factor authentication module for OneClickAccount
 * @dev Implements TOTP-based 2FA for high-value transactions
 */
contract TwoFactorModule {
    // 2FA configuration
    struct TwoFactorConfig {
        bool enabled;
        bytes32 secretHash; // Hash of TOTP secret
        uint256 window; // Time window for TOTP (usually 30 seconds)
        uint256 threshold; // Transaction value threshold requiring 2FA
        uint256 lastUsedCounter; // Prevent replay attacks
    }
    
    // Account configurations
    mapping(address => TwoFactorConfig) public twoFactorConfigs;
    
    // Used TOTP codes to prevent replay
    mapping(address => mapping(uint256 => bool)) public usedCodes;
    
    // Events
    event TwoFactorEnabled(address indexed account, uint256 threshold);
    event TwoFactorDisabled(address indexed account);
    event TwoFactorVerified(address indexed account, uint256 timestamp);
    event ThresholdUpdated(address indexed account, uint256 newThreshold);
    
    // Errors
    error TwoFactorNotEnabled();
    error InvalidTOTPCode();
    error TOTPCodeAlreadyUsed();
    error UnauthorizedCaller();
    error InvalidConfiguration();
    
    modifier onlyAccount() {
        if (msg.sender != tx.origin) revert UnauthorizedCaller();
        _;
    }
    
    /**
     * @dev Enable 2FA for an account
     * @param secretHash Hash of the TOTP secret
     * @param threshold Transaction value threshold requiring 2FA (in wei)
     */
    function enableTwoFactor(
        bytes32 secretHash,
        uint256 threshold
    ) external onlyAccount {
        if (secretHash == bytes32(0)) revert InvalidConfiguration();
        
        twoFactorConfigs[msg.sender] = TwoFactorConfig({
            enabled: true,
            secretHash: secretHash,
            window: 30, // 30 second window
            threshold: threshold,
            lastUsedCounter: 0
        });
        
        emit TwoFactorEnabled(msg.sender, threshold);
    }
    
    /**
     * @dev Disable 2FA for an account
     * @param totpCode Current TOTP code for verification
     */
    function disableTwoFactor(uint256 totpCode) external onlyAccount {
        TwoFactorConfig storage config = twoFactorConfigs[msg.sender];
        
        if (!config.enabled) revert TwoFactorNotEnabled();
        
        // Verify TOTP code before disabling
        if (!verifyTOTP(msg.sender, totpCode)) {
            revert InvalidTOTPCode();
        }
        
        delete twoFactorConfigs[msg.sender];
        
        emit TwoFactorDisabled(msg.sender);
    }
    
    /**
     * @dev Update the transaction threshold for 2FA
     * @param newThreshold New threshold in wei
     * @param totpCode Current TOTP code for verification
     */
    function updateThreshold(
        uint256 newThreshold,
        uint256 totpCode
    ) external onlyAccount {
        TwoFactorConfig storage config = twoFactorConfigs[msg.sender];
        
        if (!config.enabled) revert TwoFactorNotEnabled();
        
        // Verify TOTP code
        if (!verifyTOTP(msg.sender, totpCode)) {
            revert InvalidTOTPCode();
        }
        
        config.threshold = newThreshold;
        
        emit ThresholdUpdated(msg.sender, newThreshold);
    }
    
    /**
     * @dev Verify a TOTP code for a transaction
     * @param account The account to verify for
     * @param totpCode The TOTP code to verify
     * @param transactionValue The value of the transaction
     */
    function verifyTransaction(
        address account,
        uint256 totpCode,
        uint256 transactionValue
    ) external view returns (bool) {
        TwoFactorConfig memory config = twoFactorConfigs[account];
        
        // If 2FA not enabled, always return true
        if (!config.enabled) return true;
        
        // If transaction value below threshold, no 2FA needed
        if (transactionValue < config.threshold) return true;
        
        // Verify TOTP code
        return verifyTOTP(account, totpCode);
    }
    
    /**
     * @dev Verify a TOTP code
     * @param account The account to verify for
     * @param totpCode The TOTP code to verify
     */
    function verifyTOTP(
        address account,
        uint256 totpCode
    ) internal view returns (bool) {
        TwoFactorConfig memory config = twoFactorConfigs[account];
        
        if (!config.enabled) return false;
        
        // Get current time counter (30 second windows)
        uint256 counter = block.timestamp / config.window;
        
        // Check if code was already used
        if (usedCodes[account][totpCode]) {
            return false;
        }
        
        // In production, this would properly implement TOTP algorithm
        // For now, we'll use a simplified verification
        bytes32 expectedHash = keccak256(
            abi.encodePacked(config.secretHash, counter)
        );
        
        uint256 expectedCode = uint256(expectedHash) % 1000000; // 6-digit code
        
        // Check current window and adjacent windows (for clock skew)
        if (totpCode == expectedCode) {
            return true;
        }
        
        // Check previous window
        expectedHash = keccak256(
            abi.encodePacked(config.secretHash, counter - 1)
        );
        expectedCode = uint256(expectedHash) % 1000000;
        if (totpCode == expectedCode) {
            return true;
        }
        
        // Check next window
        expectedHash = keccak256(
            abi.encodePacked(config.secretHash, counter + 1)
        );
        expectedCode = uint256(expectedHash) % 1000000;
        if (totpCode == expectedCode) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Mark a TOTP code as used (called by account after successful verification)
     * @param totpCode The TOTP code that was used
     */
    function markCodeAsUsed(uint256 totpCode) external {
        usedCodes[msg.sender][totpCode] = true;
        emit TwoFactorVerified(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if 2FA is enabled for an account
     * @param account The account to check
     */
    function isTwoFactorEnabled(address account) external view returns (bool) {
        return twoFactorConfigs[account].enabled;
    }
    
    /**
     * @dev Get 2FA configuration for an account
     * @param account The account to query
     */
    function getTwoFactorConfig(address account)
        external
        view
        returns (
            bool enabled,
            uint256 threshold,
            uint256 window
        )
    {
        TwoFactorConfig memory config = twoFactorConfigs[account];
        return (config.enabled, config.threshold, config.window);
    }
}