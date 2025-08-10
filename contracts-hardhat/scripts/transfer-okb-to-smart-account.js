const { ethers } = require("hardhat");

async function main() {
  console.log("📤 Transferring OKB tokens to smart account...");

  // Contract addresses
  const OKB_TOKEN_ADDRESS = "0x0BC13595f7DABbF1D00fC5CAa670D2374BD4AA9a";
  const SMART_ACCOUNT_ADDRESS = "0x9f0815a0b5ffb7e7178858cd62156487ba991414";

  // Get deployer (who has the OKB tokens)
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);

  // Get OKB token contract
  const OKBToken = await ethers.getContractFactory("OKBToken");
  const okbToken = OKBToken.attach(OKB_TOKEN_ADDRESS);

  // Check balances before transfer
  const deployerBalance = await okbToken.balanceOf(deployer.address);
  const smartAccountBalance = await okbToken.balanceOf(SMART_ACCOUNT_ADDRESS);
  
  console.log("💰 Current balances:");
  console.log("- Deployer:", ethers.formatEther(deployerBalance), "OKB");
  console.log("- Smart Account:", ethers.formatEther(smartAccountBalance), "OKB");

  if (deployerBalance > 0) {
    // Transfer 5 OKB to smart account (keep 5 for ourselves)
    const transferAmount = ethers.parseEther("5");
    
    console.log("📤 Transferring:", ethers.formatEther(transferAmount), "OKB to smart account");
    
    const transferTx = await okbToken.transfer(SMART_ACCOUNT_ADDRESS, transferAmount);
    console.log("⏳ Transfer transaction:", transferTx.hash);
    
    await transferTx.wait();
    console.log("✅ Transfer completed");

    // Check balances after transfer
    const newDeployerBalance = await okbToken.balanceOf(deployer.address);
    const newSmartAccountBalance = await okbToken.balanceOf(SMART_ACCOUNT_ADDRESS);
    
    console.log("💰 New balances:");
    console.log("- Deployer:", ethers.formatEther(newDeployerBalance), "OKB");
    console.log("- Smart Account:", ethers.formatEther(newSmartAccountBalance), "OKB");

  } else {
    console.log("❌ Deployer has no OKB tokens to transfer");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });