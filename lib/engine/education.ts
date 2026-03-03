// ─── 교육 점수 계산 엔진 (D 카테고리) ───────────────────────
// 초등학교 + 학원 + 어린이집 + district 학군 선호도
// environment.ts 교육 관련 항목 분리 독립
// Kakao Local API 기반 실측 → Fallback: district 데이터

import type { CategoryScore, Grade } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';
import { searchByCategory, KAKAO_CATEGORY } from '@/lib/api/kakao';
import { getDistrictScore, getDistrictDetails } from './district-data';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── district 기반 학군 선호도 상수 ──────────────────────────
const EDUCATION_PREFERENCE: Record<string, number> = {
  // HIGH (15pt)
  강남구: 15, 서초구: 15, 노원구: 15, 양천구: 15, 송파구: 15,
  // MID (9pt)
  마포구: 9, 용산구: 9, 성동구: 9, 광진구: 9, 중구: 9,
  // LOW (3pt) — 기타
};

function getEducationPreference(district: string): number {
  return EDUCATION_PREFERENCE[district] ?? 3;
}

// ─── 점수 산출 공식 ───────────────────────────────────────────

// 초등학교 (35pt): SC4 1km 이내 초등학교만 카운트
function calcElementaryScore(
  schools: Array<{ place_name: string; distance: string }>,
): { score: number; count: number; nearestName: string } {
  const elementary = schools.filter(s => s.place_name.includes('초등학교'));
  const count = elementary.length;

  let score = 0;
  if (count >= 3)      score = 35;
  else if (count >= 2) score = 28;
  else if (count >= 1) score = 18;

  const nearestName = elementary.length > 0 ? elementary[0].place_name : '';
  return { score, count, nearestName };
}

// 학원 (30pt): AC5 500m 이내
function calcAcademyScore(count: number): number {
  if (count >= 20)     return 30;
  if (count >= 10)     return 22;
  if (count >= 5)      return 14;
  if (count >= 1)      return 6;
  return 0;
}

// 어린이집 (20pt): PS3 500m 이내
function calcDaycareScore(count: number): number {
  if (count >= 5)      return 20;
  if (count >= 3)      return 15;
  if (count >= 1)      return 8;
  return 0;
}

// ─── Kakao API 기반 실측 점수 계산 ───────────────────────────
async function calcFromKakao(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  // 병렬: 학교(1km — SC4), 학원(500m — AC5), 어린이집(500m — PS3)
  const [schoolRes, academyRes, daycareRes] = await Promise.all([
    searchByCategory(KAKAO_CATEGORY.학교,     lat, lng, 1000, 15),
    searchByCategory(KAKAO_CATEGORY.학원,     lat, lng,  500, 15),
    searchByCategory(KAKAO_CATEGORY.어린이집, lat, lng,  500, 10),
  ]);

  const { score: elemScore, count: elemCount, nearestName: elemName } =
    calcElementaryScore(schoolRes.places);
  const academyScore = calcAcademyScore(academyRes.totalCount);
  const daycareScore = calcDaycareScore(daycareRes.places.length);
  const prefScore    = getEducationPreference(district);

  const score = Math.min(elemScore + academyScore + daycareScore + prefScore, 100);

  // 세부 근거 생성
  const details: string[] = [];

  if (elemCount === 0) {
    details.push('반경 1km 이내 초등학교 없음');
  } else {
    details.push(`반경 1km 초등학교 ${elemCount}개 (최근접: ${elemName})`);
  }

  if (academyRes.totalCount > 0) {
    details.push(
      `반경 500m 학원 ${academyRes.totalCount >= 15 ? '15개 이상' : `${academyRes.totalCount}개`}`,
    );
  } else {
    details.push('반경 500m 이내 학원 없음');
  }

  if (daycareRes.places.length > 0) {
    details.push(`반경 500m 어린이집·보육시설 ${daycareRes.places.length}개`);
  }

  const prefLabel =
    prefScore === 15 ? '최상위 학군' :
    prefScore === 9  ? '우수 학군' : '일반 학군';
  details.push(`학군 선호도: ${prefLabel} (${district})`);

  return {
    score,
    grade:  getGrade(score),
    label:  '교육',
    details,
    weight: CATEGORY_WEIGHTS.education,
  };
}

// ─── District 기반 Fallback ───────────────────────────────────
function calcFromDistrict(district: string): CategoryScore {
  const scores  = getDistrictScore(district);
  const details = getDistrictDetails(district);
  return {
    score:   scores.education,
    grade:   getGrade(scores.education),
    label:   '교육',
    details: details.education,
    weight:  CATEGORY_WEIGHTS.education,
  };
}

// ─── 메인 진입점 ──────────────────────────────────────────────
/**
 * 교육 점수 계산 (D 카테고리)
 * 초등학교 + 학원 + 어린이집 + district 학군 선호도
 */
export async function calcEducationScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  try {
    return await calcFromKakao(lat, lng, district);
  } catch (err) {
    console.warn('[education] Kakao API 실패 → district 데이터 사용:', (err as Error).message);
    return calcFromDistrict(district);
  }
}
