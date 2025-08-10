/**
 * Private Key Asset Transfer
 * 해커톤 핵심: Private key로 자산 소유권 증명 및 실제 전송
 */

const { ethers } = require('hardhat');

// 테스트용 Private Key (실제 서비스에서는 안전하게 관리)
const PRIVATE_KEY = '0x4883a8fd611148c2eeda5397693e12fba45b939e22375d4f9a469b62d1f1c882';

// OKB 토큰 컨트랙트 주소 (Sepolia)
const OKB_TOKEN_ADDRESS = '0x0BC13595f7DABbF1D00fC5CAa670D2374BD4AA9a';

// 테스트 대상 주소 (전송받을 주소)
const TEST_RECIPIENT = '0xB1Fd8ccd8b66a3DeDcD5fFef1Edb22fbCA01c66b';

async function main() {
  console.log('🔐 Starting Private Key Asset Transfer...');
  
  // 1. Private key로 Wallet 생성
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`👤 Sender Address: ${wallet.address}`);
  console.log(`📍 Recipient Address: ${TEST_RECIPIENT}`);

  // 2. 현재 잔고 확인
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`💰 Sender ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  // 3. OKB 토큰 컨트랙트 연결
  const okbToken = await ethers.getContractAt('IERC20', OKB_TOKEN_ADDRESS, wallet);
  const okbBalance = await okbToken.balanceOf(wallet.address);
  console.log(`🪙 Sender OKB Balance: ${ethers.formatEther(okbBalance)} OKB`);

  // 4. Recipient 현재 잔고
  const recipientOkbBalance = await okbToken.balanceOf(TEST_RECIPIENT);
  console.log(`📍 Recipient OKB Balance (Before): ${ethers.formatEther(recipientOkbBalance)} OKB`);

  // 5. OKB 토큰 전송 (0.1 OKB)
  const transferAmount = ethers.parseEther('0.1'); // 0.1 OKB
  
  if (okbBalance >= transferAmount) {
    console.log(`\n🚀 Transferring 0.1 OKB to recipient...`);
    
    try {
      // 실제 토큰 전송 트랜잭션
      const tx = await okbToken.transfer(TEST_RECIPIENT, transferAmount);
      console.log(`📝 Transaction Hash: ${tx.hash}`);
      
      // 트랜잭션 완료 대기
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
      
      // 6. 전송 후 잔고 확인
      const newSenderBalance = await okbToken.balanceOf(wallet.address);
      const newRecipientBalance = await okbToken.balanceOf(TEST_RECIPIENT);
      
      console.log(`\n📊 Transfer Results:`);
      console.log(`👤 Sender OKB Balance (After): ${ethers.formatEther(newSenderBalance)} OKB`);
      console.log(`📍 Recipient OKB Balance (After): ${ethers.formatEther(newRecipientBalance)} OKB`);
      
      console.log(`\n✅ SUCCESS: Private key transfer completed!`);
      console.log(`🏆 해커톤 요구사항 충족: Private key로 자산 소유권 증명 및 전송 성공`);
      
    } catch (error) {
      console.error(`❌ Transfer failed:`, error.message);
    }
    
  } else {
    console.log(`❌ Insufficient OKB balance for transfer`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });