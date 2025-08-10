// API 키 테스트 스크립트
// 실행: node scripts/test-api-keys.js

require('dotenv').config({ path: '.env.local' });

console.log('🔍 API 키 확인 중...\n');

// 1. 환경 변수 확인
const requiredEnvVars = [
  'OKX_API_KEY',
  'OKX_SECRET_KEY',
  'OKX_PASSPHRASE',
  'NEXT_PUBLIC_PIMLICO_API_KEY'
];

let allPresent = true;
requiredEnvVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 8)}...`);
  } else {
    console.log(`❌ ${key}: 없음`);
    allPresent = false;
  }
});

console.log('\n');

// 2. OKX API 테스트
async function testOKXAPI() {
  console.log('📡 OKX API 테스트...');
  
  try {
    const response = await fetch('https://www.okx.com/api/v5/dex/aggregator/supported/chain', {
      headers: {
        'OK-ACCESS-KEY': process.env.OKX_API_KEY || '',
        'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE || '',
      }
    });
    
    const data = await response.json();
    
    if (data.code === '0') {
      console.log('✅ OKX API 연결 성공');
      const xlayer = data.data.find(chain => chain.chainId === '196');
      if (xlayer) {
        console.log('✅ XLayer 지원 확인됨');
      } else {
        console.log('⚠️  XLayer가 목록에 없음');
      }
    } else {
      console.log('❌ OKX API 오류:', data.msg);
    }
  } catch (error) {
    console.log('❌ OKX API 연결 실패:', error.message);
  }
}

// 3. Pimlico API 테스트
async function testPimlicoAPI() {
  console.log('\n📡 Pimlico API 테스트...');
  
  const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY || '';
  
  if (!apiKey) {
    console.log('❌ Pimlico API 키가 없습니다');
    return;
  }
  
  try {
    const response = await fetch(`https://api.pimlico.io/v2/xlayer/rpc?apikey=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    
    if (data.result) {
      const chainId = parseInt(data.result, 16);
      console.log('✅ Pimlico API 연결 성공');
      console.log(`✅ Chain ID: ${chainId} (${chainId === 196 ? 'XLayer' : '다른 네트워크'})`);
    } else if (data.error) {
      console.log('❌ Pimlico API 오류:', data.error.message);
    }
  } catch (error) {
    console.log('❌ Pimlico API 연결 실패:', error.message);
  }
}

// 4. XLayer RPC 테스트
async function testXLayerRPC() {
  console.log('\n📡 XLayer RPC 테스트...');
  
  try {
    const response = await fetch('https://rpc.xlayer.tech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    
    if (data.result) {
      const chainId = parseInt(data.result, 16);
      console.log('✅ XLayer RPC 연결 성공');
      console.log(`✅ Chain ID: ${chainId}`);
    } else {
      console.log('❌ XLayer RPC 오류');
    }
  } catch (error) {
    console.log('❌ XLayer RPC 연결 실패:', error.message);
  }
}

// 테스트 실행
async function runTests() {
  if (!allPresent) {
    console.log('⚠️  일부 API 키가 누락되었습니다. .env.local 파일을 확인하세요.\n');
  }
  
  await testOKXAPI();
  await testPimlicoAPI();
  await testXLayerRPC();
  
  console.log('\n✨ 테스트 완료!');
  
  if (!allPresent) {
    console.log('\n📌 필요한 작업:');
    console.log('1. 누락된 API 키를 발급받으세요');
    console.log('2. .env.local 파일에 추가하세요');
    console.log('3. 이 스크립트를 다시 실행하세요');
  }
}

runTests();