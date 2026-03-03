import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getShops, createShop } from '@/lib/db/shops';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import type { ShopListingInput } from '@/types/listings';

async function getScope(): Promise<'admin' | 'demo'> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? '';
  const session = await verifyToken(token);
  return session?.role ?? 'demo';
}

// GET /api/listings/shops — 목록 조회
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filter = {
    search:   searchParams.get('search')   ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo:   searchParams.get('dateTo')   ?? undefined,
  };

  try {
    const scope = await getScope();
    const data = await getShops(filter, scope);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[shops GET]', err);
    return NextResponse.json({ success: false, error: '목록 조회 실패' }, { status: 500 });
  }
}

// POST /api/listings/shops — 등록
export async function POST(req: NextRequest) {
  try {
    const scope = await getScope();
    const body = await req.json() as ShopListingInput;
    const item = await createShop(body, scope);
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    console.error('[shops POST]', err);
    return NextResponse.json({ success: false, error: '등록 실패' }, { status: 500 });
  }
}
