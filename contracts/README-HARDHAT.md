# Hardhat 배포 가이드

## 사전 준비

### 1. 필요한 도구 설치
```bash
# Node.js가 설치되어 있어야 합니다 (v16 이상)
node --version

# 프로젝트 디렉토리로 이동
cd F:\projects\hackerthon_okx\oneclick-defi

# 의존성 설치
npm install
```

### 2. 환경 변수 설정
`.env` 파일이 이미 설정되어 있습니다. 확인사항:
- `PRIVATE_KEY`: 배포에 사용할 계정의 private key (0x 포함)
- `XLAYER_TESTNET_RPC_URL`: XLayer 테스트넷 RPC URL
- `ETHERSCAN_API_KEY`: 컨트랙트 검증용 (선택사항)

## 배포 방법

### 방법 1: 기본 배포 (권장)
```bash
# 테스트넷 배포
npx hardhat run scripts/deploy.js --network xlayerTestnet

# 메인넷 배포
npx hardhat run scripts/deploy.js --network xlayer
```

### 방법 2: 자동 검증 포함 배포
```bash
# 테스트넷 배포 + 검증
npx hardhat run scripts/deploy-with-verification.js --network xlayerTestnet

# 메인넷 배포 + 검증
npx hardhat run scripts/deploy-with-verification.js --network xlayer
```

### 방법 3: 수동 검증
배포 후 별도로 검증하려면:
```bash
# OneClickFactory 검증
npx hardhat verify --network xlayerTestnet [FACTORY_ADDRESS]

# SessionKeyModule 검증
npx hardhat verify --network xlayerTestnet [SESSION_MODULE_ADDRESS]
```

## 유용한 명령어

### 컴파일
```bash
npx hardhat compile
```

### 테스트
```bash
npx hardhat test
```

### 콘솔 실행
```bash
npx hardhat console --network xlayerTestnet
```

### 가스 리포트
```bash
npx hardhat test --gas-reporter
```

## 배포 결과 확인

배포가 완료되면:
1. `deployments/` 폴더에 배포 정보가 저장됩니다
2. `xlayerTestnet-latest.json` 파일에서 최신 배포 주소 확인
3. 콘솔에 출력된 컨트랙트 주소 확인

## 문제 해결

### "Insufficient funds" 에러
- 테스트넷 OKB가 필요합니다
- Faucet: https://www.okx.com/xlayer/faucet

### "Transaction underpriced" 에러
- 가스 가격이 너무 낮습니다
- `hardhat.config.js`에서 가스 설정 조정

### 검증 실패
- API key 확인
- 컨트랙트 배포 후 5-10 블록 대기
- 네트워크 설정 확인

## 배포된 컨트랙트 주소

배포 후 다음 주소들이 생성됩니다:
- **EntryPoint**: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` (고정)
- **OneClickFactory**: 배포 시 생성
- **SessionKeyModule**: 배포 시 생성

프론트엔드 설정 업데이트:
1. `lib/smart-account/factory.ts` 파일 열기
2. `FACTORY_ADDRESS` 상수를 배포된 주소로 업데이트