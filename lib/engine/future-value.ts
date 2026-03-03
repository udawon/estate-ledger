// ─── 미래가치 점수 계산 엔진 (F 카테고리) ────────────────────
// GTX·지하철 연장 계획 + 재개발·재정비 + 공급 압력 역방향
// 전체 district 기반 동기 함수 — Kakao API 미사용

import type { CategoryScore, Grade } from '@/types';
import { GRADE_CONFIG, CATEGORY_WEIGHTS } from '@/types';

function getGrade(score: number): Grade {
  const grades: Grade[] = ['A', 'B', 'C', 'D', 'F'];
  for (const grade of grades) {
    if (score >= GRADE_CONFIG[grade].min) return grade;
  }
  return 'F';
}

// ─── 교통 인프라 계획 (40pt): GTX·지하철 연장 ────────────────
// 2026년 기준 계획 노선
const TRANSIT_PROJECT: Record<string, { score: number; label: string }> = {
  // HIGH (40pt)
  강남구: { score: 40, label: 'GTX-A·C 수혜 예정 구간' },
  서초구: { score: 40, label: 'GTX-C 수혜 예정 구간' },
  은평구: { score: 40, label: 'GTX-A 수혜 예정 구간' },
  // MID-H (30pt)
  동작구:   { score: 30, label: '신림선·서부선 수혜' },
  성동구:   { score: 30, label: '강변북로선 계획 포함' },
  강동구:   { score: 30, label: '5호선 연장·하남선 인접' },
  // MID (25pt)
  종로구:   { score: 25, label: '기존 노선 풍부 + 경전철 계획' },
  용산구:   { score: 25, label: '경부선·경의중앙선 연장 기대' },
  마포구:   { score: 25, label: '서부선 계획 포함' },
  영등포구: { score: 25, label: '신안산선 수혜' },
  강서구:   { score: 25, label: '서해선·경전철 계획' },
  // ─── 서울 누락 구 추가 ───────────────────────────────────────
  송파구:   { score: 30, label: '2·5·8·9호선 집중 + 위례선 트램 계획 수혜' },
  노원구:   { score: 25, label: '4·6·7호선 환승 + GTX-C 노원역 예정' },
  도봉구:   { score: 15, label: '1·7호선 + GTX-C 도봉산역 연장 가능성' },
  성북구:   { score: 20, label: '4·6호선 + 동북선 경전철 2027년 예정' },
  서대문구: { score: 20, label: '2·3·5호선 + 서부선 일부 수혜' },
  양천구:   { score: 22, label: '5·9호선 + 목동선 경전철 추진 중' },
  구로구:   { score: 18, label: '1·2·7호선 + 신안산선 연장 간접 수혜' },
  금천구:   { score: 15, label: '1·7호선 + 신안산선 금천구청역 수혜' },
  관악구:   { score: 15, label: '2호선·신림선 개통 수혜' },
  광진구:   { score: 18, label: '2·5·7호선 + 동북선 연장 기대' },
  동대문구: { score: 22, label: '1·2·5호선 + 동북선 경전철 2027년 예정' },
  중랑구:   { score: 15, label: '7호선 + 동북선 경전철 간접 수혜' },
  중구:     { score: 20, label: '1·2·3·4·5호선·공항철도 집중 + CBD 접근성 최고' },
  // ─── 경기도·인천 주요 시·구 추가 ──────────────────────────────
  광명시:   { score: 30, label: 'KTX 광명역 인접·GTX-B 광명역 2028년 개통 예정' },
  과천시:   { score: 30, label: '4호선 수혜 + GTX-C 과천청사역 2028년 예정' },
  분당구:   { score: 35, label: '신분당선·분당선 수혜 + GTX-A 야탑·서현역 예정' },
  수정구:   { score: 20, label: '8호선 수혜 + 위례 트램 계획' },
  중원구:   { score: 18, label: '8호선 + GTX-A 모란역 간접 수혜' },
  하남시:   { score: 30, label: '5호선 연장 미사·하남 개통 완료 + 9호선 연장 계획' },
  구리시:   { score: 25, label: '8호선 구리역 연장 예정 + 별내선 수혜' },
  남양주시: { score: 25, label: 'GTX-B 마석역·별내선·4호선 진접선 개통' },
  덕양구:   { score: 30, label: 'GTX-A 창릉역·킨텍스역 수혜 + 3호선' },
  일산동구: { score: 28, label: 'GTX-A 킨텍스역 수혜 + 3호선' },
  일산서구: { score: 25, label: '3호선·GTX-A 킨텍스역 인접' },
  부천시:   { score: 25, label: 'GTX-B 부천종합운동장역 예정 + 7호선' },
  동안구:   { score: 30, label: 'GTX-C 인덕원역 직접 수혜 + 4호선' },
  만안구:   { score: 22, label: '1·4호선 안양역 + GTX-C 간접 수혜' },
  팔달구:   { score: 25, label: 'GTX-C 수원역 예정 + 1호선 수원역' },
  영통구:   { score: 22, label: '분당선 수혜 + GTX-C 수원 간접 수혜' },
  장안구:   { score: 18, label: '1호선 + GTX-C 수원역 접근 가능' },
  권선구:   { score: 15, label: '1호선 + 신분당선 수원 연장 기대' },
  의왕시:   { score: 20, label: 'GTX-C 의왕역 예정 + 1호선 의왕·성결대역' },
  군포시:   { score: 15, label: '1호선 군포역·4호선 금정역 이용 가능' },
  의정부시: { score: 25, label: '1호선·경전철 + GTX-C 의정부역 2028년 예정' },
  연수구:   { score: 25, label: 'GTX-B 인천대입구·송도역 예정 + 인천1호선' },
  남동구:   { score: 20, label: '인천1·2호선 + GTX-B 간접 수혜' },
  부평구:   { score: 22, label: '1·7호선·공항철도 + GTX-B 예정' },
  계양구:   { score: 20, label: '인천1호선 + GTX-B 계양역 예정' },
  // LOW (10pt) — 기타
};

function getTransitProject(district: string): { score: number; label: string } {
  return TRANSIT_PROJECT[district] ?? { score: 10, label: '교통 인프라 신규 계획 없음' };
}

// ─── 재개발·재정비 계획 (35pt) ───────────────────────────────
const REDEVELOPMENT: Record<string, { score: number; label: string }> = {
  // HIGH (35pt)
  성동구:   { score: 35, label: '성수 전략정비구역·준공업지역 재개발' },
  영등포구: { score: 35, label: '여의도·영등포 재정비촉진지구' },
  동작구:   { score: 35, label: '노량진 재정비촉진지구' },
  강북구:   { score: 35, label: '미아 재정비촉진지구' },
  // MID (20pt)
  용산구:   { score: 20, label: '한남·이촌 재개발 진행 중' },
  마포구:   { score: 20, label: '아현·공덕 재개발 진행' },
  광진구:   { score: 20, label: '구의·자양 재개발 예정' },
  은평구:   { score: 20, label: '응암·불광 재개발 예정' },
  강동구:   { score: 20, label: '천호·길동 재개발 예정' },
  성북구:   { score: 20, label: '장위 재정비촉진지구' },
  // ─── 서울 누락 구 추가 ───────────────────────────────────────
  송파구:   { score: 18, label: '가락·오금 재개발 진행·위례 성장 지속' },
  노원구:   { score: 15, label: '상계·중계 재건축 추진 초기 단계' },
  도봉구:   { score: 10, label: '창동 복합개발·스포츠·문화 시설 진행 중' },
  서대문구: { score: 15, label: '북아현·홍제 재개발 진행' },
  양천구:   { score: 20, label: '목동 14개 단지 재건축 추진 중' },
  구로구:   { score: 12, label: '구로디지털단지 산업단지 재편 중' },
  금천구:   { score: 8,  label: '가산 산업단지 재편 단계' },
  관악구:   { score: 12, label: '신림·봉천 재개발 잠재력' },
  동대문구: { score: 15, label: '이문·휘경 뉴타운 진행 중' },
  중랑구:   { score: 12, label: '면목·신내 재개발 잠재력' },
  중구:     { score: 10, label: '재개발 제한 (상업 중심지 특성)' },
  // ─── 경기도·인천 주요 시·구 추가 ──────────────────────────────
  광명시:   { score: 20, label: '철산·하안동 노후 아파트 재건축 활발 진행' },
  과천시:   { score: 22, label: '과천지식정보타운 완료·원도심 재건축 예정' },
  분당구:   { score: 15, label: '분당 구도심 리모델링·일부 재건축 진행' },
  수정구:   { score: 20, label: '신흥·중앙동 재개발 진행' },
  중원구:   { score: 18, label: '성남 원도심 재개발 사업' },
  하남시:   { score: 10, label: '감일·미사 신도시 완료 단계' },
  구리시:   { score: 15, label: '교문·수택 재개발 진행' },
  남양주시: { score: 8,  label: '다산·별내 신도시 완료 단계' },
  덕양구:   { score: 15, label: '원흥·향동 신도시 + 원도심 재개발' },
  일산동구: { score: 15, label: '일산 구도심 리모델링 추진 중' },
  일산서구: { score: 12, label: '일산 신도시 리모델링 일부' },
  부천시:   { score: 15, label: '원미·소사 재개발 진행' },
  동안구:   { score: 15, label: '평촌·호계 재건축·리모델링 진행' },
  만안구:   { score: 12, label: '만안 원도심 재개발 소규모' },
  팔달구:   { score: 15, label: '수원 원도심 재개발 진행' },
  영통구:   { score: 10, label: '영통 신도심·리모델링 일부' },
  장안구:   { score: 12, label: '수원 북부 재개발 잠재력' },
  권선구:   { score: 8,  label: '화서·서둔 소규모 재개발' },
  의왕시:   { score: 8,  label: '재개발 미확인' },
  군포시:   { score: 8,  label: '재개발 미확인' },
  의정부시: { score: 15, label: '의정부역 역세권 재개발 진행' },
  연수구:   { score: 8,  label: '송도 국제도시 신규 공급 위주' },
  남동구:   { score: 12, label: '구도심 재개발 진행' },
  부평구:   { score: 15, label: '부평 원도심 재개발 진행' },
  계양구:   { score: 10, label: '계양 신도시 개발 중' },
  // LOW (5pt) — 기타
};

