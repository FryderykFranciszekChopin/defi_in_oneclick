#!/usr/bin/env node

/**
 * 전체 시스템 통합 테스트
 * OneClick DeFi 모든 기능 검증
 */

const chalk = require('chalk');

// 색상 헬퍼
const log = {
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.log(chalk.red('❌ ' + msg)),
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  warning: (msg) => console.log(chalk.yellow('⚠️  ' + msg)),
  test: (msg) => console.log(chalk.cyan('🧪 ' + msg)),
  title: (msg) => console.log(chalk.bold.magenta('\n' + '='.repeat(50) + '\n' + msg + '\n' + '='.repeat(50))),
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Server Health Check
async function testServerHealth() {
  log.title('TEST 1: Server Health Check');
  
  try {
    const response = await fetch('http://localhost:3003/api/test');
    const data = await response.json();
    
    if (data.success && data.keyManager) {
      log.success('Server is running and healthy');
      log.info(`Response: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      log.error('Server health check failed');
      return false;
    }
  } catch (error) {
    log.error(`Server not responding: ${error.message}`);
    log.warning('Make sure the server is running on port 3003');
    return false;
  }
}

// Test 2: Homepage Load
async function testHomepage() {
  log.title('TEST 2: Homepage Load');
  
  try {
    const response = await fetch('http://localhost:3003');
    const html = await response.text();
    
    if (response.ok && html.includes('OneClick DeFi')) {
      log.success('Homepage loaded successfully');
      log.info(`Response status: ${response.status}`);
      return true;
    } else {
      log.error('Homepage failed to load properly');
      return false;
    }
  } catch (error) {
    log.error(`Homepage error: ${error.message}`);
    return false;
  }
}

// Test 3: Test Bridge Page
async function testBridgePage() {
  log.title('TEST 3: Bridge Test Page');
  
  try {
    const response = await fetch('http://localhost:3003/test-bridge');
    const html = await response.text();
    
    if (response.ok && html.includes('Bridge System Test')) {
      log.success('Bridge test page loaded successfully');
      log.info('Test page available at: http://localhost:3003/test-bridge');
      return true;
    } else {
      log.error('Bridge test page failed to load');
      return false;
    }
  } catch (error) {
    log.error(`Bridge page error: ${error.message}`);
    return false;
  }
}

// Test 4: Key Manager Functionality
async function testKeyManager() {
  log.title('TEST 4: Key Manager (Browser Simulation)');
  
  try {
    // Import the simple key manager
    const { simpleKeyManager } = require('./lib/wallet/simple-key-manager.ts');
    
    const testEmail = 'test-' + Date.now() + '@example.com';
    log.test(`Testing with email: ${testEmail}`);
    
    // Create wallet
    const wallet = await simpleKeyManager.getOrCreateUserWallet(testEmail);
    log.success(`Wallet created: ${wallet.address}`);
    
    // Test wallet access
    const access = await simpleKeyManager.getWalletAccess(testEmail);
    if (access && access.privateKey) {
      log.success(`Wallet access verified`);
      log.info(`Address: ${access.address}`);
      log.info(`Private Key: ${access.privateKey.slice(0, 10)}...${access.privateKey.slice(-4)}`);
      
      // Clear test wallet
      simpleKeyManager.clearWallet(testEmail);
      log.info('Test wallet cleared');
      
      return true;
    } else {
      log.error('Failed to access wallet');
      return false;
    }
  } catch (error) {
    log.error(`Key manager test failed: ${error.message}`);
    log.warning('This test may only work in browser environment');
    return false;
  }
}

// Test 5: Bridge System
async function testBridgeSystem() {
  log.title('TEST 5: Bridge System (Mock Test)');
  
  try {
    const { crossChainBridge } = require('./lib/bridge/cross-chain.ts');
    
    log.test('Testing bridge quote system...');
    
    // Test quote
    const quote = await crossChainBridge.getQuote(
      'sepolia',
      'xlayer',
      'ETH',
      'OKB',
      '0.001'
    );
    
    log.success('Bridge quote received');
    log.info(`From: ${quote.fromAmount} ETH on Sepolia`);
    log.info(`To: ${quote.toAmount} OKB on XLayer`);
    log.info(`Rate: ${quote.rate}`);
    log.info(`Fees: ${quote.fees}`);
    log.info(`Estimated time: ${quote.estimatedTime}s`);
    
    // Test supported pairs
    const pairs = crossChainBridge.getSupportedPairs();
    log.success(`Found ${pairs.length} supported bridge pairs`);
    pairs.forEach(pair => {
      log.info(`• ${pair.from.network}/${pair.from.token} → ${pair.to.network}/${pair.to.token} (rate: ${pair.rate})`);
    });
    
    return true;
  } catch (error) {
    log.error(`Bridge system test failed: ${error.message}`);
    return false;
  }
}

// Test 6: Multi-chain Configuration
async function testMultiChainConfig() {
  log.title('TEST 6: Multi-chain Configuration');
  
  try {
    const { NETWORKS, getSupportedNetworks } = require('./lib/networks/config.ts');
    
    const networks = getSupportedNetworks();
    log.success(`Found ${networks.length} configured networks`);
    
    networks.forEach(network => {
      log.info(`• ${network.chain.name} (Chain ID: ${network.chain.id})`);
      log.info(`  - Factory: ${network.factoryAddress}`);
      log.info(`  - Tokens: ${network.tokens.map(t => t.symbol).join(', ')}`);
    });
    
    return true;
  } catch (error) {
    log.error(`Multi-chain config test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  log.title('🚀 OneClick DeFi - Full System Test Suite');
  console.log(chalk.gray('Starting comprehensive system tests...\n'));
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Homepage', fn: testHomepage },
    { name: 'Bridge Page', fn: testBridgePage },
    { name: 'Key Manager', fn: testKeyManager },
    { name: 'Bridge System', fn: testBridgeSystem },
    { name: 'Multi-chain Config', fn: testMultiChainConfig },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      await sleep(500); // Small delay between tests
    } catch (error) {
      log.error(`Test "${test.name}" crashed: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  log.title('📊 Test Results Summary');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const status = result.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`${status} - ${result.name}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(chalk.bold(`Total: ${results.length} tests`));
  console.log(chalk.green(`Passed: ${passed}`));
  console.log(chalk.red(`Failed: ${failed}`));
  console.log('='.repeat(50));
  
  if (passed === results.length) {
    log.success('🎉 All tests passed! System is fully operational.');
  } else {
    log.warning(`⚠️  ${failed} test(s) failed. Please check the logs above.`);
  }
  
  // Instructions
  console.log('\n' + chalk.bold.cyan('📋 Next Steps:'));
  console.log(chalk.white('1. Open browser: http://localhost:3003'));
  console.log(chalk.white('2. Test Bridge UI: http://localhost:3003/test-bridge'));
  console.log(chalk.white('3. Create a test wallet and get testnet tokens'));
  console.log(chalk.white('4. Try a real bridge transaction\n'));
  
  console.log(chalk.bold.yellow('🚰 Testnet Faucets:'));
  console.log(chalk.white('• Sepolia: https://sepoliafaucet.com'));
  console.log(chalk.white('• XLayer: https://www.okx.com/xlayer/faucet\n'));
}

// Check if chalk is installed
try {
  require('chalk');
} catch (error) {
  console.log('Installing chalk for colored output...');
  require('child_process').execSync('npm install chalk', { stdio: 'inherit' });
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});