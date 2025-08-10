/**
 * Test Asset Transfer Script
 * 해커톤 요구사항: Private key로 자산 소유권 증명 및 전송
 */

const { ethers } = require('hardhat');

// 우리 스마트 계정 주소 (고정)
const SMART_ACCOUNT_ADDRESS = '0x9f0815a0b5ffb7e7178858cd62156487ba991414';

// OKB 토큰 컨트랙트 주소 (Sepolia)
const OKB_TOKEN_ADDRESS = '0x0BC13595f7DABbF1D00fC5CAa670D2374BD4AA9a';

// 테스트 대상 주소 (전송받을 주소)
const TEST_RECIPIENT = '0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b';

async function main() {
  console.log('🏁 Starting Asset Transfer Test...');
  console.log(`📍 Smart Account: ${SMART_ACCOUNT_ADDRESS}`);
  console.log(`🪙 OKB Token: ${OKB_TOKEN_ADDRESS}`);
  console.log(`📍 Recipient: ${TEST_RECIPIENT}`);

  // 1. 현재 스마트 계정의 ETH 잔고 확인
  const provider = ethers.provider;
  const ethBalance = await provider.getBalance(SMART_ACCOUNT_ADDRESS);
  console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  // 2. OKB 토큰 잔고 확인
  const okbToken = await ethers.getContractAt('IERC20', OKB_TOKEN_ADDRESS);
  const okbBalance = await okbToken.balanceOf(SMART_ACCOUNT_ADDRESS);
  console.log(`🪙 OKB Balance: ${ethers.formatEther(okbBalance)} OKB`);

  // 3. 수신자의 현재 잔고 확인
  const recipientEthBalance = await provider.getBalance(TEST_RECIPIENT);
  const recipientOkbBalance = await okbToken.balanceOf(TEST_RECIPIENT);
  console.log(`📍 Recipient ETH: ${ethers.formatEther(recipientEthBalance)} ETH`);
  console.log(`📍 Recipient OKB: ${ethers.formatEther(recipientOkbBalance)} OKB`);

  // Private key를 사용한 실제 전송 테스트를 위해 
  // 일단 현재 상태만 확인
  console.log('\n✅ Asset status check completed');
  console.log('💡 Next: Implement private key based transfer');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });