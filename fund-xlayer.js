const { ethers } = require("ethers");

async function main() {
  console.log("💰 Funding X Layer testnet account...");
  
  // X Layer testnet configuration
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
  
  // Private key from hardhat config (for funding)
  const privateKey = "0x4883a8fd611148c2eeda5397693e12fba45b939e22375d4f9a469b62d1f1c882";
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Target account to fund
  const targetAccount = "0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b";
  
  console.log("📤 From wallet:", wallet.address);
  console.log("📥 To account:", targetAccount);
  
  // Check current balances
  const fromBalance = await provider.getBalance(wallet.address);
  const toBalance = await provider.getBalance(targetAccount);
  
  console.log("💰 From balance:", ethers.formatEther(fromBalance), "OKB");
  console.log("💰 To balance:", ethers.formatEther(toBalance), "OKB");
  
  if (fromBalance > 0) {
    // Send some OKB to the target account
    const amountToSend = ethers.parseEther("0.1"); // Send 0.1 OKB
    
    console.log("📤 Sending:", ethers.formatEther(amountToSend), "OKB");
    
    const tx = await wallet.sendTransaction({
      to: targetAccount,
      value: amountToSend,
      gasLimit: 21000
    });
    
    console.log("⏳ Transaction hash:", tx.hash);
    await tx.wait();
    
    // Check new balance
    const newBalance = await provider.getBalance(targetAccount);
    console.log("✅ New balance:", ethers.formatEther(newBalance), "OKB");
  } else {
    console.log("❌ Funding wallet has no OKB to send");
    console.log("💡 You need to get some OKB from X Layer faucet first:");
    console.log("🔗 https://www.okx.com/xlayer/faucet");
  }
}

main().catch(console.error);