function getRedevelopment(district: string): { score: number; label: string } {
  return REDEVELOPMENT[district] ?? { score: 5, label: '재개발·재정비 계획 미확인' };
}

// ─── 공급 압력 (25pt): 낮을수록 고점 ────────────────────────
const SUPPLY_PRESSURE: Record<string, { score: number; label: string }> = {
  // LOW_SUPPLY (25pt): 공급 희소 지역
  강남구: { score: 25, label: '재건축 위주 — 공급 희소' },
  서초구: { score: 25, label: '재건축 위주 — 공급 희소' },
  용산구: { score: 25, label: '개발 제한 — 공급 희소' },
  // MID_SUPPLY (15pt): 적정 공급
  마포구:   { score: 15, label: '공급 균형 지역' },
  성동구:   { score: 15, label: '공급 균형 지역' },
  광진구:   { score: 15, label: '공급 균형 지역' },
  동작구:   { score: 15, label: '공급 균형 지역' },
  영등포구: { score: 15, label: '공급 균형 지역' },
  // HIGH_SUPPLY (5pt): 공급 많음
  강동구: { score: 5, label: '신규 공급 많음 (위례·하남 포함)' },
  강서구: { score: 5, label: '마곡 등 신규 공급 많음' },
  양천구: { score: 5, label: '목동 재건축 대기 + 공급 압박' },
  노원구: { score: 5, label: '대규모 신규 공급 다수' },
  은평구: { score: 5, label: '은평뉴타운 공급 압박' },
  // ─── 서울 누락 구 추가 ───────────────────────────────────────
  송파구:   { score: 8,  label: '위례·문정 신규 공급 다수' },
  도봉구:   { score: 12, label: '공급 수준 보통' },
  성북구:   { score: 12, label: '공급 수준 보통' },
  서대문구: { score: 12, label: '공급 수준 보통' },
  구로구:   { score: 12, label: '공급 수준 보통' },
  금천구:   { score: 15, label: '주거 공급 희소 (업무지구 위주)' },
  관악구:   { score: 12, label: '공급 수준 보통' },
  동대문구: { score: 12, label: '공급 수준 보통' },
  중랑구:   { score: 12, label: '공급 수준 보통' },
  중구:     { score: 20, label: '주거 공급 극히 희소 (상업지구 특성)' },
  // ─── 경기도·인천 주요 시·구 추가 ──────────────────────────────
  광명시:   { score: 5,  label: '광명시흥 3기 신도시 대규모 공급 예정' },
  과천시:   { score: 25, label: '개발 면적 제한 — 공급 극히 희소' },
  분당구:   { score: 15, label: '공급 균형 (신규 공급 제한)' },
  수정구:   { score: 8,  label: '위례신도시 공급 일부 영향' },
  중원구:   { score: 10, label: '공급 수준 보통' },
  하남시:   { score: 5,  label: '대규모 신규 아파트 공급 지속' },
  구리시:   { score: 12, label: '공급 수준 보통' },
  남양주시: { score: 5,  label: '왕숙·다산·별내 신도시 공급 압박' },
  덕양구:   { score: 5,  label: '3기 신도시 창릉 대규모 공급 예정' },
  일산동구: { score: 8,  label: '일산 신도시 공급 + 3기 신도시 영향' },
  일산서구: { score: 8,  label: '일산 신도시 공급 압박' },
  부천시:   { score: 12, label: '공급 수준 보통' },
  동안구:   { score: 12, label: '공급 균형 지역' },
  만안구:   { score: 15, label: '공급 희소 (안양 특성)' },
  팔달구:   { score: 12, label: '공급 수준 보통' },
  영통구:   { score: 10, label: '광교 신도시 공급 일부 영향' },
  장안구:   { score: 12, label: '공급 수준 보통' },
  권선구:   { score: 8,  label: '화서 신도시 공급 영향' },
  의왕시:   { score: 15, label: '공급 희소' },
  군포시:   { score: 12, label: '공급 수준 보통' },
  의정부시: { score: 10, label: '공급 보통' },
  연수구:   { score: 5,  label: '송도 국제도시 대규모 공급 압박' },
  남동구:   { score: 12, label: '공급 수준 보통' },
  부평구:   { score: 12, label: '공급 수준 보통' },
  계양구:   { score: 8,  label: '계양 신도시 공급 영향' },
};

function getSupplyPressure(district: string): { score: number; label: string } {
  return SUPPLY_PRESSURE[district] ?? { score: 12, label: '공급 수준 보통' };
}

// ─── 메인 진입점 (동기 함수) ─────────────────────────────────
/**
 * 미래가치 점수 계산 (F 카테고리)
 * 전체 district 기반 동기 함수 — Kakao API 미사용
 * GTX·지하철 계획 + 재개발·재정비 + 공급 압력(역방향)
 */
export function calcFutureValueScore(district: string): CategoryScore {
  const transit     = getTransitProject(district);
  const rdev        = getRedevelopment(district);
  const supplyPress = getSupplyPressure(district);

  const score = Math.min(transit.score + rdev.score + supplyPress.score, 100);

  const details = [
    `교통 인프라 계획: ${transit.label} (${transit.score}pt)`,
    `재개발·재정비: ${rdev.label} (${rdev.score}pt)`,
    `공급 압력: ${supplyPress.label} (${supplyPress.score}pt)`,
  ];

  return {
    score,
    grade:  getGrade(score),
    label:  '미래가치',
    details,
    weight: CATEGORY_WEIGHTS.futureValue,
  };
}
