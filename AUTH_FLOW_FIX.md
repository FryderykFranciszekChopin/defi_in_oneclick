# 인증 플로우 수정 요약

## 문제점
- 로그아웃 후 다시 로그인하면 항상 "Create Security Key" 화면이 나타남
- 이미 로컬에 저장된 Passkey가 있어도 다시 생성하라고 요구

## 해결 방안

### 1. GoogleSignInWithPasskey 컴포넌트 수정
- Google 로그인 성공 시 자동으로 로컬 Passkey 확인
- 로컬에 Passkey가 있으면 자동으로 대시보드로 이동
- 없을 때만 Passkey 생성 화면 표시

### 2. 플로우 개선

#### 첫 번째 로그인 (신규 사용자)
1. Google 로그인
2. Passkey 생성 화면 표시
3. Passkey 생성 → LocalStorage에 저장
4. 대시보드 이동

#### 재로그인 (기존 사용자 - 같은 기기)
1. Google 로그인
2. LocalStorage에서 Passkey 자동 감지
3. **Passkey 생성 화면 건너뛰고** 바로 대시보드 이동

#### 다른 기기에서 로그인 (기존 사용자 - 다른 기기)
1. Google 로그인
2. DB에 스마트 계정이 있지만 로컬에 Passkey 없음
3. "Add Security Key to This Device" 메시지와 함께 Passkey 생성
4. 동일한 지갑에 접근

### 3. 주요 변경사항

```typescript
// GoogleSignInWithPasskey.tsx
useEffect(() => {
  const checkAndProceed = async () => {
    if (session?.user?.email && step !== 'loading') {
      setStep('loading');
      
      const existingPasskey = getStoredPasskey();
      
      if (existingPasskey && existingPasskey.email === session.user.email) {
        // 로컬 Passkey 있음 → 자동으로 대시보드 이동
        await handleExistingPasskey(existingPasskey);
      } else if (session.user.smartAccountAddress) {
        // 다른 기기 → Passkey 생성 필요
        setStep('passkey');
      } else {
        // 신규 사용자 → Passkey 생성 필요
        setStep('passkey');
      }
    }
  };
  
  checkAndProceed();
}, [session]);
```

### 4. 사용자 경험 개선
- 불필요한 Passkey 재생성 요구 제거
- 기기별로 한 번만 Passkey 생성하면 됨
- 다른 기기에서는 명확한 메시지 표시: "Add Security Key to This Device"

## 보안 유지
- Google 계정이 해킹되어도 Passkey 없이는 트랜잭션 불가
- 각 기기마다 고유한 Passkey 필요
- 로그아웃 시 세션만 삭제, Passkey는 유지하여 재로그인 편의성 제공
- 필요시 브라우저 설정에서 Passkey를 수동으로 삭제 가능

## 최종 수정사항
- Dashboard.tsx: `clearPasskey()` 제거하여 로그아웃 시 Passkey 유지
- 로그아웃 API: NextAuth의 `signOut` 사용하여 세션만 정리