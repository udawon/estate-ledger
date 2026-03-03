import { NextRequest, NextResponse } from 'next/server';
import { getShops, createShop } from '@/lib/db/shops';
import type { ShopListingInput } from '@/types/listings';

// GET /api/listings/shops — 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filter = {
    search: searchParams.get('search') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  };

  try {
    const data = getShops(filter);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[shops GET]', err);
    return NextResponse.json({ success: false, error: '목록 조회 실패' }, { status: 500 });
  }
}

// POST /api/listings/shops — 등록
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ShopListingInput;
    const item = createShop(body);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    console.error('[shops POST]', err);
    return NextResponse.json({ success: false, error: '등록 실패' }, { status: 500 });
  }
}
