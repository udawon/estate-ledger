import { NextRequest, NextResponse } from 'next/server';
import { getRentals, createRental } from '@/lib/db/rentals';
import type { RentalListingInput } from '@/types/listings';

// GET /api/listings/rentals — 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filter = {
    search: searchParams.get('search') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  };

  try {
    const data = getRentals(filter);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[rentals GET]', err);
    return NextResponse.json({ success: false, error: '목록 조회 실패' }, { status: 500 });
  }
}

// POST /api/listings/rentals — 등록
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as RentalListingInput;
    const item = createRental(body);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    console.error('[rentals POST]', err);
    return NextResponse.json({ success: false, error: '등록 실패' }, { status: 500 });
  }
}
