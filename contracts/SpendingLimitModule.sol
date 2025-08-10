// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SpendingLimitModule
 * @notice Daily spending limit module for OneClickAccount
 * @dev Implements configurable daily spending limits with whitelist exceptions
 */
contract SpendingLimitModule {
    // Spending limit configuration
    struct SpendingLimit {
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 dailySpent;
        uint256 monthlySpent;
        uint256 lastDayReset;
        uint256 lastMonthReset;
        bool enabled;
    }
    
    // Whitelist configuration
    struct WhitelistEntry {
        bool isWhitelisted;
        uint256 customLimit; // 0 means no limit
    }
    
    // Account spending limits
    mapping(address => SpendingLimit) public spendingLimits;
    
    // Whitelisted addresses per account (trusted addresses with custom limits)
    mapping(address => mapping(address => WhitelistEntry)) public whitelist;
    
    // Events
    event SpendingLimitSet(address indexed account, uint256 dailyLimit, uint256 monthlyLimit);
    event SpendingLimitDisabled(address indexed account);
    event AddressWhitelisted(address indexed account, address indexed target, uint256 customLimit);
    event AddressRemovedFromWhitelist(address indexed account, address indexed target);
    event SpendingRecorded(address indexed account, uint256 amount, uint256 dailyTotal, uint256 monthlyTotal);
    event LimitExceeded(address indexed account, uint256 amount, uint256 limit);
    
    // Errors
    error SpendingLimitExceeded();
    error SpendingLimitNotEnabled();
    error InvalidConfiguration();
    error UnauthorizedCaller();
    
    modifier onlyAccount() {
        if (msg.sender != tx.origin) revert UnauthorizedCaller();
        _;
    }
    
    /**
     * @dev Set spending limits for an account
     * @param dailyLimit Maximum daily spending in wei
     * @param monthlyLimit Maximum monthly spending in wei
     */
    function setSpendingLimit(
        uint256 dailyLimit,
        uint256 monthlyLimit
    ) external onlyAccount {
        if (dailyLimit == 0 || monthlyLimit == 0 || dailyLimit > monthlyLimit) {
            revert InvalidConfiguration();
        }
        
        SpendingLimit storage limit = spendingLimits[msg.sender];
        
        // Reset counters if enabling for the first time or re-enabling
        if (!limit.enabled) {
            limit.dailySpent = 0;
            limit.monthlySpent = 0;
            limit.lastDayReset = block.timestamp;
            limit.lastMonthReset = block.timestamp;
        }
        
        limit.dailyLimit = dailyLimit;
        limit.monthlyLimit = monthlyLimit;
        limit.enabled = true;
        
        emit SpendingLimitSet(msg.sender, dailyLimit, monthlyLimit);
    }
    
    /**
     * @dev Disable spending limits
     */
    function disableSpendingLimit() external onlyAccount {
        SpendingLimit storage limit = spendingLimits[msg.sender];
        
        if (!limit.enabled) revert SpendingLimitNotEnabled();
        
        limit.enabled = false;
        limit.dailySpent = 0;
        limit.monthlySpent = 0;
        
        emit SpendingLimitDisabled(msg.sender);
    }
    
    /**
     * @dev Add an address to whitelist with optional custom limit
     * @param target The address to whitelist
     * @param customLimit Custom spending limit for this address (0 for no limit)
     */
    function addToWhitelist(
        address target,
        uint256 customLimit
    ) external onlyAccount {
        whitelist[msg.sender][target] = WhitelistEntry({
            isWhitelisted: true,
            customLimit: customLimit
        });
        
        emit AddressWhitelisted(msg.sender, target, customLimit);
    }
    
    /**
     * @dev Remove an address from whitelist
     * @param target The address to remove
     */
    function removeFromWhitelist(address target) external onlyAccount {
        delete whitelist[msg.sender][target];
        
        emit AddressRemovedFromWhitelist(msg.sender, target);
    }
    
    /**
     * @dev Check if a transaction is within spending limits
     * @param account The account making the transaction
     * @param target The target address
     * @param amount The transaction amount in wei
     * @return allowed Whether the transaction is allowed
     * @return reason Reason if not allowed
     */
    function checkSpendingLimit(
        address account,
        address target,
        uint256 amount
    ) external returns (bool allowed, string memory reason) {
        SpendingLimit storage limit = spendingLimits[account];
        
        // If limits not enabled, allow all transactions
        if (!limit.enabled) {
            return (true, "");
        }
        
        // Check if target is whitelisted
        WhitelistEntry memory whitelistEntry = whitelist[account][target];
        if (whitelistEntry.isWhitelisted) {
            // If no custom limit, allow transaction
            if (whitelistEntry.customLimit == 0) {
                return (true, "");
            }
            // Check against custom limit
            if (amount > whitelistEntry.customLimit) {
                emit LimitExceeded(account, amount, whitelistEntry.customLimit);
                return (false, "Exceeds whitelist custom limit");
            }
            return (true, "");
        }
        
        // Reset daily counter if needed
        if (block.timestamp >= limit.lastDayReset + 1 days) {
            limit.dailySpent = 0;
            limit.lastDayReset = block.timestamp;
        }
        
        // Reset monthly counter if needed
        if (block.timestamp >= limit.lastMonthReset + 30 days) {
            limit.monthlySpent = 0;
            limit.lastMonthReset = block.timestamp;
        }
        
        // Check daily limit
        if (limit.dailySpent + amount > limit.dailyLimit) {
            emit LimitExceeded(account, amount, limit.dailyLimit);
            return (false, "Exceeds daily spending limit");
        }
        
        // Check monthly limit
        if (limit.monthlySpent + amount > limit.monthlyLimit) {
            emit LimitExceeded(account, amount, limit.monthlyLimit);
            return (false, "Exceeds monthly spending limit");
        }
        
        // Update spending counters
        limit.dailySpent += amount;
        limit.monthlySpent += amount;
        
        emit SpendingRecorded(account, amount, limit.dailySpent, limit.monthlySpent);
        
        return (true, "");
    }
    
    /**
     * @dev Get current spending status for an account
     * @param account The account to query
     */
    function getSpendingStatus(address account)
        external
        view
        returns (
            bool enabled,
            uint256 dailyLimit,
            uint256 dailySpent,
            uint256 dailyRemaining,
            uint256 monthlyLimit,
            uint256 monthlySpent,
            uint256 monthlyRemaining
        )
    {
        SpendingLimit memory limit = spendingLimits[account];
        
        if (!limit.enabled) {
            return (false, 0, 0, 0, 0, 0, 0);
        }
        
        // Calculate current spent amounts (considering resets)
        uint256 currentDailySpent = limit.dailySpent;
        uint256 currentMonthlySpent = limit.monthlySpent;
        
        // Check if daily reset is needed
        if (block.timestamp >= limit.lastDayReset + 1 days) {
            currentDailySpent = 0;
        }
        
        // Check if monthly reset is needed
        if (block.timestamp >= limit.lastMonthReset + 30 days) {
            currentMonthlySpent = 0;
        }
        
        return (
            true,
            limit.dailyLimit,
            currentDailySpent,
            limit.dailyLimit > currentDailySpent ? limit.dailyLimit - currentDailySpent : 0,
            limit.monthlyLimit,
            currentMonthlySpent,
            limit.monthlyLimit > currentMonthlySpent ? limit.monthlyLimit - currentMonthlySpent : 0
        );
    }
    
    /**
     * @dev Check if an address is whitelisted for an account
     * @param account The account to check
     * @param target The target address
     */
    function isWhitelisted(address account, address target)
        external
        view
        returns (bool whitelisted, uint256 customLimit)
    {
        WhitelistEntry memory entry = whitelist[account][target];
        return (entry.isWhitelisted, entry.customLimit);
    }
}