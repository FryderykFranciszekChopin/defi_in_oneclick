const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== Starting OneClick DeFi Deployment ===\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "OKB");

  // ERC-4337 EntryPoint address on XLayer
  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  console.log("Using EntryPoint:", ENTRY_POINT);

  try {
    // 1. Deploy OneClickFactory
    console.log("\n1. Deploying OneClickFactory...");
    const OneClickFactory = await ethers.getContractFactory("OneClickFactory");
    const factory = await OneClickFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("✅ OneClickFactory deployed at:", factoryAddress);

    // 2. Deploy SessionKeyModule (optional)
    console.log("\n2. Deploying SessionKeyModule...");
    const SessionKeyModule = await ethers.getContractFactory("SessionKeyModule");
    const sessionModule = await SessionKeyModule.deploy();
    await sessionModule.waitForDeployment();
    const sessionModuleAddress = await sessionModule.getAddress();
    console.log("✅ SessionKeyModule deployed at:", sessionModuleAddress);

    // 3. Test account creation (verification)
    console.log("\n3. Verifying deployment...");
    const samplePublicKey = "0x" + "12".repeat(64); // Sample public key
    const sampleSalt = ethers.keccak256(ethers.toUtf8Bytes("test-account"));
    const predictedAddress = await factory.getAddress(samplePublicKey, sampleSalt);
    console.log("✅ Sample account would be deployed at:", predictedAddress);

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        entryPoint: ENTRY_POINT,
        factory: factoryAddress,
        sessionKeyModule: sessionModuleAddress,
      },
      sampleAccount: {
        publicKey: samplePublicKey,
        salt: sampleSalt,
        predictedAddress: predictedAddress,
      },
    };

    // Save to file
    const fs = require("fs");
    const path = require("path");
    const deploymentsDir = path.join(__dirname, "../deployments");
    
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = `${network.name}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentsDir, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n=== Deployment Summary ===");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.config.chainId);
    console.log("EntryPoint:", ENTRY_POINT);
    console.log("OneClickFactory:", factoryAddress);
    console.log("SessionKeyModule:", sessionModuleAddress);
    console.log("========================\n");
    console.log(`Deployment info saved to: deployments/${filename}`);

    // Optional: Verify contracts if API key is available
    if (process.env.ETHERSCAN_API_KEY && network.name !== "hardhat") {
      console.log("\n📝 To verify contracts, run:");
      console.log(`npx hardhat verify --network ${network.name} ${factoryAddress}`);
      console.log(`npx hardhat verify --network ${network.name} ${sessionModuleAddress}`);
    }

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });