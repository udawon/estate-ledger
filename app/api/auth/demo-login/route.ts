// ─── 데모 로그인 API (/api/auth/demo-login) ───────────────
// POST: 비밀번호 없이 데모 세션 발급 (포트폴리오 체험용)

import { NextResponse } from 'next/server';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const token = await signToken('demo');
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24, // 데모는 24시간
  });
  return res;
}
