import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRentals, createRental } from '@/lib/db/rentals';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import type { RentalListingInput } from '@/types/listings';

// 세션에서 scope 추출
async function getScope(): Promise<'admin' | 'demo'> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? '';
  const session = await verifyToken(token);
  return session?.role ?? 'demo';
}

// GET /api/listings/rentals — 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filter = {
    search:   searchParams.get('search')   ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo:   searchParams.get('dateTo')   ?? undefined,
  };

  try {
    const scope = await getScope();
    const data = await getRentals(filter, scope);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[rentals GET]', err);
    return NextResponse.json({ success: false, error: '목록 조회 실패' }, { status: 500 });
  }
}

// POST /api/listings/rentals — 등록
export async function POST(req: NextRequest) {
  try {
    const scope = await getScope();
    const body = await req.json() as RentalListingInput;
    const item = await createRental(body, scope);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    console.error('[rentals POST]', err);
    return NextResponse.json({ success: false, error: '등록 실패' }, { status: 500 });
  }
}
