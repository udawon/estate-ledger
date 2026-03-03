// ─── 비밀번호 변경 API (/api/auth/change-password) ────────
// POST: 현재 비밀번호 검증 → 새 비밀번호 해시 저장
// 데모 계정은 403 반환

import { NextResponse } from 'next/server';
import { checkAdminPassword, hashPassword, setStoredHash } from '@/lib/password';
import { getSessionRole } from '@/lib/session';

export async function POST(req: Request) {
  try {
    // 데모 계정 차단
    const role = await getSessionRole();
    if (role === 'demo') {
      return NextResponse.json(
        { success: false, error: '데모 계정에서는 비밀번호를 변경할 수 없습니다.' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!(await checkAdminPassword(body.currentPassword))) {
      return NextResponse.json(
        { success: false, error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    if (body.newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '새 비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 새 비밀번호 저장
    await setStoredHash(hashPassword(body.newPassword));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
