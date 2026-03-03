// ─── TMAP SK Open API 클라이언트 ────────────────────────────────
// 대중교통 경로 탐색 — 실제 통근 시간 측정용
// 서버 사이드 전용

import { getCache, CACHE_TTL } from '@/lib/cache';

const APP_KEY = process.env.TMAP_API_KEY ?? '';
const BASE    = 'https://apis.openapi.sk.com/transit/routes/sub';

// ─── 설정 확인 ────────────────────────────────────────────────
export function isTmapConfigured(): boolean {
  return Boolean(APP_KEY);
}

// ─── 업무지구 목록 (transport.ts · job-demand.ts 공유) ────────
export const JOB_CENTERS: Array<{ name: string; lat: number; lng: number }> = [
  { name: '강남',      lat: 37.4979, lng: 127.0276 },
  { name: '여의도',    lat: 37.5219, lng: 126.9245 },
  { name: '광화문',    lat: 37.5759, lng: 126.9769 },
  { name: '마포·홍대', lat: 37.5548, lng: 126.9228 },
  { name: '잠실',      lat: 37.5131, lng: 127.1003 },
  { name: '판교',      lat: 37.3946, lng: 127.1108 },
];

// ─── 대중교통 경로 응답 타입 ──────────────────────────────────
interface TmapItinerary {
  totalTime: number;   // 총 소요 시간 (초)
  totalWalkTime: number;
  transferCount: number;
}

interface TmapResponse {
  metaData?: {
    plan?: {
      itineraries?: TmapItinerary[];
    };
  };
}

// ─── 단일 경로 조회 (캐시 적용) ──────────────────────────────
/**
 * 두 좌표 간 대중교통 소요 시간 조회
 * @returns 소요 시간 (분), 조회 실패 시 null
 */
async function fetchTransitMinutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  hubName: string,
): Promise<number | null> {
  // 캐시 키: 소수점 3자리 반올림 (약 100m 이내 동일 키)
  const latR = Math.round(startLat * 1000) / 1000;
  const lngR = Math.round(startLng * 1000) / 1000;
  const cacheKey = `tmap_${latR}_${lngR}_${hubName}`;

  const cache  = getCache();
  const cached = await cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        appKey: APP_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        startX: String(startLng),  // 경도 (X)
        startY: String(startLat),  // 위도 (Y)
        endX:   String(endLng),
        endY:   String(endLat),
        count:  1,
        format: 'json',
        lang:   0,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[tmap] ${hubName} 경로 오류: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as TmapResponse;
    const itinerary = data.metaData?.plan?.itineraries?.[0];
    if (!itinerary) return null;

    const minutes = Math.round(itinerary.totalTime / 60);
    await cache.set(cacheKey, minutes, CACHE_TTL.TMAP_ROUTE);
    return minutes;
  } catch (err) {
    console.warn(`[tmap] ${hubName} 조회 실패:`, (err as Error).message);
    return null;
  }
}

// ─── 업무지구 전체 조회 결과 타입 ────────────────────────────
export interface HubTimeResult {
  name: string;
  minutes: number;       // 실측 대중교통 소요 시간 (분)
  isActual: boolean;     // true=TMAP 실측, false=Haversine 추정
}

// ─── Haversine fallback 유틸 ──────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function haversineMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const d = haversineKm(lat1, lng1, lat2, lng2);
  // 서울 지하철 실측 기반 추정 계수
  //   고정 접근 시간 7분 (출발지 역 도보 + 대기)
  //   + 거리별 지하철 시간: 단거리(≤5km) 3.5분/km, 장거리(>5km) 3.0분/km
  //
  // 검증 사례:
  //   시청→광화문 1.2km → 7 + 1.2*3.5 = 11분  (TMAP 실측 10분)
  //   도심→강남    10km  → 7 + 5*3.5 + 5*3.0 = 39분 (실제 약 35-40분)
  //   외곽→강남    18km  → 7 + 5*3.5 + 13*3.0 = 63분 (실제 약 60-65분)
  const travelMin = d <= 5
    ? d * 3.5
    : 5 * 3.5 + (d - 5) * 3.0;
  return Math.round(Math.max(7 + travelMin, 8));
}

// ─── 공개 API: 가장 가까운 업무지구 조회 ─────────────────────
/**
 * 6개 업무지구 중 실제 대중교통 기준 가장 빠른 곳 반환
 * - TMAP 설정 시: 실측 소요 시간 (병렬 조회 + 캐시)
 * - TMAP 미설정 시: Haversine 추정값 fallback
 */
export async function fetchNearestHub(
  lat: number,
  lng: number,
): Promise<HubTimeResult> {
  if (!isTmapConfigured()) {
    // Haversine fallback
    let best: HubTimeResult = { name: '', minutes: Infinity, isActual: false };
    for (const hub of JOB_CENTERS) {
      const min = haversineMinutes(lat, lng, hub.lat, hub.lng);
      if (min < best.minutes) best = { name: hub.name, minutes: min, isActual: false };
    }
    return best;
  }

  // 6개 업무지구 병렬 조회 (캐시로 중복 호출 차단)
  const results = await Promise.all(
    JOB_CENTERS.map(async hub => {
      const min = await fetchTransitMinutes(lat, lng, hub.lat, hub.lng, hub.name);
      return {
        name:     hub.name,
        minutes:  min ?? haversineMinutes(lat, lng, hub.lat, hub.lng), // 개별 실패 시 fallback
        isActual: min !== null,
      };
    }),
  );

  // 소요 시간 최솟값 선택
  return results.reduce((best, cur) => cur.minutes < best.minutes ? cur : best);
}

// ─── 점수 변환 ────────────────────────────────────────────────

/**
 * 업무지구 접근성 점수 (40pt) — job-demand.ts용
 * 실제 대중교통 소요 시간 기반
 */
export function hubTimeToJobScore(minutes: number): number {
  if (minutes <= 30)  return 40;
  if (minutes <= 45)  return 30;
  if (minutes <= 60)  return 18;
  if (minutes <= 75)  return 8;
  return 2;
}

/**
 * 업무지구 접근성 점수 (15pt) — transport.ts용
 * 실제 대중교통 소요 시간 기반
 */
export function hubTimeToTransportScore(minutes: number): number {
  if (minutes <= 30)  return 15;
  if (minutes <= 45)  return 12;
  if (minutes <= 60)  return 8;
  if (minutes <= 75)  return 4;
  return 1;
}
