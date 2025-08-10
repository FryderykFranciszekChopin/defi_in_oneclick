const { execSync } = require('child_process');

// This script uses the fixed private key for deployment only
// The smart account uses passkey for actual transactions
const PRIVATE_KEY = '0x4883a8fd611148c2eeda5397693e12fba45b939e22375d4f9a469b62d1f1c882';

async function deployBridge() {
  console.log('🚀 Deploying SimpleBridge contracts...');
  
  try {
    // Deploy to Sepolia
    console.log('📡 Deploying to Sepolia...');
    const sepoliaResult = execSync(
      `forge create --rpc-url https://eth-sepolia.public.blastapi.io --private-key ${PRIVATE_KEY} --broadcast contracts/SimpleBridge.sol:SimpleBridge`,
      { encoding: 'utf8' }
    );
    
    const sepoliaMatch = sepoliaResult.match(/Deployed to: (0x[a-fA-F0-9]{40})/);
    const sepoliaAddress = sepoliaMatch ? sepoliaMatch[1] : null;
    
    console.log('✅ Sepolia bridge deployed at:', sepoliaAddress);
    
    // Deploy to X Layer
    console.log('📡 Deploying to X Layer...');
    const xlayerResult = execSync(
      `forge create --rpc-url https://testrpc.xlayer.tech --private-key ${PRIVATE_KEY} --broadcast --legacy contracts/SimpleBridge.sol:SimpleBridge`,
      { encoding: 'utf8' }
    );
    
    const xlayerMatch = xlayerResult.match(/Deployed to: (0x[a-fA-F0-9]{40})/);
    const xlayerAddress = xlayerMatch ? xlayerMatch[1] : null;
    
    console.log('✅ X Layer bridge deployed at:', xlayerAddress);
    
    // Update network config
    const addresses = {
      sepolia: sepoliaAddress,
      xlayer: xlayerAddress
    };
    
    console.log('\n📝 Bridge addresses:');
    console.log(JSON.stringify(addresses, null, 2));
    
    return addresses;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

deployBridge().catch(console.error);