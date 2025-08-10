const { ethers } = require("ethers");

async function main() {
  // Sepolia testnet configuration
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.public.blastapi.io");
  const account = "0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b"; // 실제 계정
  
  console.log("🔍 Checking account:", account);
  
  // ETH balance
  const ethBalance = await provider.getBalance(account);
  console.log("💰 ETH balance:", ethers.formatEther(ethBalance));

  // OKB token contract address on Sepolia (if it exists)
  // Need to find the actual OKB token contract address
  console.log("\n📋 To check OKB balance, we need the OKB token contract address on Sepolia");
  console.log("Can you provide the OKB token contract address on Sepolia?");
  
  // Common ERC20 ABI for balance checking
  const erc20ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
  ];

  // If you know the OKB contract address, uncomment and update:
  // const okbAddress = "0x..."; // OKB contract address on Sepolia
  // const okbContract = new ethers.Contract(okbAddress, erc20ABI, provider);
  // const okbBalance = await okbContract.balanceOf(account);
  // const decimals = await okbContract.decimals();
  // console.log("🪙 OKB balance:", ethers.formatUnits(okbBalance, decimals));
}

main().catch(console.error);