// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title OKBToken
 * @dev OKB token contract for Sepolia testnet
 * This represents OKB tokens that can be bridged to X Layer
 */
contract OKBToken is ERC20, ERC20Burnable, Ownable {
    
    constructor(address initialOwner) ERC20("OKB Token", "OKB") Ownable(initialOwner) {
        // Mint 10 OKB to the deployer
        _mint(initialOwner, 10 * 10**decimals());
    }

    /**
     * @dev Mint additional tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from bridge contract
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) public override {
        super.burnFrom(from, amount);
    }

    /**
     * @dev Get token decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}