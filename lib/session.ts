// ─── 서버 사이드 세션 헬퍼 ────────────────────────────────
// Route Handler / Server Component 전용 (Edge Runtime 비호환)

import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME, type SessionRole } from '@/lib/auth';

/** 현재 요청의 세션 역할 반환 (없거나 만료 시 null) */
export async function getSessionRole(): Promise<SessionRole | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    return payload?.role ?? null;
  } catch {
    return null;
  }
}
