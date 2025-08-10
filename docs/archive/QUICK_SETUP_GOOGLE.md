# 🚀 Google OAuth 빠른 설정 가이드

## 1. Google Cloud Console 접속
👉 https://console.cloud.google.com

## 2. 프로젝트 생성
- 상단 프로젝트 선택 드롭다운 클릭
- "새 프로젝트" 클릭
- 프로젝트 이름: "OneClick DeFi" (또는 원하는 이름)
- "만들기" 클릭

## 3. OAuth 동의 화면 설정
1. 왼쪽 메뉴에서 "APIs & Services" > "OAuth consent screen"
2. User Type: "External" 선택
3. 필수 정보 입력:
   - 앱 이름: OneClick DeFi
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 이메일: 본인 이메일
4. "저장 후 계속"
5. Scopes는 기본값 유지 > "저장 후 계속"
6. Test users는 건너뛰기 > "저장 후 계속"

## 4. OAuth 2.0 Client ID 생성
1. 왼쪽 메뉴에서 "APIs & Services" > "Credentials"
2. 상단 "+ CREATE CREDENTIALS" > "OAuth client ID"
3. 설정:
   - Application type: **Web application**
   - Name: OneClick DeFi Web
   - Authorized JavaScript origins:
     ```
     http://localhost:3500
     http://localhost:3000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3500/api/auth/callback/google
     http://localhost:3000/api/auth/callback/google
     ```
4. "CREATE" 클릭

## 5. 인증 정보 복사
생성 완료 팝업에서:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxx`

## 6. .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3500
NEXTAUTH_SECRET=아래_명령어로_생성한_32자_문자열

# Google OAuth
GOOGLE_CLIENT_ID=위에서_복사한_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=위에서_복사한_CLIENT_SECRET

# Database
DATABASE_URL="file:./dev.db"

# 기타 선택사항
NEXT_PUBLIC_PIMLICO_API_KEY=
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=
XLAYER_RPC_URL=https://rpc.xlayer.tech
```

## 7. NEXTAUTH_SECRET 생성
터미널에서 실행:
```bash
openssl rand -base64 32
```

또는 PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach {Get-Random -Maximum 256}))
```

## 8. 데이터베이스 초기화
```bash
npx prisma db push
```

## 9. 서버 재시작
```bash
# Ctrl+C로 서버 중지 후
npm run dev
```

## ✅ 완료!
이제 http://localhost:3500 에서 Google 로그인을 사용할 수 있습니다!

## 🔧 문제 해결

### "client_id is required" 오류
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- `GOOGLE_CLIENT_ID`와 `GOOGLE_CLIENT_SECRET`이 올바르게 설정되었는지 확인
- 서버를 재시작했는지 확인

### "redirect_uri_mismatch" 오류
- Google Console에서 Authorized redirect URIs가 정확히 일치하는지 확인
- 포트 번호(3500)가 맞는지 확인
- 끝에 슬래시(/)가 없어야 함

### 기타 문제
- Google Console에서 OAuth 동의 화면이 "게시됨" 상태인지 확인
- 브라우저 캐시 및 쿠키 삭제 후 재시도