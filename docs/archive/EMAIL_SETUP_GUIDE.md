# 이메일 설정 가이드 (Email Setup Guide)

## 개요
OneClick DeFi는 이메일 OTP 인증을 사용합니다. 개발 환경에서 실제 이메일을 전송하려면 SMTP 설정이 필요합니다.

## Gmail을 사용한 설정 방법

### 1. Gmail 앱 비밀번호 생성

1. Google 계정에 로그인합니다
2. 2단계 인증을 활성화합니다 (필수)
   - https://myaccount.google.com/security
   - "2단계 인증" 클릭 → 설정 완료

3. 앱 비밀번호를 생성합니다
   - https://myaccount.google.com/apppasswords
   - "앱 선택" → "기타(맞춤 이름)"
   - "OneClick DeFi" 입력
   - 생성된 16자리 비밀번호 복사

### 2. .env.local 설정

`.env.local` 파일에 다음 내용을 추가합니다:

```env
# Gmail SMTP 설정
EMAIL_FROM=your-email@gmail.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

**주의사항:**
- `EMAIL_PASS`에는 Gmail 계정 비밀번호가 아닌 앱 비밀번호를 입력하세요
- 앱 비밀번호의 공백은 제거하세요 (예: `abcd efgh ijkl mnop` → `abcdefghijklmnop`)

### 3. 설정 확인

브라우저에서 다음 URL로 이메일 설정을 테스트할 수 있습니다:
```
http://localhost:3500/api/auth/test-email
```

성공적인 응답 예시:
```json
{
  "success": true,
  "message": "Email configuration is valid",
  "config": {
    "host": "smtp.gmail.com",
    "port": "587",
    "user": "your-email@gmail.com",
    "from": "your-email@gmail.com",
    "hasPassword": true
  }
}
```

## 다른 이메일 제공자 설정

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password
```

### Custom SMTP
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-username
EMAIL_PASS=your-password
```

## 문제 해결

### 1. "Invalid login" 오류
- 2단계 인증이 활성화되어 있는지 확인
- 앱 비밀번호를 올바르게 입력했는지 확인
- 공백이 제거되었는지 확인

### 2. "Connection timeout" 오류
- 방화벽이 SMTP 포트(587)를 차단하지 않는지 확인
- VPN을 사용 중이라면 비활성화 후 시도

### 3. 이메일이 스팸함으로 가는 경우
- `EMAIL_FROM`을 실제 이메일 주소로 설정
- 이메일 제목과 내용이 스팸 필터를 트리거하지 않도록 확인

## 개발 모드 동작

이메일이 설정되지 않은 경우:
1. OTP가 콘솔에 로그됩니다
2. 개발 모드에서는 화면에도 표시됩니다
3. 실제 이메일은 전송되지 않습니다

이메일이 설정된 경우:
1. 실제 이메일이 전송됩니다
2. 이메일 전송 실패 시 개발 모드에서는 여전히 OTP가 표시됩니다

## 프로덕션 환경

프로덕션에서는 다음 서비스 사용을 권장합니다:
- SendGrid
- AWS SES
- Mailgun
- Postmark

이러한 서비스들은 더 나은 전송률과 모니터링을 제공합니다.

## 보안 주의사항

1. `.env.local` 파일을 절대 커밋하지 마세요
2. 앱 비밀번호를 안전하게 보관하세요
3. 프로덕션에서는 환경 변수를 안전하게 관리하세요