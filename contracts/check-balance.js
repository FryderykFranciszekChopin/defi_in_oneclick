const { ethers } = require("hardhat");

async function checkBalance() {
  console.log("Checking balance on XLayer Testnet...");
  
  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Account address:", deployer.address);
    
    // Get balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance (wei):", balance.toString());
    console.log("Balance (OKB):", ethers.formatEther(balance));
    
    // Check network info
    const network = await ethers.provider.getNetwork();
    console.log("Network name:", network.name);
    console.log("Chain ID:", network.chainId);
    
    // Test RPC connection
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("Latest block:", blockNumber);
    
    const gasPrice = await ethers.provider.getGasPrice();
    console.log("Gas price (gwei):", ethers.formatUnits(gasPrice, "gwei"));
    
  } catch (error) {
    console.error("Error checking balance:", error);
  }
}

checkBalance();