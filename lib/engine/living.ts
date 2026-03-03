// ─── 생활인프라 점수 계산 엔진 (C 카테고리) ──────────────────
// 대형마트 + 공원 + 병원·약국 + 편의시설·음식·카페 + 은행·문화시설
// commercial.ts + environment.ts 생활 관련 항목 통합
// Kakao Local API 기반 실측 → Fallback: district 데이터

import type { CategoryScore, Grade } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';
import { searchByCategory, searchByKeyword, KAKAO_CATEGORY, distToWalk } from '@/lib/api/kakao';
import { getDistrictScore, getDistrictDetails } from './district-data';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── 점수 산출 공식 ───────────────────────────────────────────

// 대형마트 (25pt): MT1 2km 이내
function calcMartScore(count: number): number {
  if (count >= 2) return 25;
  if (count >= 1) return 17;
  return 0;
}

// 공원 (25pt): 키워드 '공원' 1km 이내 — 최근접 거리 기준
function calcParkScore(count: number, nearestDistM: number): number {
  if (count === 0) return 0;
  if (nearestDistM <= 200)  return 25;
  if (nearestDistM <= 400)  return 20;
  if (nearestDistM <= 700)  return 14;
  if (nearestDistM <= 1000) return 8;
  return 2;
}

// 병원·의원 + 약국 (20pt)
function calcHospitalScore(hospCount: number, pharmCount: number): number {
  let score = 0;
  // 병원·의원 (12pt)
  if (hospCount >= 5)      score += 12;
  else if (hospCount >= 2) score += 8;
  else if (hospCount >= 1) score += 4;
  // 약국 (8pt)
  if (pharmCount >= 3)     score += 8;
  else if (pharmCount >= 1) score += 4;
  return score;
}

// 편의점 + 음식점 + 카페 (20pt)
function calcConvFoodScore(convCount: number, restTotal: number, cafeCount: number): number {
  let score = 0;
  // 편의점 (7pt)
  if (convCount >= 10)     score += 7;
  else if (convCount >= 5) score += 5;
  else if (convCount >= 3) score += 3;
  else if (convCount >= 1) score += 1;
  // 음식점 (8pt)
  if (restTotal >= 45)      score += 8;
  else if (restTotal >= 30) score += 6;
  else if (restTotal >= 15) score += 4;
  else if (restTotal >= 5)  score += 2;
  // 카페 (5pt)
  if (cafeCount >= 15)     score += 5;
  else if (cafeCount >= 8) score += 4;
  else if (cafeCount >= 4) score += 2;
  else if (cafeCount >= 1) score += 1;
  return score;
}

// 은행 + 문화시설 (10pt)
function calcBankCultureScore(bankCount: number, cultureCount: number): number {
  let score = 0;
  // 은행 (6pt)
  if (bankCount >= 6)      score += 6;
  else if (bankCount >= 3) score += 4;
  else if (bankCount >= 1) score += 2;
  // 문화시설 (4pt)
  if (cultureCount >= 4)      score += 4;
  else if (cultureCount >= 2) score += 3;
  else if (cultureCount >= 1) score += 2;
  return score;
}

// ─── Kakao API 기반 실측 점수 계산 ───────────────────────────
async function calcFromKakao(lat: number, lng: number): Promise<CategoryScore> {
  // 병렬: 대형마트(2km), 공원(1km), 병원(1km), 약국(500m),
  //       편의점(500m), 음식점(500m), 카페(500m), 은행(500m), 문화시설(1km)
  const [
    martRes, parkRes, hospRes, pharmRes,
    convRes, restRes, cafeRes,
    bankRes, cultureRes,
  ] = await Promise.all([
    searchByCategory(KAKAO_CATEGORY.대형마트, lat, lng, 2000,  5),
    searchByKeyword('공원',                   lat, lng, 1000, 15),
    searchByCategory(KAKAO_CATEGORY.병원,     lat, lng, 1000, 15),
    searchByCategory(KAKAO_CATEGORY.약국,     lat, lng,  500, 10),
    searchByCategory(KAKAO_CATEGORY.편의점,   lat, lng,  500, 15),
    searchByCategory(KAKAO_CATEGORY.음식점,   lat, lng,  500, 15),
    searchByCategory(KAKAO_CATEGORY.카페,     lat, lng,  500, 15),
    searchByCategory(KAKAO_CATEGORY.은행,     lat, lng,  500, 10),
    searchByCategory(KAKAO_CATEGORY.문화시설, lat, lng, 1000, 10),
  ]);

  const martCount    = martRes.places.length;
  const parks        = parkRes.places;
  const parkNearest  = parks.length > 0 ? parseInt(parks[0].distance) : 9999;
  const hospCount    = hospRes.places.length;
  const pharmCount   = pharmRes.places.length;
  const convCount    = convRes.totalCount;
  const restTotal    = restRes.totalCount;
  const cafeCount    = cafeRes.totalCount;
  const bankCount    = bankRes.places.length;
  const cultureCount = cultureRes.places.length;

  const martScore    = calcMartScore(martCount);
  const parkScore    = calcParkScore(parks.length, parkNearest);
  const hospScore    = calcHospitalScore(hospCount, pharmCount);
  const convScore    = calcConvFoodScore(convCount, restTotal, cafeCount);
  const bankScore    = calcBankCultureScore(bankCount, cultureCount);

  const score = Math.min(martScore + parkScore + hospScore + convScore + bankScore, 100);

  // 세부 근거 생성
  const details: string[] = [];

  if (martCount > 0) {
    const names = martRes.places.slice(0, 2)
      .map(m => `${m.place_name}(${distToWalk(parseInt(m.distance))})`)
      .join(', ');
    details.push(`반경 2km 대형마트: ${names}`);
  } else {
    details.push('반경 2km 이내 대형마트 없음');
  }

  if (parks.length > 0) {
    details.push(`최근접 공원: ${parks[0].place_name} (${distToWalk(parkNearest)}) · 반경 1km ${parks.length}개`);
  } else {
    details.push('반경 1km 이내 공원 없음');
  }

  details.push(`반경 1km 병원 ${hospCount}개 · 약국 ${pharmCount}개`);
  details.push(
    `반경 500m 편의점 ${convCount}개 · 음식점 ${restTotal >= 45 ? '45개 이상' : `${restTotal}개`} · 카페 ${cafeCount}개`,
  );

  if (bankCount > 0 || cultureCount > 0) {
    details.push(`반경 500m 은행 ${bankCount}개 · 반경 1km 문화시설 ${cultureCount}개`);
  }

  return {
    score,
    grade:  getGrade(score),
    label:  '생활인프라',
    details,
    weight: CATEGORY_WEIGHTS.living,
  };
}

// ─── District 기반 Fallback ───────────────────────────────────
function calcFromDistrict(district: string): CategoryScore {
  const scores  = getDistrictScore(district);
  const details = getDistrictDetails(district);
  return {
    score:   scores.living,
    grade:   getGrade(scores.living),
    label:   '생활인프라',
    details: details.living,
    weight:  CATEGORY_WEIGHTS.living,
  };
}

// ─── 메인 진입점 ──────────────────────────────────────────────
/**
 * 생활인프라 점수 계산 (C 카테고리)
 * 대형마트·공원·병원·편의시설·은행·문화시설
 */
export async function calcLivingScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  try {
    return await calcFromKakao(lat, lng);
  } catch (err) {
    console.warn('[living] Kakao API 실패 → district 데이터 사용:', (err as Error).message);
    return calcFromDistrict(district);
  }
}
