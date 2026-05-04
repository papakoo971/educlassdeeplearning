import { createClient, SupabaseClient } from "@supabase/supabase-js";

// 실제 호출 시점에만 클라이언트 생성 (빌드 타임 에러 방지)
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string) {
    return (getClient() as unknown as Record<string, unknown>)[prop];
  },
});
