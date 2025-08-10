# 📁 Smart Contract 폴더 구조

이 폴더는 OneClick DeFi의 모든 스마트 컨트랙트 관련 파일을 포함합니다.

```
contracts/
├── 📄 스마트 컨트랙트 파일
│   ├── OneClickAccount.sol       # 스마트 계정 컨트랙트
│   ├── OneClickFactory.sol       # 계정 팩토리 컨트랙트
│   └── SessionKeyModule.sol      # 세션 키 모듈
│
├── 📁 interfaces/               # 인터페이스 파일
│   ├── IAccount.sol
│   ├── IEntryPoint.sol
│   └── UserOperation.sol
│
├── 📁 lib/                      # 라이브러리 파일
│   ├── P256Verifier.sol
│   └── WebAuthn.sol
│
├── 📁 scripts/                  # Hardhat 배포 스크립트
│   ├── deploy.js
│   └── deploy-with-verification.js
│
├── 📁 foundry-scripts/          # Foundry 배포 스크립트
│   └── Deploy.s.sol
│
├── 📁 test/                     # 테스트 파일
│   └── OneClickAccount.t.sol
│
├── 📁 deployments/              # 배포 결과 저장
│   └── xlayerTestnet-latest.json
│
├── 📄 설정 파일
│   ├── hardhat.config.js        # Hardhat 설정
│   ├── foundry.toml             # Foundry 설정
│   ├── package.json             # NPM 패키지 설정
│   ├── Makefile                 # Make 명령어
│   └── deploy.sh                # 배포 스크립트
│
├── 📄 환경 파일
│   ├── .env                     # 환경 변수 (Git 제외)
│   └── .env.example             # 환경 변수 예시
│
└── 📄 문서
    ├── README.md                # 기술 문서
    ├── README-HARDHAT.md        # Hardhat 가이드
    ├── README_DEPLOYMENT.md     # Foundry 가이드
    └── STRUCTURE.md             # 이 파일
```

## 🛠️ 도구별 사용법

### Hardhat (JavaScript/TypeScript)
```bash
cd contracts
npm install
npm run deploy
```

### Foundry (Solidity/Rust)
```bash
cd contracts
forge build
make deploy-testnet
```

## 📍 프론트엔드에서 사용
프론트엔드 코드는 상위 폴더에서 이 컨트랙트들을 import합니다:
```typescript
import { FACTORY_ADDRESS } from '../contracts/deployments/xlayerTestnet-latest.json';
```