// ─── data.go.kr 공공데이터포털 API 클라이언트 ────────────────────
// 에어코리아 PM2.5 + 국토부 건축물대장 공통 인증키 사용
// 서버 사이드 전용

import { getCache, CACHE_TTL } from '@/lib/cache';

const API_KEY = process.env.DATA_GO_API_KEY ?? '';
const BASE = 'https://apis.data.go.kr';

// ─── 설정 확인 ────────────────────────────────────────────────
export function isDataGoConfigured(): boolean {
  return Boolean(API_KEY);
}

// ─── 내부: 공통 fetch 유틸 ────────────────────────────────────
async function dataGoFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  // serviceKey는 URLSearchParams 경유 시 자동 인코딩 — 이중 인코딩 방지를 위해 수동 추가
  const queryStr =
    Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&') + `&serviceKey=${API_KEY}`;

  const res = await fetch(`${url.toString()}?${queryStr}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`data.go.kr API 오류: ${res.status} (${path})`);
  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════
// A. 에어코리아 — PM2.5 측정소별 실시간 측정정보
// ══════════════════════════════════════════════════════════════

// 서울 25개 자치구 → 에어코리아 측정소명 매핑
const DISTRICT_STATION: Record<string, string> = {
  강남구: '강남구', 강동구: '강동구', 강북구: '강북구', 강서구: '강서구',
  관악구: '관악구', 광진구: '광진구', 구로구: '구로구', 금천구: '금천구',
  노원구: '노원구', 도봉구: '도봉구', 동대문구: '동대문구', 동작구: '동작구',
  마포구: '마포구', 서대문구: '서대문구', 서초구: '서초구', 성동구: '성동구',
  성북구: '성북구', 송파구: '송파구', 양천구: '양천구', 영등포구: '영등포구',
  용산구: '용산구', 은평구: '은평구', 종로구: '종로구', 중구: '중구',
  중랑구: '중랑구',
};

export interface AirQualityResult {
  pm25: number;       // PM2.5 농도 (㎍/㎥)
  pm10: number;       // PM10 농도 (㎍/㎥)
  stationName: string;
  dataTime: string;   // 측정 시각
}

interface AirQualityItem {
  pm25Value: string;
  pm10Value: string;
  stationName: string;
  dataTime: string;
}

interface AirQualityResponse {
  response: {
    body: {
      items: AirQualityItem[];
    };
    header: { resultCode: string; resultMsg: string };
  };
}

/**
 * 에어코리아 PM2.5 측정값 조회 (district 기반 측정소 자동 선택)
 * - TTL 6시간 캐시 적용
 */
export async function fetchAirQuality(district: string): Promise<AirQualityResult | null> {
  const stationName = DISTRICT_STATION[district];
  if (!stationName) return null;

  const cacheKey = `airquality_${stationName}`;
  const cache = getCache();
  const cached = await cache.get<AirQualityResult>(cacheKey);
  if (cached) return cached;

  try {
    const data = await dataGoFetch<AirQualityResponse>(
      '/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty',
      {
        returnType: 'json',
        numOfRows: '1',
        pageNo: '1',
        stationName,
        dataTerm: 'DAILY',
        ver: '1.0',
      },
    );

    const item = data.response?.body?.items?.[0];
    if (!item) return null;

    const result: AirQualityResult = {
      pm25:        parseFloat(item.pm25Value) || 0,
      pm10:        parseFloat(item.pm10Value) || 0,
      stationName: item.stationName,
      dataTime:    item.dataTime,
    };

    await cache.set(cacheKey, result, CACHE_TTL.AIR_QUALITY);
    return result;
  } catch (err) {
    console.warn('[data-go] 에어코리아 조회 실패:', (err as Error).message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// B. 국토부 건축물대장 — 법정동별 건물 목록 조회
// ══════════════════════════════════════════════════════════════

export interface BuildingInfo {
  bldNm: string;         // 건물명
  useAprDay: string;     // 사용승인일 (YYYYMMDD)
  mainPurpsCdNm: string; // 주용도명
  strctCdNm: string;     // 구조명
  totArea: string;       // 연면적 (㎡)
}

interface BuildingResponse {
  response: {
    body: {
      items: { item: BuildingInfo[] } | BuildingInfo[] | null;
      totalCount: number;
    };
    header: { resultCode: string; resultMsg: string };
  };
}

/**
 * 건축물대장 기본개요 조회 — 법정동 내 건물 목록
 * @param sigunguCd - 시군구 코드 5자리 (예: '11680' 강남구)
 * @param bjdongCd  - 법정동 코드 5자리 (예: '10500' 역삼동)
 * - TTL 30일 캐시 적용
 */
export async function fetchBuildingList(
  sigunguCd: string,
  bjdongCd: string,
): Promise<BuildingInfo[]> {
  const cacheKey = `building_${sigunguCd}_${bjdongCd}`;
  const cache = getCache();
  const cached = await cache.get<BuildingInfo[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await dataGoFetch<BuildingResponse>(
      '/1613000/BldRgstHubService/getBrBasisOulnInfo',
      {
        sigunguCd,
        bjdongCd,
        numOfRows: '100',
        pageNo: '1',
        _type: 'json',
      },
    );

    const body = data.response?.body;
    if (!body || body.totalCount === 0) return [];

    // API 응답 구조: items.item (배열) 또는 items (배열)
    let items: BuildingInfo[] = [];
    if (body.items && 'item' in body.items) {
      const raw = body.items.item;
      items = Array.isArray(raw) ? raw : [raw];
    } else if (Array.isArray(body.items)) {
      items = body.items;
    }

    await cache.set(cacheKey, items, CACHE_TTL.BUILDING);
    return items;
  } catch (err) {
    console.warn('[data-go] 건축물대장 조회 실패:', (err as Error).message);
    return [];
  }
}

/**
 * 건축물대장 기반 신축 비율 점수 계산 (25pt 만점)
 * 10년 이내 사용승인 건물 비율 기준
 */
export function calcNewBuildScore(buildings: BuildingInfo[]): {
  score: number;
  label: string;
} {
  if (buildings.length === 0) {
    return { score: 12, label: '건축물 데이터 없음 — 기본값 적용' };
  }

  const currentYear = new Date().getFullYear();
  const threshold = currentYear - 10; // 10년 이내 = 신축 기준

  const newBuilds = buildings.filter(b => {
    const year = parseInt(b.useAprDay?.slice(0, 4) ?? '0');
    return year >= threshold && year > 1900;
  });

  const ratio = newBuilds.length / buildings.length;

  if (ratio >= 0.40) return { score: 25, label: `신축 비율 ${Math.round(ratio * 100)}% (10년 이내 건물 다수)` };
  if (ratio >= 0.20) return { score: 15, label: `신축 비율 ${Math.round(ratio * 100)}% (신구축 혼재)` };
  return { score: 5, label: `신축 비율 ${Math.round(ratio * 100)}% (구축 위주)` };
}
