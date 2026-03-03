// ─── 현재 세션 역할 조회 (/api/auth/me) ──────────────────
// GET: 클라이언트에서 admin/demo 구분에 사용

import { NextResponse } from 'next/server';
import { getSessionRole } from '@/lib/session';

export async function GET() {
  const role = await getSessionRole();
  if (!role) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({ role });
}
