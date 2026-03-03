// ─── 서울 열린데이터광장 클라이언트 ─────────────────────────────
// 서울시 침수흔적도 API — E.flood_risk 실측용
// 서버 사이드 전용

import { getCache, CACHE_TTL } from '@/lib/cache';

const BASE_URL = 'http://openapi.seoul.go.kr:8088';
const API_KEY  = process.env.SEOUL_OPEN_API_KEY ?? '';

// ─── 설정 확인 ────────────────────────────────────────────────
export function isSeoulOpenConfigured(): boolean {
  return Boolean(API_KEY);
}

// ─── 침수흔적도 API 응답 타입 ──────────────────────────────────
interface FloodRow {
  SGG_NM?:    string;  // 자치구명 (예: "강남구")
  ADMDONG_NM?: string; // 행정동명
  OCCRRNC_DE?: string; // 침수 발생일 (YYYYMMDD)
  INUDTN_AR?:  string; // 침수면적 (㎡)
}

interface FloodApiResponse {
  DrainFloodInfo?: {
    list_total_count?: number;
    RESULT?: { CODE: string; MESSAGE: string };
    row?: FloodRow[];
  };
  // 결과 없음 응답 구조
  RESULT?: { CODE: string; MESSAGE: string };
}

// ─── 침수 결과 타입 ───────────────────────────────────────────
export interface FloodResult {
  score:        number;  // 0 | 12 | 20
  historyCount: number;  // 최근 5년 침수 이력 건수
  isActual:     boolean; // true=실측, false=district fallback
  label:        string;  // 화면 표시용 문구
}

// ─── 점수 변환 ────────────────────────────────────────────────
function calcFloodScore(count: number): number {
  if (count === 0)  return 20; // 침수 이력 없음
  if (count <= 2)   return 12; // 경미 (1~2건)
  return 0;                    // 반복/대규모 침수 (3건+)
}

// ─── 서울시 침수흔적도 조회 (캐시 적용) ──────────────────────
/**
 * 서울시 침수흔적도 API로 자치구 침수 이력 조회
 * @param district 자치구명 (예: "강남구", "관악구")
 * @returns FloodResult — 실패 시 isActual=false, score=-1 (fallback 신호)
 */
export async function fetchFloodHistory(district: string): Promise<FloodResult> {
  const cache    = getCache();
  const cacheKey = `flood:${district}`;

  const cached = await cache.get<FloodResult>(cacheKey);
  if (cached !== null) return cached;

  try {
    // 서울시 침수흔적도 — 전체 1,000건 조회 후 자치구 필터링
    const url = `${BASE_URL}/${API_KEY}/json/DrainFloodInfo/1/1000/`;
    const res  = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`서울 OpenAPI 오류: ${res.status}`);

    const data = (await res.json()) as FloodApiResponse;
    const rows = data.DrainFloodInfo?.row ?? [];

    // 최근 5년 기준일
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    // 자치구 필터 + 5년 이내 데이터 선별
    const districtKey = district.replace('구', '');
    const recentRows  = rows.filter(row => {
      if (!row.SGG_NM?.includes(districtKey)) return false;
      if (!row.OCCRRNC_DE)                    return false;

      // YYYYMMDD → Date 변환
      const d = row.OCCRRNC_DE;
      const date = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
      return !isNaN(date.getTime()) && date >= fiveYearsAgo;
    });

    const count  = recentRows.length;
    const score  = calcFloodScore(count);
    const result: FloodResult = {
      score,
      historyCount: count,
      isActual:     true,
      label:
        count === 0  ? '최근 5년 침수 이력 없음 (서울시 실측)' :
        count <= 2   ? `최근 5년 경미 침수 ${count}건 (서울시 실측)` :
                       `최근 5년 반복 침수 ${count}건 — 취약 지역 (서울시 실측)`,
    };

    await cache.set(cacheKey, result, CACHE_TTL.FLOOD_RISK);
    return result;
  } catch (err) {
    console.warn('[seoul-open] 침수흔적도 조회 실패 → district fallback:', (err as Error).message);
    // score=-1: env-risk.ts에서 district 방식으로 fallback
    return { score: -1, historyCount: 0, isActual: false, label: '' };
  }
}
