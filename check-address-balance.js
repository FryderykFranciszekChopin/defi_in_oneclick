#!/usr/bin/env node

/**
 * Check specific address balance on Sepolia
 * Usage: node check-address-balance.js [ADDRESS]
 */

const { createPublicClient, http } = require('viem');

const sepolia = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether', 
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://eth-sepolia.public.blastapi.io'] },
    public: { http: ['https://eth-sepolia.public.blastapi.io'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
};

async function checkAddress(address) {
  console.log(`\n🔍 Checking address: ${address}`);
  console.log(`🌐 Network: Sepolia Testnet (${sepolia.id})`);
  console.log('-----------------------------------');

  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  try {
    // Get balance
    const balance = await client.getBalance({ address });
    const balanceEth = Number(balance) / 1e18;
    
    console.log(`💰 Balance: ${balanceEth} ETH`);
    console.log(`💰 Balance (Wei): ${balance.toString()}`);
    
    if (balanceEth > 0) {
      console.log('✅ Account has funds!');
    } else {
      console.log('💡 Account has no funds yet');
    }
    
    // Get transaction count (nonce)
    const txCount = await client.getTransactionCount({ address });
    console.log(`📊 Transaction count: ${txCount}`);
    
    // Check if account has code (is a contract)
    const code = await client.getBytecode({ address });
    const hasCode = code && code.length > 2;
    
    console.log(`📋 Account type: ${hasCode ? 'Smart Contract' : 'EOA (Externally Owned Account)'}`);
    if (hasCode) {
      console.log(`📋 Code size: ${code.length} bytes`);
    }
    
    // Network info
    console.log('\n🌐 Network Status:');
    const blockNumber = await client.getBlockNumber();
    const gasPrice = await client.getGasPrice();
    
    console.log(`   Current Block: ${blockNumber}`);
    console.log(`   Gas Price: ${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`);
    
    console.log(`\n🔗 View on Etherscan: https://sepolia.etherscan.io/address/${address}`);
    console.log('-----------------------------------\n');
    
  } catch (error) {
    console.error('❌ Error checking address:', error.message);
  }
}

// Get address from command line args
const address = process.argv[2];

if (!address) {
  console.log('\n❌ Please provide an address to check');
  console.log('Usage: node check-address-balance.js 0x1234...');
  console.log('\nExample addresses to test:');
  console.log('   0x25C60b216D23C769EBd99Ab38a20c22F9234EAb4');
  console.log('   0x6800Cf8F7670731F6F8CC8a4d96DB34d7939A03D');
  process.exit(1);
}

if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
  console.log('\n❌ Invalid Ethereum address format');
  console.log('Address should be 42 characters starting with 0x');
  process.exit(1);
}

checkAddress(address).catch(console.error);