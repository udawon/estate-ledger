// ─── KOSIS 통계청 Open API 클라이언트 ─────────────────────────
// 서울 시군구별 지역내총생산(GRDP) — B.income_grade 실측용
// 서버 사이드 전용

import { getCache, CACHE_TTL } from '@/lib/cache';

const API_KEY  = process.env.KOSIS_API_KEY ?? '';
const BASE_URL = 'https://kosis.kr/openapi/Param/statisticsParameterData.do';

// ─── 설정 확인 ────────────────────────────────────────────────
export function isKosisConfigured(): boolean {
  return Boolean(API_KEY);
}

// ─── 소득 결과 타입 ───────────────────────────────────────────
export interface IncomeResult {
  score:    number;   // 3 | 6 | 9 | 12 | 15 | -1(fallback 신호)
  grdpRank: string;   // '상위 20%' 등 표시용
  isActual: boolean;
}

// ─── KOSIS API 응답 행 타입 ───────────────────────────────────
interface KosisRow {
  C1:    string;    // 행정구역 코드 (KOSIS 내부 코드)
  C1_NM: string;   // 행정구역명
  DT:    string;   // 데이터 값 (GRDP, 백만원)
}

// ─── 서울 25개 자치구 → KOSIS 행정구역 코드 매핑 ──────────────
// DT_1C65_03E 테이블 실제 확인 코드 (11010~11250, 10 단위 증가)
const DISTRICT_CODE: Record<string, string> = {
  종로구:   '11010', 중구:     '11020', 용산구:   '11030', 성동구:   '11040',
  광진구:   '11050', 동대문구: '11060', 중랑구:   '11070', 성북구:   '11080',
  강북구:   '11090', 도봉구:   '11100', 노원구:   '11110', 은평구:   '11120',
  서대문구: '11130', 마포구:   '11140', 양천구:   '11150', 강서구:   '11160',
  구로구:   '11170', 금천구:   '11180', 영등포구: '11190', 동작구:   '11200',
  관악구:   '11210', 서초구:   '11220', 강남구:   '11230', 송파구:   '11240',
  강동구:   '11250',
};

// ─── GRDP 순위 → 5단계 점수 변환 ────────────────────────────
function rankToScore(rank: number, total: number): { score: number; label: string } {
  const pct = rank / total;
  if (pct <= 0.20) return { score: 15, label: '상위 20%' };
  if (pct <= 0.40) return { score: 12, label: '상위 40%' };
  if (pct <= 0.60) return { score: 9,  label: '상위 60%' };
  if (pct <= 0.80) return { score: 6,  label: '상위 80%' };
  return             { score: 3,  label: '하위 20%' };
}

// ─── KOSIS 지역소득 조회 (캐시 적용) ─────────────────────────
/**
 * 서울 시군구별 GRDP로 경제 규모 순위 산출
 * @param district - 자치구명 (예: '강남구')
 * @returns IncomeResult — 실패 시 score=-1 (fallback 신호)
 */
export async function fetchIncomeGrade(district: string): Promise<IncomeResult> {
  const cache    = getCache();
  const cacheKey = `income:${district}`;

  const cached = await cache.get<IncomeResult>(cacheKey);
  if (cached !== null) return cached;

  try {
    // 서울 시군구별 GRDP 전체 조회 후 클라이언트 필터링
    // - tblId: DT_1C65_03E (GRDP 시/군/구, KOSIS OPENAPI 확인값)
    // - itmId: Z10 (당해년가격, KOSIS OPENAPI URL생성 확인값)
    // - objL2~objL8: 빈 문자열 필수 (없으면 err:21)
    const params = new URLSearchParams({
      method:     'getList',
      apiKey:     API_KEY,
      orgId:      '101',           // 국가데이터처
      tblId:      'DT_1C65_03E',  // GRDP(시/군/구)
      itmId:      'Z10',           // 당해년가격
      objL1:      'ALL',           // 전체 행정구역
      objL2:      '',              // 시군구 레벨 (빈 문자열 = 전체)
      objL3:      '', objL4: '', objL5: '', objL6: '', objL7: '', objL8: '',
      format:     'json',
      jsonVD:     'Y',
      prdSe:      'Y',             // 연간 통계
      startPrdDe: '2022',
      endPrdDe:   '2022',
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`KOSIS API 오류: ${res.status}`);

    const data = (await res.json()) as KosisRow[] | { errMsg?: string };

    if (!Array.isArray(data)) {
      throw new Error(`KOSIS 응답 오류: ${JSON.stringify(data)}`);
    }
    if (data.length === 0) throw new Error('KOSIS 데이터 없음');

    // 서울 25개 구 코드 집합
    const seoulCodes = new Set(Object.values(DISTRICT_CODE));

    // GRDP 값 파싱 → 서울 구 필터 → 내림차순 정렬
    const ranked = data
      .map(row => ({ code: row.C1, name: row.C1_NM, grdp: parseFloat(row.DT) || 0 }))
      .filter(r => r.grdp > 0 && seoulCodes.has(r.code))
      .sort((a, b) => b.grdp - a.grdp);

    if (ranked.length === 0) throw new Error('서울 시군구 GRDP 데이터 없음');

    // 대상 구 순위 탐색 (코드 우선, 이름 보조)
    const targetCode = DISTRICT_CODE[district];
    const idx = ranked.findIndex(r =>
      r.code === targetCode ||
      r.name.replace(/\s/g, '').includes(district.replace('구', '')),
    );

    // 탐색 실패 시 중간값(상위 60%) 적용
    const rank = idx >= 0 ? idx + 1 : Math.ceil(ranked.length * 0.6);
    const { score, label } = rankToScore(rank, ranked.length);

    const result: IncomeResult = { score, grdpRank: label, isActual: true };
    await cache.set(cacheKey, result, CACHE_TTL.INCOME_STAT);
    return result;
  } catch (err) {
    console.warn('[kosis] 소득통계 조회 실패 → district fallback:', (err as Error).message);
    // score=-1: job-demand.ts에서 district 방식으로 fallback
    return { score: -1, grdpRank: '', isActual: false };
  }
}
