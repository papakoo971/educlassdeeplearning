# Vercel + Supabase 배포 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속 → 로그인 → New Project
2. 프로젝트명 입력, DB 비밀번호 설정, 리전 선택 (Northeast Asia 추천)
3. 프로젝트 생성 후 **Settings > API** 에서 다음 값 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. DB 스키마 적용

1. Supabase 대시보드 → **SQL Editor** → New Query
2. `supabase/schema.sql` 내용 전체 붙여넣기 → Run

## 3. Google OAuth 리디렉션 URI 추가

Google Cloud Console → OAuth 2.0 클라이언트 → 승인된 리디렉션 URI에 추가:
```
https://your-vercel-domain.vercel.app/api/auth/google/callback
```

## 4. Vercel 배포

```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 프로젝트 루트에서 실행
vercel
```

또는 GitHub 연동 후 자동 배포:
1. https://vercel.com → New Project → GitHub 저장소 선택
2. Framework: Next.js (자동 감지)
3. Environment Variables 설정 (아래 참고)

## 5. Vercel 환경변수 설정

Vercel 대시보드 → Project → Settings → Environment Variables에 아래 항목 추가:

| 변수명 | 값 |
|--------|-----|
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 |
| `SESSION_SECRET` | 세션 서명 비밀키 (32바이트 이상 랜덤 문자열) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 |

## 6. 로컬 개발 시 .env.local 설정

`.env.local` 파일의 Supabase 플레이스홀더를 실제 값으로 교체:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

## 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출하지 마세요.
- `NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저에 노출됩니다 (URL은 공개 정보라 안전).
- 기존 `data/projects.json` 데이터는 Supabase로 자동 마이그레이션되지 않습니다.
  필요 시 별도 마이그레이션 스크립트를 실행하세요.
