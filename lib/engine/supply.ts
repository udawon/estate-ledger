// ─── 상품·공급 점수 계산 엔진 (G 카테고리) ───────────────────
// 아파트 단지 밀도(Kakao) + 실거래 건수(TradeSummary) + 건축물대장 신축 비율(실측)
// Kakao Local API 기반 실측 → Fallback: district 데이터

import type { CategoryScore, Grade, TradeSummary } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';
import { searchByKeyword } from '@/lib/api/kakao';
import { getRegionCode } from '@/lib/api/kakao';
import { isDataGoConfigured, fetchBuildingList, calcNewBuildScore } from '@/lib/api/data-go';
import { getDistrictScore, getDistrictDetails } from './district-data';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── district 기반 신축 비율 추정 (건축물대장 API 실패 시 Fallback) ──
const NEW_BUILD_RATIO: Record<string, { score: number; label: string }> = {
  // HIGH_NEW (25pt): 신축 비율 높은 지역
  강동구:   { score: 25, label: '신축 아파트 비율 높음' },
  송파구:   { score: 25, label: '신축 아파트 비율 높음' },
  강서구:   { score: 25, label: '마곡 신축 비율 높음' },
  양천구:   { score: 22, label: '목동 재건축 신축 진행 중' },
  // MID_NEW (15pt): 적정 신축 비율
  성동구:   { score: 15, label: '성수·왕십리 신축 증가 중' },
  마포구:   { score: 15, label: '공덕·아현 신축 적정' },
  은평구:   { score: 15, label: '은평뉴타운 신축' },
  노원구:   { score: 15, label: '중계·하계 신축 적정' },
  동작구:   { score: 15, label: '흑석·노량진 신축 증가' },
  영등포구: { score: 15, label: '여의도·신길 신축 적정' },
  // LOW_NEW (8pt): 구축 위주
  강남구: { score: 8, label: '구축 아파트 위주 (재건축 대기)' },
  서초구: { score: 8, label: '구축 아파트 위주 (재건축 대기)' },
  용산구: { score: 8, label: '노후 주거지 재개발 중' },
  종로구: { score: 8, label: '구축 위주 · 신축 희소' },
  // DEFAULT (12pt): 기타
};

function getNewBuildFallback(district: string): { score: number; label: string } {
  return NEW_BUILD_RATIO[district] ?? { score: 12, label: '신축·구축 혼재 지역' };
}

// ─── 점수 산출 공식 ───────────────────────────────────────────

// 아파트 단지 밀도 (40pt): 반경 1km — '주거시설 > 아파트' 필터
function calcComplexScore(count: number): number {
  if (count >= 10)     return 40;
  if (count >= 6)      return 30;
  if (count >= 3)      return 18;
  if (count >= 1)      return 8;
  return 0;
}

// 거래 건수 (35pt): TradeSummary 최근 3개월 총 거래 건수
function calcTradeVolumeScore(totalCount: number): number {
  if (totalCount >= 20)    return 35;
  if (totalCount >= 10)    return 25;
  if (totalCount >= 5)     return 15;
  if (totalCount >= 1)     return 8;
  return 0;
}

