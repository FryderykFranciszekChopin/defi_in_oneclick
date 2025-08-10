// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RealBridge
 * @dev Cross-chain bridge contract for ETH <-> OKB bridging
 * Supports native ETH on Sepolia and native OKB on X Layer
 */
contract RealBridge is ReentrancyGuard, Ownable {
    // Events
    event BridgeInitiated(
        address indexed user,
        uint256 indexed destChainId,
        string destToken,
        address indexed recipient,
        uint256 amount,
        bytes32 bridgeId
    );
    
    event BridgeCompleted(
        bytes32 indexed bridgeId,
        address indexed recipient,
        uint256 amount
    );
    
    event BridgeClaimed(
        bytes32 indexed bridgeId,
        address indexed user,
        uint256 amount
    );

    // Bridge configuration
    struct BridgeConfig {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 feeRate; // in basis points (100 = 1%)
        bool enabled;
    }

    // Bridge request
    struct BridgeRequest {
        address user;
        address recipient;
        uint256 amount;
        uint256 sourceChainId;
        uint256 destChainId;
        string sourceToken;
        string destToken;
        uint256 timestamp;
        bool completed;
        bool claimed;
    }

    // State variables
    mapping(uint256 => BridgeConfig) public bridgeConfigs;
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(address => bytes32[]) public userBridges;
    
    uint256 public constant CHAIN_ID_SEPOLIA = 11155111;
    uint256 public constant CHAIN_ID_XLAYER = 195;
    
    address public bridgeOperator;
    uint256 public totalBridged;
    
    // Fees collected
    uint256 public collectedFees;

    constructor() Ownable(msg.sender) {
        // Initialize bridge configs
        // Sepolia -> X Layer (ETH -> OKB)
        bridgeConfigs[CHAIN_ID_XLAYER] = BridgeConfig({
            minAmount: 0.001 ether,
            maxAmount: 10 ether,
            feeRate: 50, // 0.5%
            enabled: true
        });
        
        bridgeOperator = msg.sender;
    }

    modifier onlyBridgeOperator() {
        require(msg.sender == bridgeOperator, "Not bridge operator");
        _;
    }

    /**
     * @dev Initiate bridge from current chain to destination chain
     * @param destChainId Destination chain ID
     * @param destToken Destination token symbol
     * @param recipient Recipient address on destination chain
     */
    function initiateBridge(
        uint256 destChainId,
        string calldata destToken,
        address recipient
    ) external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        BridgeConfig memory config = bridgeConfigs[destChainId];
        require(config.enabled, "Bridge not enabled for destination chain");
        require(msg.value >= config.minAmount, "Amount below minimum");
        require(msg.value <= config.maxAmount, "Amount above maximum");

        // Calculate fee
        uint256 fee = (msg.value * config.feeRate) / 10000;
        uint256 bridgeAmount = msg.value - fee;
        
        // Generate unique bridge ID
        bytes32 bridgeId = keccak256(abi.encodePacked(
            msg.sender,
            recipient,
            block.number,
            block.timestamp,
            msg.value
        ));

        // Store bridge request
        bridgeRequests[bridgeId] = BridgeRequest({
            user: msg.sender,
            recipient: recipient,
            amount: bridgeAmount,
            sourceChainId: block.chainid,
            destChainId: destChainId,
            sourceToken: "ETH", // Current chain native token
            destToken: destToken,
            timestamp: block.timestamp,
            completed: false,
            claimed: false
        });

        // Track user's bridges
        userBridges[msg.sender].push(bridgeId);

        // Add to collected fees
        collectedFees += fee;
        totalBridged += bridgeAmount;

        emit BridgeInitiated(
            msg.sender,
            destChainId,
            destToken,
            recipient,
            bridgeAmount,
            bridgeId
        );
    }

    /**
     * @dev Complete bridge on destination chain (called by bridge operator)
     * @param bridgeId Bridge request ID from source chain
     * @param recipient Recipient address
     * @param amount Amount to mint/transfer
     */
    function completeBridge(
        bytes32 bridgeId,
        address recipient,
        uint256 amount
    ) external onlyBridgeOperator nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        
        // Send native token (OKB on X Layer)
        require(address(this).balance >= amount, "Insufficient bridge liquidity");
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit BridgeCompleted(bridgeId, recipient, amount);
    }

    /**
     * @dev Claim completed bridge (alternative method)
     * @param bridgeId Bridge request ID
     */
    function claimBridge(bytes32 bridgeId) external nonReentrant {
        BridgeRequest storage request = bridgeRequests[bridgeId];
        require(request.recipient == msg.sender, "Not your bridge");
        require(request.completed, "Bridge not completed");
        require(!request.claimed, "Already claimed");
        
        request.claimed = true;
        
        // Send native token
        (bool success, ) = msg.sender.call{value: request.amount}("");
        require(success, "Transfer failed");
        
        emit BridgeClaimed(bridgeId, msg.sender, request.amount);
    }

    /**
     * @dev Add liquidity to bridge (for destination chain minting)
     */
    function addLiquidity() external payable onlyOwner {
        require(msg.value > 0, "Must send value");
    }

    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Update bridge configuration
     */
    function updateBridgeConfig(
        uint256 destChainId,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 feeRate,
        bool enabled
    ) external onlyOwner {
        bridgeConfigs[destChainId] = BridgeConfig({
            minAmount: minAmount,
            maxAmount: maxAmount,
            feeRate: feeRate,
            enabled: enabled
        });
    }

    /**
     * @dev Set bridge operator
     */
    function setBridgeOperator(address newOperator) external onlyOwner {
        bridgeOperator = newOperator;
    }

    /**
     * @dev Get user's bridge history
     */
    function getUserBridges(address user) external view returns (bytes32[] memory) {
        return userBridges[user];
    }

    /**
     * @dev Get bridge request details
     */
    function getBridgeRequest(bytes32 bridgeId) external view returns (BridgeRequest memory) {
        return bridgeRequests[bridgeId];
    }

    /**
     * @dev Emergency withdrawal (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}