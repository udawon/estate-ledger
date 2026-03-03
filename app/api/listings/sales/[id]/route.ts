import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateSale, deleteSale } from '@/lib/db/sales';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import type { SaleListingInput } from '@/types/listings';

type Params = { params: Promise<{ id: string }> };

async function getScope(): Promise<'admin' | 'demo'> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? '';
  const session = await verifyToken(token);
  return session?.role ?? 'demo';
}

// PUT /api/listings/sales/[id] — 수정
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ success: false, error: '잘못된 ID' }, { status: 400 });

  try {
    const scope = await getScope();
    const body = await req.json() as Partial<SaleListingInput>;
    const item = await updateSale(numId, body, scope);
    if (!item) return NextResponse.json({ success: false, error: '매물을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    console.error('[sales PUT]', err);
    return NextResponse.json({ success: false, error: '수정 실패' }, { status: 500 });
  }
}

// DELETE /api/listings/sales/[id] — 삭제
export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ success: false, error: '잘못된 ID' }, { status: 400 });

  try {
    const scope = await getScope();
    const ok = await deleteSale(numId, scope);
    if (!ok) return NextResponse.json({ success: false, error: '매물을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[sales DELETE]', err);
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 });
  }
}