// ─── Kakao API 기반 실측 점수 계산 ───────────────────────────
async function calcFromKakao(
  lat: number,
  lng: number,
  district: string,
  tradeSummary: TradeSummary | undefined,
): Promise<CategoryScore> {
  // 반경 1km 아파트 단지 검색 + 건축물대장 조회 병렬 실행
  const aptPromise = searchByKeyword('아파트', lat, lng, 1000, 15);

  // 건축물대장: DATA_GO_API_KEY 설정 시 실측, 미설정 시 district fallback
  const buildingPromise = (async () => {
    if (!isDataGoConfigured()) return null;
    try {
      const { sigunguCd, bjdongCd } = await getRegionCode(lat, lng).then(r => ({
        sigunguCd: r.lawdCd,
        bjdongCd:  r.bjdongCd,
      }));
      return await fetchBuildingList(sigunguCd, bjdongCd);
    } catch {
      return null;
    }
  })();

  const [aptRes, buildings] = await Promise.all([aptPromise, buildingPromise]);

  // 아파트 단지 내 부속 시설 키워드 — 단지 자체가 아닌 행 제거
  const FACILITY_KEYWORDS = [
    '커뮤니티센터', '골프연습장', '헬스장', '피트니스', '관리사무소',
    '어린이집', '경로당', '도서관', '주차장', '상가', '오피스텔',
  ];

  // '주거시설 > 아파트' 카테고리만 필터 + 부속 시설 제외
  const rawApts = aptRes.places.filter(p =>
    p.category_name.includes('주거시설 > 아파트') &&
    !FACILITY_KEYWORDS.some(kw => p.place_name.includes(kw)),
  );

  // 아파트 식별 키워드 — 동 번호 제거 후 이 중 하나가 있으면 그대로 사용
  const APT_KEYWORDS = [
    '아파트', '단지', '래미안', '자이', '힐스테이트', '푸르지오', '더샵',
    '롯데캐슬', '위브', '트레지움', 'e편한세상', '아이파크', '헤리티지',
    '캐슬', '파크뷰', 'SK뷰', 'SK VIEW', '리버', '타워', '팰리스',
  ];

  // 단지명 정규화
  // 1) 끝에 붙은 '101동', '가동', '제1동' 등 제거
  // 2) 아파트 식별어가 없으면 항상 '아파트' 접미사 추가
  //    - '영풍1동' → '영풍' → '영풍아파트'
  //    - '영풍' (동 번호 없는 원본) → '영풍아파트'
  //    - '철산래미안자이아파트 101동' → '철산래미안자이아파트' (변경 없음)
  const normalizeComplex = (name: string): string => {
    const stripped = name
      .replace(/\s*(?:\d+|[가나다라마바사아자차카타파하]|제\d+)동$/, '')
      .trim();

    // 동 번호 유무와 관계없이 아파트 식별 키워드 체크
    const hasAptKeyword = APT_KEYWORDS.some(kw => stripped.includes(kw));
    return hasAptKeyword ? stripped : `${stripped}아파트`;
  };

  const uniqueComplexes = [...new Set(rawApts.map(p => normalizeComplex(p.place_name)))];

  const complexScore = calcComplexScore(uniqueComplexes.length);
  const tradeScore   = calcTradeVolumeScore(tradeSummary?.totalCount ?? 0);

  // 시세 추이 보너스: 상승 +5pt, 하락 -5pt, 안정 0pt
  const trendBonus = tradeSummary?.trend === 'up'
    ? 5
    : tradeSummary?.trend === 'down'
      ? -5
      : 0;

  // 신축 비율: 건축물대장 실측 > district fallback
  const newBuild = buildings !== null && buildings.length > 0
    ? calcNewBuildScore(buildings)
    : getNewBuildFallback(district);

  const score = Math.min(Math.max(complexScore + tradeScore + trendBonus + newBuild.score, 0), 100);

  // 세부 근거 생성
  const details: string[] = [];

  if (uniqueComplexes.length > 0) {
    // 전체 단지명 표시 (최대 6개, 초과 시 외 N개 표기)
    const MAX_DISPLAY = 6;
    const shown  = uniqueComplexes.slice(0, MAX_DISPLAY).join(', ');
    const suffix = uniqueComplexes.length > MAX_DISPLAY
      ? ` 외 ${uniqueComplexes.length - MAX_DISPLAY}개`
      : '';
    details.push(`반경 1km 아파트 단지 ${uniqueComplexes.length}개: ${shown}${suffix}`);
  } else {
    details.push('반경 1km 이내 아파트 단지 없음');
  }

  if (tradeSummary) {
    details.push(`최근 3개월 거래 건수: ${tradeSummary.totalCount}건 (${tradeSummary.monthRange})`);
    if (tradeSummary.avgPricePerPyeong > 0) {
      details.push(`평당 평균가: ${tradeSummary.avgPricePerPyeong.toLocaleString()}만원`);
    }
    // 시세 추이 보너스 문구
    if (tradeSummary.trend === 'up') {
      details.push('시세 추이: 상승 중 (+5pt 보너스)');
    } else if (tradeSummary.trend === 'down') {
      details.push('시세 추이: 하락 중 (-5pt 감점)');
    } else {
      details.push('시세 추이: 안정적');
    }
  } else {
    details.push('실거래가 데이터 없음 — 거래 건수 점수 미반영');
  }

  const buildingSrc = buildings !== null && buildings.length > 0
    ? `건축물대장 실측 (${buildings.length}건)`
    : 'district 추정';
  details.push(`신축 비율: ${newBuild.label} [${buildingSrc}]`);

  return {
    score,
    grade:  getGrade(score),
    label:  '상품·공급',
    details,
    weight: CATEGORY_WEIGHTS.supply,
  };
}

// ─── District 기반 Fallback ───────────────────────────────────
function calcFromDistrict(district: string): CategoryScore {
  const scores  = getDistrictScore(district);
  const details = getDistrictDetails(district);
  return {
    score:   scores.supply,
    grade:   getGrade(scores.supply),
    label:   '상품·공급',
    details: details.supply,
    weight:  CATEGORY_WEIGHTS.supply,
  };
}

// ─── 메인 진입점 ──────────────────────────────────────────────
/**
 * 상품·공급 점수 계산 (G 카테고리)
 * 아파트 단지 밀도 + 실거래 건수 + 건축물대장 신축 비율(실측)
 *
 * @param tradeSummary - index.ts에서 사전 조회한 실거래가 요약 (없으면 undefined)
 */
export async function calcSupplyScore(
  lat: number,
  lng: number,
  district: string,
  tradeSummary?: TradeSummary,
): Promise<CategoryScore> {
  try {
    return await calcFromKakao(lat, lng, district, tradeSummary);
  } catch (err) {
    console.warn('[supply] 엔진 실패 → district 데이터 사용:', (err as Error).message);
    return calcFromDistrict(district);
  }
}
