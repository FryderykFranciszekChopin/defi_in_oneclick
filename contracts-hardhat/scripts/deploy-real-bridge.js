const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying RealBridge contract...");

  // Get the contract factory
  const RealBridge = await ethers.getContractFactory("RealBridge");

  // Deploy the contract
  const realBridge = await RealBridge.deploy();
  await realBridge.waitForDeployment();

  const address = await realBridge.getAddress();
  console.log("✅ RealBridge deployed to:", address);

  // Add some initial liquidity (0.05 ETH)
  const initialLiquidity = ethers.parseEther("0.05");
  console.log("💰 Adding initial liquidity:", ethers.formatEther(initialLiquidity), "ETH");
  
  const addLiquidityTx = await realBridge.addLiquidity({ value: initialLiquidity });
  await addLiquidityTx.wait();
  console.log("✅ Initial liquidity added");

  // Verify deployment
  const balance = await realBridge.getBalance();
  console.log("💎 Bridge contract balance:", ethers.formatEther(balance), "ETH");

  // Log configuration
  const sepoliaConfig = await realBridge.bridgeConfigs(195); // X Layer testnet
  console.log("🔧 Bridge configuration (Sepolia -> X Layer):");
  console.log("- Min amount:", ethers.formatEther(sepoliaConfig.minAmount), "ETH");
  console.log("- Max amount:", ethers.formatEther(sepoliaConfig.maxAmount), "ETH");
  console.log("- Fee rate:", sepoliaConfig.feeRate / 100, "%");
  console.log("- Enabled:", sepoliaConfig.enabled);

  return {
    address,
    contract: realBridge
  };
}

// Run deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };