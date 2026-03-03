// ─── 환경위험 점수 계산 엔진 (E 카테고리) ────────────────────
// 파출소·소방서(안전자산) + 도로소음·침수·혐오시설·항공소음 위험 역방향 점수
// + 에어코리아 PM2.5 실측 (신규)
// 위험요소는 없을수록 고점 (역방향 점수 체계)
//
// 배점 구성 (합계 100pt):
//   police_fire  20pt  파출소·소방서 (가까울수록 고점)
//   road_noise   20pt  나들목 없을수록 고점
//   flood_risk   20pt  침수 위험 없을수록 고점
//   nuisance     15pt  혐오시설 없을수록 고점
//   rail_air     10pt  공항·KTX 없을수록 고점
//   air_quality  15pt  PM2.5 낮을수록 고점 (에어코리아 실측)

import type { CategoryScore, Grade } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';
import { searchByKeyword } from '@/lib/api/kakao';
import { isDataGoConfigured, fetchAirQuality } from '@/lib/api/data-go';
import { isSeoulOpenConfigured, fetchFloodHistory } from '@/lib/api/seoul-open';
import { getDistrictScore, getDistrictDetails } from './district-data';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── district 기반 침수 위험 상수 ────────────────────────────
// 서울시 침수 취약 구역 통계 기반 (2023년 기준)
const FLOOD_RISK: Record<string, number> = {
  // FLOOD_LOW (20pt): 침수 위험 낮은 지역
  강남구: 20, 서초구: 20, 용산구: 20, 마포구: 20, 동작구: 20,
  성동구: 20, 서대문구: 20, 양천구: 20, 종로구: 20, 중구: 20,
  금천구: 20, 구로구: 20, 성북구: 20, 강북구: 20, 은평구: 20,
  // FLOOD_MID (10pt): 침수 위험 중간 지역
  송파구: 10, 강서구: 10, 노원구: 10, 도봉구: 10, 광진구: 10,
  동대문구: 10, 관악구: 10,
  // FLOOD_HIGH (0pt): 침수 취약 지역
  강동구: 0, 중랑구: 0, 영등포구: 0,
};

function getFloodRisk(district: string): number {
  return FLOOD_RISK[district] ?? 10;
}

// ─── 파출소·소방서 (20pt) ────────────────────────────────────
// 가까울수록 고점 (안전 자산)
function calcPoliceFire(
  policeCount: number,
  policeNearestDist: number,
  fireCount: number,
  fireNearestDist: number,
): number {
  let score = 0;

  // 파출소·지구대 (12pt)
  if (policeCount > 0) {
    if (policeNearestDist <= 300)      score += 12;
    else if (policeNearestDist <= 500) score += 9;
    else if (policeNearestDist <= 800) score += 6;
    else                               score += 3;
  }

  // 소방서 (8pt)
  if (fireCount > 0) {
    if (fireNearestDist <= 500)         score += 8;
    else if (fireNearestDist <= 1000)   score += 6;
    else if (fireNearestDist <= 1500)   score += 4;
    else if (fireNearestDist <= 2000)   score += 2;
  }

  return score;
}

// ─── 도로 소음 위험 (20pt) ───────────────────────────────────
// 500m 이내 나들목·고가도로 없으면 20pt (역방향)
// 있어도 8pt 부여: penalty 엔진에서 거리 기반 추가 감점 처리
// (완전 0pt는 penalty와 이중 차감이 되어 과도한 감점 발생)
function calcRoadNoiseScore(count: number): number {
  return count === 0 ? 20 : 8;
}

// ─── 혐오시설 (15pt) ─────────────────────────────────────────
// 1km 이내 소각장·납골당 등 없으면 15pt (역방향)
function calcNuisanceScore(count: number): number {
  if (count === 0) return 15;
  if (count === 1) return 6;  // 1개는 부분 점수
  return 0;
}

// ─── 철도·항공 소음 위험 (10pt) ──────────────────────────────
// 500m 이내 공항·KTX역 없으면 10pt (역방향)
function calcRailAirScore(count: number): number {
  return count === 0 ? 10 : 0;
}

// ─── 에어코리아 PM2.5 점수 (15pt) ────────────────────────────
// PM2.5 농도 낮을수록 고점 (에어코리아 실측 or 기본값)
function calcAirQualityScore(pm25: number): number {
  if (pm25 <= 15)  return 15; // 좋음 (WHO 기준)
  if (pm25 <= 25)  return 10; // 보통
  if (pm25 <= 35)  return 5;  // 나쁨
  return 0;                   // 매우 나쁨 (36 이상)
}

function formatAirQualityDetail(pm25: number, stationName: string, isActual: boolean): string {
  const grade =
    pm25 <= 15 ? '좋음' :
    pm25 <= 25 ? '보통' :
    pm25 <= 35 ? '나쁨' : '매우 나쁨';
  const src = isActual ? `에어코리아 ${stationName} 실측` : 'district 기본값';
  return `PM2.5 ${pm25}㎍/㎥ (${grade}) — ${src}`;
}

