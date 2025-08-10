const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying SimpleBridge contracts with Hardhat...");
  
  // Deploy SimpleBridge
  const SimpleBridge = await hre.ethers.getContractFactory("SimpleBridge");
  const bridge = await SimpleBridge.deploy();
  
  await bridge.waitForDeployment();
  const address = await bridge.getAddress();
  
  console.log(`✅ SimpleBridge deployed to: ${address}`);
  console.log(`📍 Network: ${hre.network.name}`);
  
  // Fund the bridge with some ETH for operations
  console.log("💰 Funding bridge contract...");
  const [deployer] = await hre.ethers.getSigners();
  const fundTx = await deployer.sendTransaction({
    to: address,
    value: hre.ethers.parseEther("0.1") // Fund with 0.1 ETH
  });
  await fundTx.wait();
  console.log("✅ Bridge funded with 0.1 ETH");
  
  // Verify contract balance
  const balance = await hre.ethers.provider.getBalance(address);
  console.log(`💎 Bridge balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  return address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment successful!`);
    console.log(`📝 Bridge address: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });