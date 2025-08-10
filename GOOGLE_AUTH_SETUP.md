# Google OAuth 설정 가이드

## 개요
OneClick DeFi를 Google 인증으로 전환했습니다. HTTPS 없이도 localhost에서 작동합니다!

## 설정 단계

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 프로젝트 생성 또는 선택
3. "APIs & Services" → "Credentials" 이동
4. "Create Credentials" → "OAuth client ID" 클릭

### 2. OAuth 클라이언트 설정

1. Application type: "Web application" 선택
2. Name: "OneClick DeFi" (원하는 이름)
3. Authorized JavaScript origins:
   - `http://localhost:3500`
   - `http://localhost:3000` (백업용)
4. Authorized redirect URIs:
   - `http://localhost:3500/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
5. "Create" 클릭

### 3. 인증 정보 복사

생성 후 나타나는:
- Client ID: `xxx.apps.googleusercontent.com`
- Client Secret: `GOCSPX-xxx`

### 4. .env.local 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3500
NEXTAUTH_SECRET=your-secret-here-32-characters-long

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL="file:./dev.db"

# 기존 설정들 (선택사항)
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_key
OKX_API_KEY=your_okx_api_key
# ... 기타 API 키들
```

### 5. NEXTAUTH_SECRET 생성

터미널에서 실행:
```bash
openssl rand -base64 32
```

또는 온라인 생성기 사용: https://generate-secret.vercel.app/32

### 6. 데이터베이스 초기화

```bash
npx prisma db push
```

### 7. 서버 재시작

```bash
npm run dev
```

## 작동 방식

1. 사용자가 "Continue with Google" 클릭
2. Google 로그인 화면으로 리디렉션
3. 로그인 성공 시 자동으로 스마트 지갑 생성
4. 이메일 기반으로 결정적 지갑 주소 생성
5. 다음 로그인 시 동일한 지갑 접근

## 장점

- ✅ HTTPS 없이 localhost에서 작동
- ✅ 패스키/생체인증 불필요
- ✅ 모든 브라우저/기기에서 작동
- ✅ 사용자 친화적인 로그인
- ✅ 자동 이메일 검증
- ✅ 다중 기기 접근 가능

## 문제 해결

### "Error: Invalid redirect URI"
- Google Console에서 redirect URI가 정확히 설정되었는지 확인
- 포트 번호(3500)가 일치하는지 확인

### "Error: Database connection failed"
- `npx prisma db push` 실행했는지 확인
- `.env.local`에 DATABASE_URL이 설정되었는지 확인

### "Error: NEXTAUTH_SECRET is not set"
- `.env.local`에 NEXTAUTH_SECRET 설정
- 32자 이상의 랜덤 문자열 사용

## 프로덕션 배포

프로덕션 환경에서는:
1. `NEXTAUTH_URL`을 실제 도메인으로 변경
2. Google Console에 프로덕션 도메인 추가
3. PostgreSQL 등 프로덕션 데이터베이스 사용 권장