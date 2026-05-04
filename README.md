# EduPlan AI

초등학교 교사를 위한 AI 커리큘럼 디자이너 MVP입니다.

## 현재 구현 범위

- Google OAuth 로그인
  - `/login` 로그인 페이지
  - 로그인 후 `/dashboard` 이동
- 대시보드
  - 저장된 단원 설계 목록 조회
  - 특정 설계 이어서 작업(`/planner?projectId=...`)
- 단원 설계 화면
  - `/planner` 진입
- PRD 기반 3-Pane 화면
  - 좌측: Step Navigation (진행/완료 상태 + 완성도)
  - 중앙: AI Design Lab (단계별 입력 + Guide Chips + AI 보조 실행)
  - 우측: Outcome Archive (확정 카드 + 인라인 편집)
- 5단계 설계 흐름
  - 단원 설정
  - 개념 추출
  - 탐구 질문
  - 평가 설계
  - 차시 설계
- Lock & Load 기반 맥락 연결
  - 확정된 카드 내용이 다음 단계 보조 응답 컨텍스트에 반영
- 파일 기반 저장/복구
  - 자동 저장(프로젝트 상태 변경 시)
  - 최근 작업 자동 불러오기
- AI Provider 설정
  - `stub` / `openai` / `anthropic` 선택
  - API 키 암호화 저장(AES-256-GCM)
- AI 보조 스트리밍
  - 응답을 chunk 단위로 화면에 실시간 출력
  - 중단 버튼으로 스트림 취소
- 커스텀 성취기준 업로드
  - JSON/CSV 텍스트 업로드 지원
  - 업로드 후 성취기준 선택 목록에 즉시 반영
- 표준 API 초안
  - `GET /api/auth/session` (세션 조회)
  - `GET /api/auth/google` (Google OAuth 시작)
  - `GET /api/auth/google/callback` (OAuth 콜백)
  - `POST /api/auth/logout` (로그아웃)
  - `GET /api/standards` (목업 성취기준 조회/검색)
  - `POST /api/standards/upload` (커스텀 성취기준 업로드)
  - `GET/POST /api/projects` (프로젝트 목록/저장)
  - `GET /api/projects/[id]` (프로젝트 조회)
  - `GET/POST /api/settings/ai` (Provider 설정)
  - `POST /api/generate/stream` (스트리밍 생성)

## 실행

1. `npm install`
2. `npm run dev`
3. 브라우저에서 `http://localhost:3001` 접속

선택 환경 변수

- `SESSION_SECRET`: 로그인 세션 서명 시크릿
- `AES_SECRET`: API 키 암호화용 시크릿(미설정 시 개발용 기본값 사용)
- `OPENAI_MODEL`: OpenAI 모델명(기본 `gpt-4.1-mini`)
- `ANTHROPIC_MODEL`: Anthropic 모델명(기본 `claude-3-5-sonnet-latest`)
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
- `GOOGLE_REDIRECT_URI`: OAuth 콜백 URI
  - 로컬 예시: `http://localhost:3001/api/auth/google/callback`

커스텀 성취기준 업로드 포맷

- JSON 예시
  - `[{"achievementCode":"[6과12-09]","achievementText":"...","subject":"과학","domain":"생명","gradeCluster":"5~6학년군"}]`
- CSV 헤더
  - `achievementCode,achievementText,subject,domain,gradeCluster`

## 다음 개발 우선순위

1. 실제 DB 연동 (현재 파일 저장소 `data/projects.json`)
2. Google 로그인 사용자 권한/역할(교사, 관리자) 분리
3. PDF/Excel 파일 업로드(파일 바이너리) + 추출 파이프라인
4. 산출물 다운로드(PDF/DOCX/HWP) 확장
