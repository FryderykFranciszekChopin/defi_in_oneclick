const { ethers, run } = require("hardhat");

async function main() {
  console.log("\n=== Starting OneClick DeFi Deployment with Verification ===\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "OKB");

  // ERC-4337 EntryPoint address on XLayer
  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  console.log("Using EntryPoint:", ENTRY_POINT);

  const deployedContracts = {};

  try {
    // 1. Deploy OneClickFactory
    console.log("\n1. Deploying OneClickFactory...");
    const OneClickFactory = await ethers.getContractFactory("OneClickFactory");
    const factory = await OneClickFactory.deploy();
    await factory.waitForDeployment();
    deployedContracts.factory = await factory.getAddress();
    console.log("✅ OneClickFactory deployed at:", deployedContracts.factory);

    // 2. Deploy SessionKeyModule
    console.log("\n2. Deploying SessionKeyModule...");
    const SessionKeyModule = await ethers.getContractFactory("SessionKeyModule");
    const sessionModule = await SessionKeyModule.deploy();
    await sessionModule.waitForDeployment();
    deployedContracts.sessionModule = await sessionModule.getAddress();
    console.log("✅ SessionKeyModule deployed at:", deployedContracts.sessionModule);

    // 3. Wait for confirmations before verification
    console.log("\n3. Waiting for block confirmations...");
    await factory.deploymentTransaction().wait(5);
    await sessionModule.deploymentTransaction().wait(5);
    console.log("✅ Confirmations received");

    // 4. Verify contracts if not on local network
    if (network.name !== "hardhat" && network.name !== "localhost") {
      console.log("\n4. Verifying contracts...");

      try {
        // Verify OneClickFactory
        console.log("\nVerifying OneClickFactory...");
        await run("verify:verify", {
          address: deployedContracts.factory,
          constructorArguments: [],
        });
        console.log("✅ OneClickFactory verified");
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log("✅ OneClickFactory already verified");
        } else {
          console.log("⚠️  OneClickFactory verification failed:", error.message);
        }
      }

      try {
        // Verify SessionKeyModule
        console.log("\nVerifying SessionKeyModule...");
        await run("verify:verify", {
          address: deployedContracts.sessionModule,
          constructorArguments: [],
        });
        console.log("✅ SessionKeyModule verified");
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log("✅ SessionKeyModule already verified");
        } else {
          console.log("⚠️  SessionKeyModule verification failed:", error.message);
        }
      }
    }

    // 5. Test deployment
    console.log("\n5. Testing deployment...");
    const samplePublicKey = "0x" + "12".repeat(64);
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
        factory: deployedContracts.factory,
        sessionKeyModule: deployedContracts.sessionModule,
      },
      verified: network.name !== "hardhat" && network.name !== "localhost",
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

    // Update latest deployment file
    fs.writeFileSync(
      path.join(deploymentsDir, `${network.name}-latest.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n=== Deployment Summary ===");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.config.chainId);
    console.log("EntryPoint:", ENTRY_POINT);
    console.log("OneClickFactory:", deployedContracts.factory);
    console.log("SessionKeyModule:", deployedContracts.sessionModule);
    console.log("Verified:", deploymentInfo.verified);
    console.log("========================\n");
    console.log(`Deployment info saved to: deployments/${filename}`);

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