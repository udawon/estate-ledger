// ─── 업무지구 접근성 유틸 (Haversine 기반) ───────────────────
// TMAP API 없이 직선거리 추정으로 업무지구 통근 시간 계산
// transport.ts · job-demand.ts 공유

// ─── 업무지구 목록 ────────────────────────────────────────────
export const JOB_CENTERS: Array<{ name: string; lat: number; lng: number }> = [
  { name: '강남',      lat: 37.4979, lng: 127.0276 },
  { name: '여의도',    lat: 37.5219, lng: 126.9245 },
  { name: '광화문',    lat: 37.5759, lng: 126.9769 },
  { name: '마포·홍대', lat: 37.5548, lng: 126.9228 },
  { name: '잠실',      lat: 37.5131, lng: 127.1003 },
  { name: '판교',      lat: 37.3946, lng: 127.1108 },
];

// ─── 조회 결과 타입 ───────────────────────────────────────────
export interface HubTimeResult {
  name: string;
  minutes: number;  // 추정 대중교통 소요 시간 (분)
}

// ─── Haversine 직선거리 계산 ──────────────────────────────────
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

/**
 * 서울 지하철 실측 기반 대중교통 시간 추정
 * - 고정 접근 시간 7분 (출발지 역 도보 + 대기)
 * - 단거리(≤5km): 3.5분/km, 장거리(>5km): 3.0분/km
 *
 * 검증 사례:
 *   시청→광화문 1.2km → 7 + 1.2*3.5 = 11분  (실측 약 10분)
 *   도심→강남    10km  → 7 + 5*3.5 + 5*3.0 = 39분 (실측 35-40분)
 */
function haversineMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const d = haversineKm(lat1, lng1, lat2, lng2);
  const travelMin = d <= 5 ? d * 3.5 : 5 * 3.5 + (d - 5) * 3.0;
  return Math.round(Math.max(7 + travelMin, 8));
}

// ─── 가장 가까운 업무지구 조회 ────────────────────────────────
/**
 * 6개 업무지구 중 Haversine 추정 기준 가장 빠른 곳 반환
 */
export function findNearestHub(lat: number, lng: number): HubTimeResult {
  let best: HubTimeResult = { name: '', minutes: Infinity };
  for (const hub of JOB_CENTERS) {
    const min = haversineMinutes(lat, lng, hub.lat, hub.lng);
    if (min < best.minutes) best = { name: hub.name, minutes: min };
  }
  return best;
}

// ─── 점수 변환 ────────────────────────────────────────────────

/**
 * 업무지구 접근성 점수 (40pt) — job-demand.ts용
 */
export function hubTimeToJobScore(minutes: number): number {
  if (minutes <= 30) return 40;
  if (minutes <= 45) return 30;
  if (minutes <= 60) return 18;
  if (minutes <= 75) return 8;
  return 2;
}

/**
 * 업무지구 접근성 점수 (15pt) — transport.ts용
 */
export function hubTimeToTransportScore(minutes: number): number {
  if (minutes <= 30) return 15;
  if (minutes <= 45) return 12;
  if (minutes <= 60) return 8;
  if (minutes <= 75) return 4;
  return 1;
}
