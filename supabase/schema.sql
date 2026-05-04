-- ============================================================
-- EduPlan AI - Supabase Schema
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ============================================================

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  user_id   TEXT PRIMARY KEY,
  email     TEXT UNIQUE NOT NULL,
  name      TEXT,
  picture   TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 프로젝트 테이블
CREATE TABLE IF NOT EXISTS projects (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title                TEXT DEFAULT '',
  current_step         TEXT DEFAULT 'step1',
  steps                JSONB DEFAULT '{}',
  cards                JSONB DEFAULT '[]',
  selected_standard_ids JSONB DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

-- 3. 프로젝트 100개 제한 트리거
CREATE OR REPLACE FUNCTION check_project_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM projects WHERE user_id = NEW.user_id) >= 100 THEN
    RAISE EXCEPTION 'project_limit_exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_project_limit ON projects;
CREATE TRIGGER enforce_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION check_project_limit();

-- 4. AI 설정 테이블
CREATE TABLE IF NOT EXISTS ai_settings (
  user_id       TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  provider      TEXT DEFAULT 'stub',
  model         TEXT DEFAULT '',
  encrypted_key TEXT DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 5. 커스텀 성취기준 테이블
CREATE TABLE IF NOT EXISTS custom_standards (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  standard   JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_standards_user_code_idx
  ON custom_standards (user_id, (standard->>'achievementCode'));

CREATE INDEX IF NOT EXISTS custom_standards_user_id_idx ON custom_standards(user_id);

-- 6. Row Level Security (RLS) - service role key는 RLS 우회하므로 비활성화
-- 서버사이드에서 service role key만 사용하므로 RLS 불필요
-- 필요 시 활성화 가능
