// ─── JWT 인증 헬퍼 ─────────────────────────────────────────
// jose 기반 httpOnly 쿠키 세션 — admin / demo 역할 구분

import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'session';
const JWT_EXPIRY = '7d';

export type SessionRole = 'admin' | 'demo';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되어 있지 않습니다.');
  return new TextEncoder().encode(secret);
}

/** JWT 토큰 발급 (역할 포함) */
export async function signToken(role: SessionRole = 'admin'): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());
}

/** JWT 토큰 검증 — 유효하면 payload 반환, 실패하면 null */
export async function verifyToken(token: string): Promise<{ role: SessionRole } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { role: SessionRole };
  } catch {
    return null;
  }
}
