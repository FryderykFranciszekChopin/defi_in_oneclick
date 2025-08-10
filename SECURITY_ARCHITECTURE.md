# OneClick DeFi 보안 아키텍처

## 개요
OneClick DeFi는 **Google OAuth + Passkey** 이중 보안을 사용합니다. 이는 사용자 편의성과 최고 수준의 보안을 동시에 제공합니다.

## 🔐 이중 보안 시스템

### 1단계: Google OAuth (신원 확인)
- **목적**: 사용자 신원 확인 및 이메일 검증
- **역할**: 계정 접근 권한 부여
- **한계**: Google 계정이 해킹되어도 지갑은 안전

### 2단계: Passkey (지갑 보호)
- **목적**: 실제 자산 보호
- **역할**: 모든 트랜잭션 승인
- **보안**: 생체 인증 또는 하드웨어 키 필요

## 🛡️ 보안 플로우

### 1. 계정 생성
```
1. Google 로그인 → 이메일 확인
2. Passkey 생성 → 생체 인증 설정
3. 스마트 지갑 생성 → 이메일 + Passkey로 주소 결정
```

### 2. 트랜잭션 실행
```
1. 사용자가 스왑 요청
2. 스마트 컨트랙트가 UserOperation 생성
3. Passkey로 서명 요청 (생체 인증 필요)
4. 서명된 트랜잭션만 실행
```

## 💡 보안 이점

### Google 계정이 해킹되어도:
- ❌ 해커는 Google 로그인 가능
- ❌ 대시보드 접근 가능
- ✅ **하지만 트랜잭션 불가능** (Passkey 없음)
- ✅ 자산은 100% 안전

### Passkey의 장점:
- 📱 기기에만 저장 (서버 전송 없음)
- 🔒 생체 인증 필수
- 🚫 피싱 불가능
- 🔄 복구 가능 (Google 인증 후 재설정)

## 🔄 계정 복구 시나리오

### 시나리오 1: 기기 분실
1. 새 기기에서 Google 로그인
2. 이메일 인증 통과
3. 새 Passkey 생성
4. 동일한 지갑 주소 접근

### 시나리오 2: Google 계정 해킹
1. 해커는 대시보드만 볼 수 있음
2. 트랜잭션 시도 시 Passkey 요구
3. 생체 인증 실패 → 트랜잭션 차단
4. 사용자는 Google 계정 복구 후 정상 사용

## 🔑 기술적 구현

### Smart Contract
```solidity
// 트랜잭션은 반드시 Passkey 서명 필요
function validateSignature(
    UserOperation calldata userOp,
    bytes32 userOpHash
) returns (uint256) {
    // Passkey 공개키로 서명 검증
    require(verifyPasskeySignature(userOp.signature, userOpHash));
}
```

### Frontend
```typescript
// 모든 트랜잭션에 Passkey 인증 요구
async function executeTransaction() {
    // 1. Google 세션 확인
    if (!session) throw new Error("Not logged in");
    
    // 2. Passkey로 트랜잭션 서명
    const signature = await signWithPasskey(transaction);
    
    // 3. 서명된 트랜잭션만 전송
    await sendTransaction(signature);
}
```

## 📊 보안 수준 비교

| 방식 | 편의성 | 보안성 | 복구 가능 |
|------|--------|--------|-----------|
| 시드 문구 | ⭐ | ⭐⭐ | ⭐ |
| 이메일 OTP | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Google만 | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| **Google + Passkey** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🚀 결론

OneClick DeFi의 보안 모델은:
- **사용자 친화적**: Google 로그인으로 간편하게 시작
- **군사급 보안**: Passkey로 자산 완벽 보호
- **복구 가능**: 기기를 잃어도 계정 복구 가능
- **미래 지향적**: WebAuthn 표준 준수

이는 Web2의 편의성과 Web3의 보안을 완벽하게 결합한 솔루션입니다.