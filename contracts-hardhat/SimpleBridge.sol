// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleBridge {
    event BridgeInitiated(
        address indexed sender,
        uint256 amount,
        uint256 destinationChainId,
        string destinationToken,
        address indexed recipient
    );
    
    event BridgeCompleted(
        address indexed recipient,
        uint256 amount,
        string sourceToken,
        uint256 sourceChainId
    );
    
    mapping(bytes32 => bool) public processedBridges;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * Initiate bridge transaction
     * Burns/locks tokens on source chain
     */
    function initiateBridge(
        uint256 destinationChainId,
        string calldata destinationToken,
        address recipient
    ) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(destinationChainId != block.chainid, "Cannot bridge to same chain");
        
        emit BridgeInitiated(
            msg.sender,
            msg.value,
            destinationChainId,
            destinationToken,
            recipient
        );
    }
    
    /**
     * Complete bridge transaction
     * Mints/unlocks tokens on destination chain
     */
    function completeBridge(
        address recipient,
        uint256 amount,
        string calldata sourceToken,
        uint256 sourceChainId,
        bytes32 bridgeId
    ) external onlyOwner {
        require(!processedBridges[bridgeId], "Bridge already processed");
        require(amount > 0, "Amount must be greater than 0");
        
        processedBridges[bridgeId] = true;
        
        // Transfer native token to recipient
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit BridgeCompleted(recipient, amount, sourceToken, sourceChainId);
    }
    
    /**
     * Owner can deposit funds for bridge operations
     */
    receive() external payable {}
    
    /**
     * Owner can withdraw funds
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}