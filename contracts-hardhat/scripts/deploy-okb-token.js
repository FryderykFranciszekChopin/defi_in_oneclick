const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying OKB Token contract on Sepolia...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get the contract factory
  const OKBToken = await ethers.getContractFactory("OKBToken");

  // Deploy the contract (deployer will receive 10 OKB)
  const okbToken = await OKBToken.deploy(deployer.address);
  await okbToken.waitForDeployment();

  const address = await okbToken.getAddress();
  console.log("✅ OKBToken deployed to:", address);

  // Verify deployment
  const balance = await okbToken.balanceOf(deployer.address);
  const symbol = await okbToken.symbol();
  const name = await okbToken.name();
  const decimals = await okbToken.decimals();
  
  console.log("📊 Token Info:");
  console.log("- Name:", name);
  console.log("- Symbol:", symbol);
  console.log("- Decimals:", decimals.toString());
  console.log("- Total Supply:", ethers.formatEther(await okbToken.totalSupply()), "OKB");
  console.log("- Deployer Balance:", ethers.formatEther(balance), "OKB");

  return {
    address,
    contract: okbToken
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