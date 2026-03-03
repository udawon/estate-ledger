import { NextRequest, NextResponse } from 'next/server';
import { getSales, createSale } from '@/lib/db/sales';
import type { SaleListingInput } from '@/types/listings';

// GET /api/listings/sales — 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filter = {
    search: searchParams.get('search') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  };

  try {
    const data = getSales(filter);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[sales GET]', err);
    return NextResponse.json({ success: false, error: '목록 조회 실패' }, { status: 500 });
  }
}

// POST /api/listings/sales — 등록
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SaleListingInput;
    const item = createSale(body);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    console.error('[sales POST]', err);
    return NextResponse.json({ success: false, error: '등록 실패' }, { status: 500 });
  }
}
