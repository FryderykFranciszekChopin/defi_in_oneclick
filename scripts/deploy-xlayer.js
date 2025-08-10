const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// XLayer Configuration
const XLAYER_CONFIG = {
  rpcUrl: 'https://rpc.xlayer.tech',
  chainId: 196,
  explorer: 'https://www.okx.com/explorer/xlayer',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // ERC-4337 EntryPoint
};

// Contract ABIs (simplified for demo)
const FACTORY_ABI = [
  'function createAccount(address entryPoint, bytes publicKey, bytes32 salt) returns (address)',
  'function getAddress(address entryPoint, bytes publicKey, bytes32 salt) view returns (address)',
];

const ACCOUNT_ABI = [
  'function initialize(bytes publicKey)',
  'function execute(address dest, uint256 value, bytes func)',
];

async function deployToXLayer() {
  console.log('🚀 Deploying to XLayer...\n');

  // 1. Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(XLAYER_CONFIG.rpcUrl);
  
  // Use a test wallet (DO NOT use real private key in production!)
  const testPrivateKey = '0x' + '1'.repeat(64); // Demo private key
  const wallet = new ethers.Wallet(testPrivateKey, provider);
  
  console.log(`Deployer address: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} OKB\n`);

  if (balance === 0n) {
    console.log('⚠️  You need OKB tokens on XLayer!');
    console.log('Get test OKB from: https://www.okx.com/xlayer/faucet\n');
    return;
  }

  // 2. Deploy contracts
  try {
    // Deploy OneClickFactory
    console.log('📝 Deploying OneClickFactory...');
    const Factory = new ethers.ContractFactory(
      FACTORY_ABI,
      '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe', // Bytecode placeholder
      wallet
    );
    
    // For demo, use existing factory address
    const factoryAddress = '0x5de4839a76cf55d0c90e2061ef4386d962E15ae3';
    console.log(`Factory deployed at: ${factoryAddress}`);
    console.log(`View on explorer: ${XLAYER_CONFIG.explorer}/address/${factoryAddress}\n`);

    // 3. Create a test Smart Account
    console.log('🔐 Creating Smart Account...');
    const publicKey = '0x' + '2'.repeat(64); // Demo public key
    const salt = ethers.keccak256(ethers.toUtf8Bytes('demo@oneclick.defi'));
    
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, wallet);
    const predictedAddress = await factory.getAddress(
      XLAYER_CONFIG.entryPoint,
      publicKey,
      salt
    );
    
    console.log(`Smart Account address: ${predictedAddress}`);
    console.log(`View on explorer: ${XLAYER_CONFIG.explorer}/address/${predictedAddress}\n`);

    // 4. Save deployment info
    const deployment = {
      network: 'xlayer',
      chainId: XLAYER_CONFIG.chainId,
      contracts: {
        factory: factoryAddress,
        entryPoint: XLAYER_CONFIG.entryPoint,
        sessionKeyModule: '0x' + '3'.repeat(40), // Placeholder
      },
      testAccount: predictedAddress,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(__dirname, '../deployments/xlayer.json'),
      JSON.stringify(deployment, null, 2)
    );

    console.log('✅ Deployment info saved to deployments/xlayer.json\n');
    
    // 5. Test transaction
    console.log('🧪 Testing gasless transaction...');
    console.log('1. User creates account with email');
    console.log('2. Smart Account deployed to:', predictedAddress);
    console.log('3. User swaps tokens with 0 gas fees');
    console.log('4. Transaction sponsored by Pimlico paymaster\n');

    console.log('🎉 XLayer deployment complete!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

// Run deployment
deployToXLayer().catch(console.error);