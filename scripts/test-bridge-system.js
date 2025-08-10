/**
 * Bridge System Testing Script
 * 실제 Private Key 기반 Bridge 시스템 테스트
 */

const { simpleKeyManager: keyManager } = require('../lib/wallet/simple-key-manager.ts');
const { walletFunder } = require('../lib/wallet/funding-utils.ts');
const { crossChainBridge } = require('../lib/bridge/cross-chain.ts');

async function testBridgeSystem() {
  console.log('🧪 Starting Bridge System Test...\n');
  
  const testEmail = 'test@example.com';
  const testAmount = '0.01'; // Small amount for testing
  
  try {
    // Step 1: Create/Get User Wallet
    console.log('1️⃣ Creating user wallet...');
    const wallet = await keyManager.getOrCreateUserWallet(testEmail);
    console.log(`✅ Wallet created: ${wallet.address}`);
    console.log(`📧 Email: ${wallet.email}`);
    console.log(`🔐 Private key encrypted and stored securely\n`);
    
    // Step 2: Test Wallet Access
    console.log('2️⃣ Testing wallet access...');
    const walletAccess = await keyManager.getWalletAccess(testEmail);
    if (walletAccess) {
      console.log(`✅ Wallet access successful: ${walletAccess.address}`);
      console.log(`🔑 Private key decrypted successfully\n`);
    } else {
      throw new Error('Failed to get wallet access');
    }
    
    // Step 3: Check Initial Balances
    console.log('3️⃣ Checking initial balances...');
    const sepoliaBalance = await walletFunder.getUserWalletBalance(testEmail, 'sepolia');
    const xlayerBalance = await walletFunder.getUserWalletBalance(testEmail, 'xlayer');
    
    console.log(`💰 Sepolia balance: ${sepoliaBalance || '0'} ETH`);
    console.log(`💰 XLayer balance: ${xlayerBalance || '0'} OKB\n`);
    
    // Step 4: Display Funding Instructions
    console.log('4️⃣ Funding instructions for testing:');
    console.log(walletFunder.getFundingInstructions('sepolia'));
    console.log(walletFunder.getFundingInstructions('xlayer'));
    
    // Step 5: Simulate Bridge Transaction (if funded)
    if (sepoliaBalance && parseFloat(sepoliaBalance) > 0.01) {
      console.log('5️⃣ Testing bridge transaction...');
      
      try {
        const bridgeTx = await crossChainBridge.executeBridge(
          'sepolia',     // from network
          'xlayer',      // to network  
          'ETH',         // from token
          'OKB',         // to token
          testAmount,    // amount
          wallet.address, // recipient
          testEmail      // user email
        );
        
        console.log(`✅ Bridge transaction created: ${bridgeTx.id}`);
        console.log(`📊 Status: ${bridgeTx.status}`);
        console.log(`⏱️  Estimated time: ${bridgeTx.estimatedTime}s\n`);
        
        // Monitor bridge status
        console.log('🔄 Monitoring bridge status...');
        const checkStatus = setInterval(() => {
          const status = crossChainBridge.getBridgeStatus(bridgeTx.id);
          if (status) {
            console.log(`📊 Bridge ${bridgeTx.id}: ${status.status}`);
            
            if (status.status === 'completed') {
              console.log(`✅ Bridge completed! TX Hash: ${status.txHash}`);
              clearInterval(checkStatus);
            } else if (status.status === 'failed') {
              console.log(`❌ Bridge failed`);
              clearInterval(checkStatus);
            }
          }
        }, 3000);
        
        // Stop monitoring after 2 minutes
        setTimeout(() => {
          clearInterval(checkStatus);
          console.log('⏰ Monitoring timeout reached');
        }, 120000);
        
      } catch (bridgeError) {
        console.error('❌ Bridge transaction failed:', bridgeError.message);
      }
    } else {
      console.log('⚠️  Insufficient balance for bridge test. Please fund the wallet first.');
      console.log(`📍 Wallet address to fund: ${wallet.address}\n`);
    }
    
    // Step 6: Test Results Summary
    console.log('📋 Test Summary:');
    console.log(`✅ Wallet creation: PASSED`);
    console.log(`✅ Wallet access: PASSED`);
    console.log(`✅ Balance checking: PASSED`);
    console.log(`${sepoliaBalance && parseFloat(sepoliaBalance) > 0.01 ? '✅' : '⚠️'} Bridge test: ${sepoliaBalance && parseFloat(sepoliaBalance) > 0.01 ? 'EXECUTED' : 'SKIPPED (needs funding)'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Additional test functions
async function testWalletFunding() {
  console.log('💰 Testing wallet funding...\n');
  
  const testEmail = 'funding-test@example.com';
  
  try {
    // Create wallet
    const wallet = await keyManager.getOrCreateUserWallet(testEmail);
    console.log(`Created test wallet: ${wallet.address}\n`);
    
    // Try funding (will only work if FUNDING_PRIVATE_KEY is properly funded)
    console.log('Attempting to fund wallet...');
    const fundingResult = await walletFunder.fundUserWallet(testEmail, 'sepolia', '0.01');
    
    if (fundingResult.success) {
      console.log(`✅ Funding successful! TX: ${fundingResult.txHash}`);
      console.log(`💰 New balance: ${fundingResult.balance} ETH`);
    } else {
      console.log(`❌ Funding failed: ${fundingResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ Funding test failed:', error);
  }
}

async function displaySystemInfo() {
  console.log('🔍 System Information:\n');
  
  const fundingInfo = walletFunder.getFundingAccountInfo();
  console.log(`💳 Funding Account: ${fundingInfo.address}`);
  console.log(`🔐 Funding Private Key: ${fundingInfo.privateKey.slice(0, 10)}...`);
  
  console.log('\n📋 Available Networks:');
  console.log('- Sepolia (chainId: 11155111)');
  console.log('- XLayer (chainId: 196)');
  
  console.log('\n🌉 Bridge Pairs:');
  const pairs = crossChainBridge.getSupportedPairs();
  pairs.forEach(pair => {
    console.log(`- ${pair.from.network}/${pair.from.token} -> ${pair.to.network}/${pair.to.token} (rate: ${pair.rate})`);
  });
}

// Main execution
if (require.main === module) {
  console.log('🚀 OneClick DeFi Bridge System Test\n');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  
  switch (command) {
    case 'test':
      testBridgeSystem();
      break;
    case 'fund':
      testWalletFunding();
      break;
    case 'info':
      displaySystemInfo();
      break;
    default:
      console.log(`
Available commands:
- test: Run full bridge system test
- fund: Test wallet funding
- info: Display system information

Usage: node scripts/test-bridge-system.js [command]
      `);
  }
}

module.exports = {
  testBridgeSystem,
  testWalletFunding,
  displaySystemInfo
};