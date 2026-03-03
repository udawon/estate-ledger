import { NextRequest, NextResponse } from 'next/server';
import { updateRental, deleteRental } from '@/lib/db/rentals';
import type { RentalListingInput } from '@/types/listings';

type Params = { params: Promise<{ id: string }> };

// PUT /api/listings/rentals/[id] — 수정
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ success: false, error: '잘못된 ID' }, { status: 400 });

  try {
    const body = await req.json() as Partial<RentalListingInput>;
    const item = updateRental(numId, body);
    if (!item) return NextResponse.json({ success: false, error: '매물을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    console.error('[rentals PUT]', err);
    return NextResponse.json({ success: false, error: '수정 실패' }, { status: 500 });
  }
}

// DELETE /api/listings/rentals/[id] — 삭제
export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ success: false, error: '잘못된 ID' }, { status: 400 });

  try {
    const ok = deleteRental(numId);
    if (!ok) return NextResponse.json({ success: false, error: '매물을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[rentals DELETE]', err);
    return NextResponse.json({ success: false, error: '삭제 실패' }, { status: 500 });
  }
}
