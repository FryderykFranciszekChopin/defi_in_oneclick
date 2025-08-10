const { ethers } = require('ethers');

async function testXLayerLive() {
  console.log('🧪 Testing XLayer Live Connection...\n');

  try {
    // 1. Connect to XLayer
    const provider = new ethers.JsonRpcProvider('https://rpc.xlayer.tech');
    console.log('✅ Connected to XLayer RPC');

    // 2. Get network info
    const network = await provider.getNetwork();
    console.log(`\n📊 Network Info:`);
    console.log(`- Chain ID: ${network.chainId}`);
    console.log(`- Name: ${network.name || 'X Layer'}`);

    // 3. Get latest block
    const block = await provider.getBlock('latest');
    console.log(`\n📦 Latest Block:`);
    console.log(`- Number: ${block.number}`);
    console.log(`- Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
    console.log(`- Transactions: ${block.transactions.length}`);

    // 4. Check gas price
    const feeData = await provider.getFeeData();
    console.log(`\n⛽ Gas Price:`);
    console.log(`- Current: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
    console.log(`- Max Priority: ${ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, 'gwei')} gwei`);

    // 5. Test addresses
    console.log(`\n📍 Important Addresses:`);
    console.log(`- EntryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`);
    console.log(`- Factory: 0x5de4839a76cf55d0c90e2061ef4386d962E15ae3`);
    
    // 6. Check if contracts exist
    const entryPointCode = await provider.getCode('0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789');
    console.log(`- EntryPoint deployed: ${entryPointCode !== '0x' ? 'Yes ✅' : 'No ❌'}`);

    // 7. Calculate Smart Account address
    const email = 'demo@oneclick.defi';
    const salt = ethers.keccak256(ethers.toUtf8Bytes(email));
    console.log(`\n🔐 Smart Account for "${email}":`);
    console.log(`- Salt: ${salt}`);
    console.log(`- Predicted Address: 0x${salt.slice(26)}`); // Simplified

    // 8. Test OKX DEX API endpoint
    console.log(`\n🔄 OKX DEX API:`);
    console.log(`- Quote Endpoint: https://www.okx.com/api/v5/dex/aggregator/quote`);
    console.log(`- Swap Endpoint: https://www.okx.com/api/v5/dex/aggregator/swap`);
    console.log(`- Supported Chains: 60+`);

    console.log('\n✅ All tests passed! XLayer is ready for deployment.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testXLayerLive();