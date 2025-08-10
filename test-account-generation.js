#!/usr/bin/env node

/**
 * Test script to generate sample account addresses and check if they match
 * the current factory deployment on Sepolia
 */

const { createPublicClient, http, parseAbiParameters, encodeAbiParameters, keccak256 } = require('viem');

const FACTORY_ADDRESS = '0xB8D779eeEF173c6dBC3a28f0Dec73e48cBE6411C';
const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

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

const FACTORY_ABI = [
  {
    name: 'getAddress',
    type: 'function',
    inputs: [
      { name: 'publicKey', type: 'bytes' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
];

async function testAccountGeneration() {
  console.log('\n🔍 Testing Account Generation on Sepolia\n');
  console.log('Factory Address:', FACTORY_ADDRESS);
  console.log('Network: Sepolia (11155111)');
  console.log('\n-----------------------------------\n');

  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  try {
    // Test with different email addresses that might be used
    const testCases = [
      { email: 'test@gmail.com', description: 'Generic test email' },
      { email: 'user@example.com', description: 'Example email' }, 
      { email: 'demo@oneclick.com', description: 'Demo email' },
    ];

    console.log('📧 Testing different email addresses:\n');

    for (const testCase of testCases) {
      // Generate test public key (64 bytes for P256)
      const testPublicKey = '0x' + '01'.repeat(64); // Mock public key
      
      // Calculate salt using the same method as the app
      const salt = keccak256(
        encodeAbiParameters(
          parseAbiParameters('string, bytes, uint256'),
          [testCase.email, testPublicKey, 0n] // accountIndex = 0
        )
      );
      
      console.log(`📋 ${testCase.description}: ${testCase.email}`);
      console.log(`   Salt: ${salt.substring(0, 10)}...`);

      try {
        // Get predicted address from factory
        const predictedAddress = await client.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getAddress',
          args: [testPublicKey, salt],
        });
        
        console.log(`   📍 Predicted Address: ${predictedAddress}`);
        console.log(`   🔗 Explorer: https://sepolia.etherscan.io/address/${predictedAddress}`);

        // Check if this account has any balance
        const balance = await client.getBalance({ address: predictedAddress });
        const balanceEth = Number(balance) / 1e18;
        
        if (balanceEth > 0) {
          console.log(`   💰 Balance: ${balanceEth} ETH ✅`);
          
          // Check transaction history
          const latestBlock = await client.getBlockNumber();
          console.log(`   📊 Checking recent activity (block ${latestBlock})...`);
          
        } else {
          console.log(`   💰 Balance: 0 ETH`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
    }

    // Test with current block and network info
    console.log('\n🌐 Network Status:');
    const blockNumber = await client.getBlockNumber();
    const gasPrice = await client.getGasPrice();
    
    console.log(`   Current Block: ${blockNumber}`);
    console.log(`   Gas Price: ${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`);
    
    // Check factory deployment
    console.log('\n🏭 Factory Contract:');
    const factoryCode = await client.getBytecode({ address: FACTORY_ADDRESS });
    if (factoryCode && factoryCode.length > 2) {
      console.log(`   ✅ Factory deployed (${factoryCode.length} bytes)`);
    } else {
      console.log(`   ❌ Factory not found`);
    }

    console.log('\n-----------------------------------');
    console.log('✅ Account generation test completed!\n');

    console.log('💡 To check a specific account:');
    console.log('   1. Create account in the web app');
    console.log('   2. Copy the wallet address'); 
    console.log('   3. Paste it into: https://sepolia.etherscan.io/address/[ADDRESS]');
    console.log('   4. Look for incoming ETH transactions\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testAccountGeneration().catch(console.error);