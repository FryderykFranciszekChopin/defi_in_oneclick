#!/usr/bin/env node

/**
 * Test script for smart account deployment on Sepolia testnet
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

async function testDeployment() {
  console.log('\n🔍 Testing Smart Account Deployment on Sepolia Testnet\n');
  console.log('Factory Address:', FACTORY_ADDRESS);
  console.log('EntryPoint Address:', ENTRYPOINT_ADDRESS);
  console.log('Chain ID:', sepolia.id);
  console.log('RPC URL:', sepolia.rpcUrls.default.http[0]);
  console.log('\n-----------------------------------\n');

  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  try {
    // 1. Check if Factory is deployed
    console.log('1. Checking Factory deployment...');
    const factoryCode = await client.getBytecode({ address: FACTORY_ADDRESS });
    const factoryDeployed = factoryCode !== undefined && factoryCode !== '0x' && factoryCode.length > 2;
    
    if (factoryDeployed) {
      console.log('✅ Factory is deployed');
      console.log(`   Code size: ${factoryCode.length} bytes\n`);
    } else {
      console.log('❌ Factory is NOT deployed\n');
      return;
    }

    // 2. Check if EntryPoint is deployed
    console.log('2. Checking EntryPoint deployment...');
    const entryPointCode = await client.getBytecode({ address: ENTRYPOINT_ADDRESS });
    const entryPointDeployed = entryPointCode !== undefined && entryPointCode !== '0x' && entryPointCode.length > 2;
    
    if (entryPointDeployed) {
      console.log('✅ EntryPoint is deployed');
      console.log(`   Code size: ${entryPointCode.length} bytes\n`);
    } else {
      console.log('❌ EntryPoint is NOT deployed\n');
    }

    // 3. Test address calculation
    console.log('3. Testing address calculation...');
    
    // Generate test public key (64 bytes for P256)
    const testPublicKey = '0x' + '01'.repeat(64); // Mock public key
    const testEmail = 'test@example.com';
    
    // Calculate salt
    const salt = keccak256(
      encodeAbiParameters(
        parseAbiParameters('string, bytes, uint256'),
        [testEmail, testPublicKey, 0n]
      )
    );
    
    console.log('   Test Email:', testEmail);
    console.log('   Test Public Key:', testPublicKey.substring(0, 20) + '...');
    console.log('   Calculated Salt:', salt);

    // Call getAddress on factory
    try {
      const predictedAddress = await client.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getAddress',
        args: [testPublicKey, salt],
      });
      
      console.log('✅ Address calculation successful');
      console.log('   Predicted Address:', predictedAddress);
      console.log('   Explorer:', `https://sepolia.etherscan.io/address/${predictedAddress}`);
      
      // Check if account is already deployed
      const accountCode = await client.getBytecode({ address: predictedAddress });
      const accountDeployed = accountCode !== undefined && accountCode !== '0x' && accountCode.length > 2;
      
      if (accountDeployed) {
        console.log('   Account Status: Already deployed');
      } else {
        console.log('   Account Status: Not yet deployed (will deploy on first transaction)');
      }
    } catch (error) {
      console.log('❌ Failed to calculate address');
      console.log('   Error:', error.message);
    }

    // 4. Check chain connectivity
    console.log('\n4. Checking chain connectivity...');
    const blockNumber = await client.getBlockNumber();
    const gasPrice = await client.getGasPrice();
    
    console.log('✅ Chain is accessible');
    console.log('   Current Block:', blockNumber.toString());
    console.log('   Gas Price:', (Number(gasPrice) / 1e9).toFixed(2), 'Gwei');

    // 5. Check Pimlico bundler
    if (process.env.NEXT_PUBLIC_PIMLICO_API_KEY) {
      console.log('\n5. Checking Pimlico bundler...');
      const bundlerUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`;
      
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_supportedEntryPoints',
            params: [],
          }),
        });
        
        const result = await response.json();
        
        if (result.result && Array.isArray(result.result)) {
          console.log('✅ Pimlico bundler is accessible');
          console.log('   Supported EntryPoints:', result.result.join(', '));
          
          if (result.result.includes(ENTRYPOINT_ADDRESS)) {
            console.log('✅ Our EntryPoint is supported by the bundler');
          } else {
            console.log('⚠️  Our EntryPoint is not in the supported list');
          }
        } else if (result.error) {
          console.log('❌ Pimlico bundler error:', result.error.message);
        }
      } catch (error) {
        console.log('❌ Failed to connect to Pimlico bundler');
        console.log('   Error:', error.message);
      }
    } else {
      console.log('\n5. Skipping bundler test (no API key)');
    }

    console.log('\n-----------------------------------');
    console.log('✅ Sepolia deployment test completed successfully!\n');

    // Show deployment info
    console.log('🚀 Deployment Summary:');
    console.log(`   Network: Sepolia Testnet (${sepolia.id})`);
    console.log(`   Factory: ${FACTORY_ADDRESS}`);
    console.log(`   EntryPoint: ${ENTRYPOINT_ADDRESS}`);
    console.log(`   Explorer: https://sepolia.etherscan.io/address/${FACTORY_ADDRESS}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDeployment().catch(console.error);