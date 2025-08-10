// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SocialRecoveryModule
 * @notice Social recovery module for OneClickAccount
 * @dev Allows account recovery through guardian approvals
 */
contract SocialRecoveryModule {
    // Recovery configuration
    struct RecoveryConfig {
        address[] guardians;
        uint256 threshold;
        uint256 recoveryDelay; // Time delay before recovery can be executed
    }
    
    // Recovery request
    struct RecoveryRequest {
        address newOwner;
        uint256 newPublicKeyX;
        uint256 newPublicKeyY;
        uint256 approvalCount;
        mapping(address => bool) hasApproved;
        uint256 initiatedAt;
        bool executed;
    }
    
    // Account configurations
    mapping(address => RecoveryConfig) public recoveryConfigs;
    
    // Active recovery requests
    mapping(address => RecoveryRequest) public recoveryRequests;
    
    // Events
    event GuardiansSet(address indexed account, address[] guardians, uint256 threshold);
    event RecoveryInitiated(address indexed account, address indexed newOwner);
    event RecoveryApproved(address indexed account, address indexed guardian);
    event RecoveryExecuted(address indexed account, address indexed newOwner);
    event RecoveryCancelled(address indexed account);
    
    // Errors
    error InvalidGuardianConfig();
    error NotGuardian();
    error AlreadyApproved();
    error InsufficientApprovals();
    error RecoveryDelayNotMet();
    error NoActiveRecovery();
    error RecoveryAlreadyExecuted();
    error UnauthorizedCaller();
    
    modifier onlyGuardian(address account) {
        bool isGuardian = false;
        for (uint256 i = 0; i < recoveryConfigs[account].guardians.length; i++) {
            if (recoveryConfigs[account].guardians[i] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        if (!isGuardian) revert NotGuardian();
        _;
    }
    
    modifier onlyAccount(address account) {
        if (msg.sender != account) revert UnauthorizedCaller();
        _;
    }
    
    /**
     * @dev Set guardians for an account
     * @param guardians Array of guardian addresses
     * @param threshold Number of approvals required for recovery
     * @param recoveryDelay Time delay before recovery can be executed (in seconds)
     */
    function setGuardians(
        address[] memory guardians,
        uint256 threshold,
        uint256 recoveryDelay
    ) external {
        if (guardians.length == 0 || threshold == 0 || threshold > guardians.length) {
            revert InvalidGuardianConfig();
        }
        
        // Verify no duplicate guardians
        for (uint256 i = 0; i < guardians.length; i++) {
            for (uint256 j = i + 1; j < guardians.length; j++) {
                if (guardians[i] == guardians[j]) {
                    revert InvalidGuardianConfig();
                }
            }
        }
        
        recoveryConfigs[msg.sender] = RecoveryConfig({
            guardians: guardians,
            threshold: threshold,
            recoveryDelay: recoveryDelay
        });
        
        emit GuardiansSet(msg.sender, guardians, threshold);
    }
    
    /**
     * @dev Initiate account recovery
     * @param account The account to recover
     * @param newPublicKeyX The new public key X coordinate
     * @param newPublicKeyY The new public key Y coordinate
     */
    function initiateRecovery(
        address account,
        uint256 newPublicKeyX,
        uint256 newPublicKeyY
    ) external onlyGuardian(account) {
        RecoveryRequest storage request = recoveryRequests[account];
        
        // Reset if there's an old executed recovery
        if (request.executed) {
            delete recoveryRequests[account];
            request = recoveryRequests[account];
        }
        
        request.newOwner = msg.sender;
        request.newPublicKeyX = newPublicKeyX;
        request.newPublicKeyY = newPublicKeyY;
        request.approvalCount = 1;
        request.hasApproved[msg.sender] = true;
        request.initiatedAt = block.timestamp;
        request.executed = false;
        
        emit RecoveryInitiated(account, msg.sender);
        emit RecoveryApproved(account, msg.sender);
    }
    
    /**
     * @dev Approve an active recovery request
     * @param account The account being recovered
     */
    function approveRecovery(address account) external onlyGuardian(account) {
        RecoveryRequest storage request = recoveryRequests[account];
        
        if (request.initiatedAt == 0) revert NoActiveRecovery();
        if (request.executed) revert RecoveryAlreadyExecuted();
        if (request.hasApproved[msg.sender]) revert AlreadyApproved();
        
        request.hasApproved[msg.sender] = true;
        request.approvalCount++;
        
        emit RecoveryApproved(account, msg.sender);
    }
    
    /**
     * @dev Execute an approved recovery
     * @param account The account being recovered
     */
    function executeRecovery(address account) external {
        RecoveryRequest storage request = recoveryRequests[account];
        RecoveryConfig memory config = recoveryConfigs[account];
        
        if (request.initiatedAt == 0) revert NoActiveRecovery();
        if (request.executed) revert RecoveryAlreadyExecuted();
        if (request.approvalCount < config.threshold) revert InsufficientApprovals();
        
        // Check if recovery delay has passed
        if (block.timestamp < request.initiatedAt + config.recoveryDelay) {
            revert RecoveryDelayNotMet();
        }
        
        request.executed = true;
        
        // Call the account to update the public key
        (bool success, ) = account.call(
            abi.encodeWithSignature(
                "recoverAccount(uint256,uint256)",
                request.newPublicKeyX,
                request.newPublicKeyY
            )
        );
        require(success, "Recovery execution failed");
        
        emit RecoveryExecuted(account, request.newOwner);
    }
    
    /**
     * @dev Cancel an active recovery request (only by account owner)
     */
    function cancelRecovery() external {
        RecoveryRequest storage request = recoveryRequests[msg.sender];
        
        if (request.initiatedAt == 0) revert NoActiveRecovery();
        if (request.executed) revert RecoveryAlreadyExecuted();
        
        delete recoveryRequests[msg.sender];
        
        emit RecoveryCancelled(msg.sender);
    }
    
    /**
     * @dev Get guardian configuration for an account
     * @param account The account to query
     */
    function getGuardians(address account) 
        external 
        view 
        returns (
            address[] memory guardians,
            uint256 threshold,
            uint256 recoveryDelay
        ) 
    {
        RecoveryConfig memory config = recoveryConfigs[account];
        return (config.guardians, config.threshold, config.recoveryDelay);
    }
    
    /**
     * @dev Get recovery request status
     * @param account The account to query
     */
    function getRecoveryStatus(address account)
        external
        view
        returns (
            bool active,
            address newOwner,
            uint256 approvalCount,
            uint256 threshold,
            uint256 initiatedAt,
            bool canExecute
        )
    {
        RecoveryRequest storage request = recoveryRequests[account];
        RecoveryConfig memory config = recoveryConfigs[account];
        
        active = request.initiatedAt > 0 && !request.executed;
        newOwner = request.newOwner;
        approvalCount = request.approvalCount;
        threshold = config.threshold;
        initiatedAt = request.initiatedAt;
        
        canExecute = active && 
                    approvalCount >= threshold && 
                    block.timestamp >= initiatedAt + config.recoveryDelay;
    }
    
    /**
     * @dev Check if a guardian has approved recovery
     * @param account The account being recovered
     * @param guardian The guardian to check
     */
    function hasApprovedRecovery(address account, address guardian)
        external
        view
        returns (bool)
    {
        return recoveryRequests[account].hasApproved[guardian];
    }
}