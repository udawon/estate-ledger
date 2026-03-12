// ─── 일자리·수요 점수 계산 엔진 (B 카테고리) ─────────────────
// 업무지구 접근성(TMAP 실측 → Haversine fallback) + 대학·종합병원(Kakao) + district 소득등급·임대수요
// Kakao Local API 기반 실측 → Fallback: district 데이터

import type { CategoryScore, Grade } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';
import { searchByCategory, KAKAO_CATEGORY } from '@/lib/api/kakao';
import { findNearestHub, hubTimeToJobScore } from '@/lib/engine/hub-score';
import { isKosisConfigured, fetchIncomeGrade } from '@/lib/api/kosis';
import { getDistrictScore, getDistrictDetails } from './district-data';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── district 기반 소득·임대수요 상수 ─────────────────────────

// 소득등급 (15pt): 자치구별 평균 소득 추정
const INCOME_GRADE: Record<string, number> = {
  // HIGH (15pt)
  강남구: 15, 서초구: 15, 용산구: 15, 성동구: 15,
  // MID-H (12pt)
  마포구: 12, 송파구: 12, 광진구: 12, 종로구: 12, 중구: 12,
  // MID (9pt)
  동작구: 9, 영등포구: 9, 양천구: 9, 강동구: 9, 서대문구: 9,
  // MID-L (6pt)
  노원구: 6, 은평구: 6, 강북구: 6, 도봉구: 6, 관악구: 6,
  // LOW (3pt)
  중랑구: 3, 금천구: 3, 구로구: 3, 강서구: 3, 성북구: 3, 동대문구: 3,
};

// 임대수요 (10pt): 업무·상업 임대 수요 proxy
const RENTAL_DEMAND: Record<string, number> = {
  // HIGH (10pt)
  강남구: 10, 서초구: 10, 영등포구: 10, 마포구: 10, 종로구: 10,
  // MID (7pt)
  용산구: 7, 성동구: 7, 송파구: 7, 광진구: 7, 중구: 7, 강동구: 7,
};

function getIncomeGrade(district: string): number {
  return INCOME_GRADE[district] ?? 4;
}

function getRentalDemand(district: string): number {
  return RENTAL_DEMAND[district] ?? 4;
}

// ─── 대학·종합병원 접근성 (35pt) ─────────────────────────────
const BIG_HOSPITAL_KEYWORDS = ['대학병원', '종합병원', '의료원', '병원 > 종합병원'];

function calcUnivHospitalScore(
  hospitals: Array<{ place_name: string; category_name: string; distance: string }>,
): { score: number; list: string[] } {
  const bigHosp = hospitals.filter(p =>
    BIG_HOSPITAL_KEYWORDS.some(kw =>
      p.place_name.includes(kw) || p.category_name.includes(kw),
    ),
  );

  let score = 0;
  if (bigHosp.length >= 2)      score = 35;
  else if (bigHosp.length >= 1) score = 22;

  const list = bigHosp
    .slice(0, 3)
    .map(h => `${h.place_name} (${Math.round(parseInt(h.distance) / 100) / 10}km)`);

  return { score, list };
}

// ─── Kakao API 기반 실측 점수 계산 ───────────────────────────
async function calcFromKakao(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  // 대학·종합병원(Kakao) + KOSIS 소득 병렬 조회
  // 반경 5km: 도심 병원은 3km 밖에 있어도 접근 가능 (서울성모·세브란스 등)
  // 업무지구 통근 시간: Haversine 직선거리 추정 (동기)
  const hubResult = findNearestHub(lat, lng);
  const [bigHospRes, incomeData] = await Promise.all([
    searchByCategory(KAKAO_CATEGORY.병원, lat, lng, 5000, 15),
    isKosisConfigured() ? fetchIncomeGrade(district) : Promise.resolve(null),
  ]);

  const hubScore    = hubTimeToJobScore(hubResult.minutes);
  const { score: hospScore, list: hospList } = calcUnivHospitalScore(bigHospRes.places);
  // KOSIS 실측 우선, 실패(score=-1) 또는 미설정 시 district fallback
  const incomeScore =
    incomeData !== null && incomeData.score >= 0
      ? incomeData.score
      : getIncomeGrade(district);
  const isActualIncome = incomeData !== null && incomeData.score >= 0;
  const rentalScore = getRentalDemand(district);

  const score = Math.min(hubScore + hospScore + incomeScore + rentalScore, 100);

  // 세부 근거 생성
  const details: string[] = [];
  details.push(`최근접 업무지구: ${hubResult.name} (대중교통 약 ${hubResult.minutes}분 추정)`);

  if (hospList.length > 0) {
    details.push(`반경 3km 대학·종합병원: ${hospList.join(', ')}`);
  } else {
    details.push('반경 3km 이내 대학·종합병원 없음');
  }

  const incomeLabel =
    incomeScore >= 15 ? '최상위' :
    incomeScore >= 12 ? '상위' :
    incomeScore >= 9  ? '중상위' :
    incomeScore >= 6  ? '중하위' : '하위';
  const incomeSrc = isActualIncome && incomeData !== null
    ? `KOSIS GRDP ${incomeData.grdpRank}`
    : 'district 추정';
  details.push(`자치구 평균 소득 수준: ${incomeLabel} (${incomeSrc})`);
  details.push(`임대·업무 수요: ${rentalScore >= 10 ? '높음' : rentalScore >= 7 ? '중간' : '보통'}`);

  return {
    score,
    grade:  getGrade(score),
    label:  '일자리·수요',
    details,
    weight: CATEGORY_WEIGHTS.jobDemand,
  };
}

// ─── District 기반 Fallback ───────────────────────────────────
function calcFromDistrict(district: string): CategoryScore {
  const scores  = getDistrictScore(district);
  const details = getDistrictDetails(district);
  return {
    score:   scores.jobDemand,
    grade:   getGrade(scores.jobDemand),
    label:   '일자리·수요',
    details: details.jobDemand,
    weight:  CATEGORY_WEIGHTS.jobDemand,
  };
}

// ─── 메인 진입점 ──────────────────────────────────────────────
/**
 * 일자리·수요 점수 계산 (B 카테고리)
 * 업무지구 접근성 + 대학·종합병원 + district 소득·임대수요
 */
export async function calcJobDemandScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore> {
  try {
    return await calcFromKakao(lat, lng, district);
  } catch (err) {
    console.warn('[job-demand] Kakao API 실패 → district 데이터 사용:', (err as Error).message);
    return calcFromDistrict(district);
  }
}