// ─── Kakao API 기반 실측 점수 계산 ───────────────────────────
async function calcFromKakao(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  // 병렬: 파출소(1km), 지구대(1km), 소방서(2km), 나들목(500m),
  //       소각장·납골당·화장장·폐기물처리(1km), 공항(500m)
  // + 에어코리아 PM2.5 · 침수흔적도 (캐시 활용)
  const [policeRes, jiguRes, fireRes, roadRes, soakRes, nabRes, cremRes, wasteRes, railAirRes, airData, floodData] = await Promise.all([
    searchByKeyword('파출소',    lat, lng, 1000, 10),
    searchByKeyword('지구대',    lat, lng, 1000, 10),
    searchByKeyword('소방서',    lat, lng, 2000,  5),
    searchByKeyword('나들목',    lat, lng,  500,  5),
    searchByKeyword('소각장',    lat, lng, 1000,  5),
    searchByKeyword('납골당',    lat, lng, 1000,  5),
    searchByKeyword('화장장',    lat, lng, 1000,  5),
    searchByKeyword('폐기물처리', lat, lng, 1000,  5),
    searchByKeyword('공항',      lat, lng,  500,  5),
    isDataGoConfigured()    ? fetchAirQuality(district)   : Promise.resolve(null),
    isSeoulOpenConfigured() ? fetchFloodHistory(district) : Promise.resolve(null),
  ]);

  // 파출소·지구대 필터
  const isPolicePlace = (p: { place_name: string; category_name: string }) =>
    p.category_name.includes('경찰') ||
    /파출소$/.test(p.place_name)    ||
    /지구대$/.test(p.place_name);

  const allPolice = [
    ...policeRes.places.filter(isPolicePlace),
    ...jiguRes.places.filter(isPolicePlace),
  ].sort((a, b) => parseInt(a.distance) - parseInt(b.distance));

  const fires = fireRes.places;
  const policeNearestDist = allPolice.length > 0 ? parseInt(allPolice[0].distance) : 9999;
  const fireNearestDist   = fires.length > 0 ? parseInt(fires[0].distance) : 9999;
  const nuisanceCount     = soakRes.places.length + nabRes.places.length + cremRes.places.length + wasteRes.places.length;
  const railAirCount      = railAirRes.places.length;
  const roadNoiseCount    = roadRes.places.length;

  // 에어코리아 PM2.5 (실측 없으면 district 기본값 25 적용)
  const pm25       = airData?.pm25 ?? 25;
  const isActualAir = airData !== null;

  // 침수 점수: 서울시 실측 우선, 실패(score=-1) 또는 미설정 시 district fallback
  const floodScore =
    floodData !== null && floodData.score >= 0
      ? floodData.score
      : getFloodRisk(district);
  const isActualFlood = floodData !== null && floodData.score >= 0;

  const policeFireScore = calcPoliceFire(allPolice.length, policeNearestDist, fires.length, fireNearestDist);
  const roadNoiseScore  = calcRoadNoiseScore(roadNoiseCount);
  const nuisanceScore   = calcNuisanceScore(nuisanceCount);
  const railAirScore    = calcRailAirScore(railAirCount);
  const airScore        = calcAirQualityScore(pm25);

  const score = Math.min(
    policeFireScore + roadNoiseScore + floodScore + nuisanceScore + railAirScore + airScore,
    100,
  );

  // 세부 근거 생성
  const details: string[] = [];

  if (allPolice.length > 0) {
    details.push(`최근접 파출소·지구대: ${allPolice[0].place_name} (${policeNearestDist}m)`);
  } else {
    details.push('반경 1km 이내 파출소·지구대 없음');
  }

  if (fires.length > 0) {
    details.push(`최근접 소방서: ${fires[0].place_name} (${fireNearestDist}m)`);
  } else {
    details.push('반경 2km 이내 소방서 없음');
  }

  details.push(
    roadNoiseCount === 0
      ? '반경 500m 고속도로 나들목 없음 (소음 안전)'
      : '반경 500m 고속도로 나들목 존재 (소음 주의)',
  );
  // 침수 이력 표시 — 실측 시 서울시 데이터 기반 문구, 추정 시 district 문구
  details.push(
    isActualFlood && floodData !== null
      ? floodData.label
      : floodScore === 20 ? '침수 위험 낮은 지역 (district 추정)'
      : floodScore === 10 ? '침수 위험 중간 지역 (district 추정)'
      :                     '침수 취약 지역 주의 (district 추정)',
  );
  details.push(
    nuisanceCount === 0
      ? '반경 1km 이내 혐오시설 없음'
      : '반경 1km 이내 혐오시설 확인 필요',
  );
  details.push(
    railAirCount === 0
      ? '반경 500m 공항·KTX역 없음 (소음 안전)'
      : '반경 500m 공항·KTX역 존재 (소음 주의)',
  );
  details.push(formatAirQualityDetail(pm25, airData?.stationName ?? district, isActualAir));

  return {
    score,
    grade:  getGrade(score),
    label:  '환경위험',
    details,
    weight: CATEGORY_WEIGHTS.envRisk,
  };
}

// ─── District 기반 Fallback ───────────────────────────────────
function calcFromDistrict(district: string): CategoryScore {
  const scores  = getDistrictScore(district);
  const details = getDistrictDetails(district);
  return {
    score:   scores.envRisk,
    grade:   getGrade(scores.envRisk),
    label:   '환경위험',
    details: details.envRisk,
    weight:  CATEGORY_WEIGHTS.envRisk,
  };
}

// ─── 메인 진입점 ──────────────────────────────────────────────
/**
 * 환경위험 점수 계산 (E 카테고리)
 * 파출소·소방서 안전자산 + 소음·침수·혐오시설 역방향 점수 + PM2.5 실측
 */
export async function calcEnvRiskScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  try {
    return await calcFromKakao(lat, lng, district);
  } catch (err) {
    console.warn('[env-risk] Kakao API 실패 → district 데이터 사용:', (err as Error).message);
    return calcFromDistrict(district);
  }
}
