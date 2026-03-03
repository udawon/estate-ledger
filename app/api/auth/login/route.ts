// ─── 로그인 API (/api/auth/login) ─────────────────────────
// POST: 비밀번호 검증 → JWT httpOnly 쿠키 발급

import { NextResponse } from 'next/server';
import { signToken, COOKIE_NAME } from '@/lib/auth';
import { checkAdminPassword } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };

    if (!body.password || !(await checkAdminPassword(body.password))) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const token = await signToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
