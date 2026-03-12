// ─── 교통 접근성 점수 계산 엔진 v2 ────────────────────────────
// Walk Time Bands + 환승역 감지 + 광역버스(M버스) 반영
// Kakao Local API 기반 실측 → Fallback: district 데이터

import type { CategoryScore, Grade } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';
import { searchByCategory, searchByKeyword, KAKAO_CATEGORY, distToWalk } from '@/lib/api/kakao';
import { findNearestHub, hubTimeToTransportScore } from '@/lib/engine/hub-score';
import { getDistrictScore, getDistrictDetails } from './district-data';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── Walk Time Bands (location_engine_live.md 기준) ────────────
// 성인 도보 속도 80m/분 기준
function distToWalkMin(distM: number): number {
  return Math.round(distM / 80);
}

// 지하철역 도보 시간 점수 (45pt) — v3 45pt로 하향 조정
// Walk Time Bands: 0-5분=1.00, 6-10분=0.85, 11-15분=0.60, 16-20분=0.35, 20분+=0.15
function calcSubwayWalkScore(distM: number): number {
  const walkMin = distToWalkMin(distM);
  if (walkMin <=  5) return 45;
  if (walkMin <= 10) return 36;
  if (walkMin <= 15) return 24;
  if (walkMin <= 20) return 14;
  return 5;
}

// 노선 다양성 점수 (25pt) — v3 25pt로 하향 조정
function calcLineScore(
  subways: Array<{ place_name: string; distance: string }>,
): { score: number; hasTransfer: boolean; lineCount: number } {
  if (subways.length === 0) return { score: 0, hasTransfer: false, lineCount: 0 };

  // 역 이름 기반 고유 역 수 산출 (호선·괄호 접미사 제거)
  const stationNames = subways.map(s =>
    s.place_name
      .replace(/\s*\d+호선.*$/g, '')  // " 2호선" 등 제거
      .replace(/\s*\(.*?\)/g, '')      // "(분당선)" 등 괄호 제거
      .trim(),
  );
  const uniqueStations = new Set(stationNames);

  // 환승역: 동일 역명이 2개 이상 결과 → 다노선 역
  const nameCounts = stationNames.reduce<Record<string, number>>((acc, name) => {
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const hasTransfer = Object.values(nameCounts).some(c => c >= 2);
  const lineCount = uniqueStations.size;

  let score = 0;
  if (lineCount >= 4)      score = 25;
  else if (lineCount >= 3) score = 20;
  else if (lineCount >= 2) score = 13;
  else if (lineCount >= 1) score = 7;

  // 환승역 보너스 (+5pt, 25pt 상한)
  if (hasTransfer) score = Math.min(score + 5, 25);

  return { score, hasTransfer, lineCount };
}

// 버스 점수 (15pt): 일반버스 + 광역버스(M버스) 가중 합산 — v3 15pt로 하향 조정
// 카카오 카테고리에 BT1(버스정류장) 코드 없음 → 키워드 검색 사용
function calcBusScore(busCount: number, expressBusCount: number): number {
  // 광역버스는 장거리 이동성 → 2배 가중치
  const weighted = busCount + expressBusCount * 2;
  if (weighted >= 15) return 15;
  if (weighted >= 10) return 12;
  if (weighted >= 6)  return 9;
  if (weighted >= 3)  return 6;
  if (weighted >= 1)  return 3;
  return 0;
}

// ─── Kakao API 기반 실측 점수 계산 ───────────────────────────
async function calcFromKakao(lat: number, lng: number): Promise<CategoryScore> {
  // 병렬: 지하철역(1km), 버스정류장(500m 실측), 광역버스 M버스(1km)
  // 버스정류장: 카카오 카테고리에 BT1 코드 없음 → 키워드 '버스 정류장' 사용 (500m = 도보 6분)
  const [subwayRes, busRes, expressBusRes] = await Promise.all([
    searchByCategory(KAKAO_CATEGORY.지하철역, lat, lng, 1000, 15),
    searchByKeyword('버스 정류장',           lat, lng,  500, 15),
    searchByKeyword('M버스',                 lat, lng, 1000,  5),
  ]);
  // 업무지구 통근 시간: Haversine 직선거리 추정
  const hubResult = findNearestHub(lat, lng);

  const subways    = subwayRes.places;
  const busCount   = busRes.totalCount;
  const expressBus = expressBusRes.totalCount;

  const nearestDist = subways.length > 0 ? parseInt(subways[0].distance) : 9999;
  const walkScore   = calcSubwayWalkScore(nearestDist);
  const { score: lineScore, hasTransfer, lineCount } = calcLineScore(subways);
  const busScore    = calcBusScore(busCount, expressBus);

  // 직장 접근성 (15pt) — TMAP 실측 대중교통 시간 기반
  const jobScore = hubTimeToTransportScore(hubResult.minutes);

  const score = Math.min(walkScore + lineScore + busScore + jobScore, 100);

  // 세부 근거 생성
  const details: string[] = [];

  if (subways.length === 0) {
    details.push('반경 1km 이내 지하철역 없음');
  } else {
    const nearest    = subways[0];
    const walkMin    = distToWalkMin(nearestDist);
    details.push(
      `최근접 지하철역: ${nearest.place_name} (도보 ${walkMin}분)`,
    );

    if (subways.length >= 2) {
      const names        = subways.slice(0, 4).map(s => s.place_name).join(', ');
      const transferText = hasTransfer ? ' (환승역 포함)' : '';
      details.push(`반경 1km 지하철역 ${lineCount}개${transferText}: ${names}`);
    }
  }

  if (busCount > 0) {
    const expressText = expressBus > 0 ? ` · 광역버스 ${expressBus}개(1km)` : '';
    details.push(`반경 500m 버스정류장 ${busCount}개${expressText}`);
  }

  // 직장 접근성 근거 (Haversine 직선거리 추정)
  details.push(`최근접 업무지구: ${hubResult.name} (대중교통 약 ${hubResult.minutes}분 추정)`);

  return {
    score,
    grade:  getGrade(score),
    label:  '교통 접근성',
    details,
    weight: CATEGORY_WEIGHTS.transport,
  };
}

// ─── District 기반 Fallback ───────────────────────────────────
function calcFromDistrict(district: string): CategoryScore {
  const scores  = getDistrictScore(district);
  const details = getDistrictDetails(district);
  return {
    score:   scores.transport,
    grade:   getGrade(scores.transport),
    label:   '교통 접근성',
    details: details.transport,
    weight:  CATEGORY_WEIGHTS.transport,
  };
}

// ─── 메인 진입점 ──────────────────────────────────────────────
/**
 * 교통 접근성 점수 계산
 * Kakao API 성공 시 실측 데이터, 실패 시 district 데이터 사용
 */
export async function calcTransportScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  try {
    return await calcFromKakao(lat, lng);
  } catch (err) {
    console.warn('[transport] Kakao API 실패 → district 데이터 사용:', (err as Error).message);
    return calcFromDistrict(district);
  }
}
