const { ethers } = require("ethers");

async function main() {
  // X Layer testnet configuration
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
  const account = "0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b";
  
  console.log("🔍 Checking X Layer account:", account);
  
  try {
    // OKB balance (native token on X Layer)
    const okbBalance = await provider.getBalance(account);
    console.log("🪙 OKB balance:", ethers.formatEther(okbBalance));

    // Network info
    const network = await provider.getNetwork();
    console.log("🌐 Network:", network.name, "| Chain ID:", network.chainId.toString());
    
    // Latest block
    const blockNumber = await provider.getBlockNumber();
    console.log("📦 Latest block:", blockNumber);
    
  } catch (error) {
    console.error("❌ Error connecting to X Layer:", error.message);
  }
}

main().catch(console.error);