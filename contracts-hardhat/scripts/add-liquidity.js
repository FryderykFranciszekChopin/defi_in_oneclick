const { ethers } = require("hardhat");

async function main() {
  const bridgeAddress = "0x9739ea83d6Bb5EE456436e97d3fEF6575C5814Ac";
  
  console.log("💰 Adding liquidity to deployed bridge:", bridgeAddress);

  // Get the contract
  const RealBridge = await ethers.getContractFactory("RealBridge");
  const realBridge = RealBridge.attach(bridgeAddress);

  // Add some initial liquidity (0.05 ETH)
  const initialLiquidity = ethers.parseEther("0.05");
  console.log("💰 Adding:", ethers.formatEther(initialLiquidity), "ETH");
  
  const addLiquidityTx = await realBridge.addLiquidity({ value: initialLiquidity });
  await addLiquidityTx.wait();
  console.log("✅ Liquidity added");

  // Verify balance
  const balance = await realBridge.getBalance();
  console.log("💎 Bridge contract balance:", ethers.formatEther(balance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });