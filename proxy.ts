// ─── 인증 프록시 ─────────────────────────────────────────
// /listings/**, /api/listings/** 라우트를 세션 쿠키로 보호

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

/** 인증이 필요한 경로 패턴 */
const PROTECTED_PATTERNS = [
  /^\/listings(\/.*)?$/,
  /^\/api\/listings(\/.*)?$/,
  /^\/api\/auth\/logout$/,
  /^\/api\/auth\/change-password$/,
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 보호 경로 여부 확인
  const isProtected = PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
  if (!isProtected) return NextResponse.next();

  // 세션 쿠키 검증
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) return NextResponse.next();
  }

  // 미인증: API 요청은 401, 페이지 요청은 /login 리다이렉트
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/listings/:path*',
    '/api/listings/:path*',
    '/api/auth/logout',
    '/api/auth/change-password',
  ],
};
