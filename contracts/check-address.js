const { ethers } = require("ethers");

async function checkAddress() {
  console.log("Checking address from private key...");
  
  try {
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!privateKey) {
      console.log("No private key found in environment");
      return;
    }
    
    console.log("Private key exists:", !!privateKey);
    console.log("Private key length:", privateKey.length);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    console.log("Generated address:", wallet.address);
    console.log("Expected address: 0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b");
    
    // Check if they match
    const matches = wallet.address.toLowerCase() === "0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b".toLowerCase();
    console.log("Addresses match:", matches);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkAddress();