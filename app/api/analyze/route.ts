// ─── POST /api/analyze 핸들러 ────────────────────────────────
// 부동산 입지분석 API 엔드포인트
// CORS: Streamlit(localhost:8501) 등 외부 클라이언트 허용

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, AnalysisResult, AnalysisRequest } from '@/types';
import { analyze } from '@/lib/engine';

/** CORS 허용 헤더 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

/** OPTIONS /api/analyze — CORS Preflight */
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/analyze
 *
 * Body: { address: string } (lat/lng 선택 — 없으면 Nominatim으로 자동 지오코딩)
 * Response: ApiResponse<AnalysisResult>
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalysisResult>>> {
  try {
    const body: unknown = await request.json();

    // 요청 바디 유효성 검사
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: '요청 형식이 올바르지 않습니다.' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { address } = body as Record<string, unknown>;

    // 주소 필수 검증
    if (!address || typeof address !== 'string' || address.trim() === '') {
      return NextResponse.json(
        { success: false, error: '주소를 입력해주세요.' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // 분석 요청 객체 구성 (좌표는 엔진 내부에서 지오코딩)
    const req: AnalysisRequest = {
      address: address.trim(),
    };

    // 분석 엔진 실행
    const result = await analyze(req);

    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[API /analyze] 분석 처리 중 오류:', error);
    return NextResponse.json(
      { success: false, error: '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
