// ─── 국토교통부 실거래가 API 래퍼 ────────────────────────────
// 아파트 매매 실거래가 조회 (data.go.kr)
// https://www.data.go.kr/data/15057511/openapi.do
// ※ API 응답 필드명: 영문 (2023년 이후 업데이트된 형식)

import type { TradeRecord, TradeSummary } from '@/types';

const API_KEY = process.env.MOLIT_API_KEY ?? '';
const BASE    = 'http://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';

// ─── 내부 타입: 국토부 API 응답 아이템 (영문 필드명) ─────────
interface MolitItem {
  aptNm:      string;  // 아파트명
  excluUseAr: number;  // 전용면적 (㎡, 숫자)
  dealYear:   number;  // 거래년도 (숫자)
  dealMonth:  number;  // 거래월 (숫자)
  dealDay:    number;  // 거래일 (숫자)
  umdNm:      string;  // 법정동명
  dealAmount: string;  // 거래금액 (만원, "378,000" 형식)
  floor:      number;  // 층 (숫자)
  buildYear:  number;  // 건축년도
  cdealType?: string;  // 계약 해제 유형 (비어있으면 정상 거래)
  cdealDay?:  string;  // 계약 해제일
}

interface MolitResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      items: { item: MolitItem | MolitItem[] } | '' | null;
      totalCount: number;
    };
  };
}

// ─── 유틸: 거래금액 문자열 → 숫자 변환 ──────────────────────
function parsePrice(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

// ─── 유틸: 아파트명 정규화 (Kakao ↔ MOLIT 표기 통일) ─────────
// Kakao: "앤" / MOLIT: "&"  →  양쪽 모두 "&"로 통일
// 공백 제거로 "광명 두산위브" ↔ "광명두산위브" 처리
// 외래어 표기 혼용: "쳐" ↔ "처" (예: 시그니처 ↔ 시그니쳐)
function normalizeAptName(name: string): string {
  return name
    .replace(/앤/g, '&')
    .replace(/쳐/g, '처')  // 시그니쳐 → 시그니처 (외래어 표기 통일)
    .replace(/\s+/g, '');
}

// ─── 유틸: Kakao 단지명 정제 ────────────────────────────────
// Kakao searchByKeyword는 동(棟) 번호까지 포함한 이름을 반환하는 경우 있음
// 예: "철산13단지주공아파트 1313동" → "철산13단지주공"
// 처리 순서: ① 동 번호 제거 → ② "아파트" 제거 → ③ 정규화
function stripKakaoAptSuffix(name: string): string {
  return normalizeAptName(
    name
      .replace(/\s*\d+동$/, '')  // " 1313동" 등 동 번호 제거
      .replace(/아파트$/, '')     // "아파트" 접미사 제거
      .trim(),
  );
}

// ─── 유틸: 아파트명 토큰 분해 (한글/숫자 경계) ───────────────
// 예: "주공13" → ["주공", "13"], "롯데캐슬&SK뷰" → ["롯데캐슬", "SK뷰"]
function tokenizeAptName(name: string): string[] {
  return name
    .split(/(?<=[가-힣])(?=[0-9A-Za-z])|(?<=[0-9A-Za-z])(?=[가-힣])/)
    .map(t => t.replace(/[&\s]/g, ''))
    .filter(t => t.length >= 1);
}

// ─── 유틸: 토큰이 대상 문자열에 포함되는지 확인 ──────────────
// 숫자 토큰은 단어 경계 필요 (예: "13"이 "130"에 잘못 매칭되는 문제 방지)
function tokenInTarget(token: string, target: string): boolean {
  if (/^\d+$/.test(token)) {
    // 숫자: 앞뒤로 다른 숫자가 없어야 함
    return new RegExp(`(^|[^0-9])${token}([^0-9]|$)`).test(target);
  }
  return target.includes(token);
}

// ─── 유틸: 최근 N개월 YYYYMM 목록 생성 ──────────────────────
function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    // 국토부 API는 약 1~2달 지연 → 전전달부터 조회
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}${mm}`);
  }
  return months; // [전달, 2달전, 3달전]
}

// ─── 단일 월 데이터 조회 ─────────────────────────────────────
// ─── 단일 페이지 조회 ────────────────────────────────────────
async function fetchPage(
  lawdCd: string,
  yearMonth: string,
  pageNo: number,
  numOfRows: number,
): Promise<{ items: MolitItem[]; totalCount: number }> {
  const url = new URL(BASE);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('LAWD_CD',    lawdCd);
  url.searchParams.set('DEAL_YMD',   yearMonth);
  url.searchParams.set('numOfRows',  String(numOfRows));
  url.searchParams.set('pageNo',     String(pageNo));
  url.searchParams.set('_type',      'json');

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`MOLIT API 오류: ${res.status}`);

  const data: MolitResponse = await res.json();
  const { resultCode, resultMsg } = data.response.header;

  if (!resultCode.startsWith('0') || resultMsg === 'ERROR') {
    throw new Error(`MOLIT API 응답 오류: ${resultMsg} (${resultCode})`);
  }

  const body  = data.response.body;
  const items = body.items;

  if (!items || typeof items === 'string') return { items: [], totalCount: body.totalCount };

  const raw = Array.isArray(items.item) ? items.item : [items.item];
  return {
    items: raw.filter(i => !i.cdealType || i.cdealType.trim() === ''),
    totalCount: body.totalCount,
  };
}

// ─── 단일 월 데이터 전체 조회 (페이지네이션 처리) ────────────
async function fetchMonthlyTrades(
  lawdCd: string,
  yearMonth: string,
): Promise<MolitItem[]> {
  const PAGE_SIZE = 100;

  // 1페이지 조회 + totalCount 확인
  const first = await fetchPage(lawdCd, yearMonth, 1, PAGE_SIZE);
  let all = [...first.items];

  // totalCount가 1페이지를 초과하면 나머지 페이지 병렬 조회
  if (first.totalCount > PAGE_SIZE) {
    const totalPages = Math.ceil(first.totalCount / PAGE_SIZE);
    const pageNums   = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const rest = await Promise.all(
      pageNums.map(p => fetchPage(lawdCd, yearMonth, p, PAGE_SIZE).catch(() => ({ items: [], totalCount: 0 }))),
    );
    for (const r of rest) all = all.concat(r.items);
  }

  return all;
}

// ─── 시세 추세 계산 ──────────────────────────────────────────
function calcTrend(
  newItems: MolitItem[],
  oldItems: MolitItem[],
): 'up' | 'down' | 'flat' {
  const avg = (items: MolitItem[]) => {
    if (items.length === 0) return 0;
    return items.reduce((s, i) => s + parsePrice(i.dealAmount), 0) / items.length;
  };
  const newAvg = avg(newItems);
  const oldAvg = avg(oldItems);
  if (oldAvg === 0) return 'flat';
  const diff = (newAvg - oldAvg) / oldAvg;
  if (diff > 0.03) return 'up';
  if (diff < -0.03) return 'down';
  return 'flat';
}

// ─── 메인: 최근 3개월 실거래가 조회 및 집계 ─────────────────
/**
 * 법정동코드(시군구 5자리)와 법정동명 기반으로
 * 최근 3개월 아파트 매매 실거래가를 조회·집계
 *
 * @param lawdCd   - 시군구 코드 5자리 (예: "11680")
 * @param dong     - 법정동명 (예: "역삼동")
 * @param district - 행정구명 표시용 (예: "강남구")
 * @param nearAptName - 인근 단지명 (Kakao 검색 결과). 있으면 해당 단지만 필터링
 */
export async function fetchTradeSummary(
  lawdCd: string,
  dong: string,
  district: string,
  nearAptName?: string,
): Promise<TradeSummary> {
  // 국토부 API는 1~2달 지연 → 전달~6달전 기준으로 조회
  const months = getRecentMonths(6); // [전달, 2달전, ..., 6달전]

  // 6개월 병렬 조회
  const results = await Promise.all(
    months.map(m => fetchMonthlyTrades(lawdCd, m).catch(() => [] as MolitItem[])),
  );

  const [m1, m2, , , , m6] = results;
  const all = results.flat();

  if (all.length === 0) {
    return {
      district,
      dong,
      avgPricePerPyeong: 0,
      avg84Price: 0,
      recentTrades: [],
      totalCount: 0,
      trend: 'flat',
      monthRange: `${months[5].slice(0, 4)}.${months[5].slice(4)} ~ ${months[0].slice(0, 4)}.${months[0].slice(4)}`,
    };
  }

  // 유효 거래 필터 (면적·가격 모두 있는 건)
  const allValid = all.filter(i => i.excluUseAr > 0 && parsePrice(i.dealAmount) > 0);

  // ── 인근 단지명 필터: Kakao 단지명 → MOLIT aptNm 3단계 매칭 ──
  // 1차: 정규화 부분 문자열 매칭 (앤↔& 포함)
  // 2차: 구분자 분리 후 핵심 단어(4자+) 일부 매칭
  // 3차: MOLIT 이름 토큰(한글/숫자 분리) 전부 포함 여부
  //   예) MOLIT "주공13" 토큰 ["주공","13"] → Kakao "철산13단지주공"에 모두 존재
  // nearAptName 지정 후 전 단계 실패 → 해당 단지 거래 없음 처리
  let valid = allValid;
  let matchedAptName: string | undefined;
  if (nearAptName && nearAptName.trim() !== '') {
    // Kakao 이름에서 동 번호·아파트 접미사 제거 후 정규화
    const kakaoKey = stripKakaoAptSuffix(nearAptName);

    // 1차: 정규화된 전체 이름으로 부분 매칭
    let matched = allValid.filter(i => {
      const mKey = normalizeAptName(i.aptNm);
      return mKey.includes(kakaoKey) || kakaoKey.includes(mKey);
    });

    // 2차: 전체 매칭 실패 시 구분자 분리 핵심 단어(4자+) 중 하나라도 매칭
    if (matched.length === 0) {
      const words = kakaoKey.split(/[·\-&]/).filter(w => w.length >= 4);
      if (words.length > 0) {
        matched = allValid.filter(i => {
          const mKey = normalizeAptName(i.aptNm);
          return words.some(w => mKey.includes(w) || w.includes(mKey));
        });
      }
    }

    // 3차: MOLIT 이름 토큰들이 Kakao 이름에 모두 포함되는지 확인
    // "주공13"(토큰:["주공","13"]) ↔ "철산13단지주공" → 모두 포함 → 매칭
    // 숫자 토큰은 단어 경계 필요 ("13"이 "130"에 잘못 매칭되는 오류 방지)
    if (matched.length === 0) {
      matched = allValid.filter(i => {
        const mTokens = tokenizeAptName(normalizeAptName(i.aptNm));
        // 토큰이 2개 미만이면 오매칭 위험 → 건너뜀
        if (mTokens.length < 2) return false;
        return mTokens.every(t => tokenInTarget(t, kakaoKey));
      });
    }

    if (matched.length > 0) {
      valid = matched;
      // 가장 많이 등장하는 단지명을 대표명으로 사용
      const nameCounts: Record<string, number> = {};
      matched.forEach(i => { nameCounts[i.aptNm] = (nameCounts[i.aptNm] ?? 0) + 1; });
      matchedAptName = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0][0];
    } else {
      // 해당 단지명으로 거래 내역 없음 → 빈 결과 반환 (aptName은 유지)
      return {
        district,
        dong,
        aptName: nearAptName,
        avgPricePerPyeong: 0,
        avg84Price: 0,
        recentTrades: [],
        totalCount: 0,
        trend: 'flat',
        monthRange: `${months[5].slice(0, 4)}.${months[5].slice(4)} ~ ${months[0].slice(0, 4)}.${months[0].slice(4)}`,
      };
    }
  }

  // 3.3㎡당 평균가 계산
  const perPyeong = valid.map(i => parsePrice(i.dealAmount) / (i.excluUseAr / 3.3058));
  const avgPricePerPyeong = Math.round(
    perPyeong.reduce((s, v) => s + v, 0) / perPyeong.length,
  );

  // 84㎡ 기준 환산가 (84 / 3.3058 ≈ 25.4평)
  const avg84Price = Math.round(avgPricePerPyeong * (84 / 3.3058));

  // 최근 거래 5건 (최신순)
  const sorted = [...valid].sort((a, b) => {
    const da = `${a.dealYear}${String(a.dealMonth).padStart(2, '0')}`;
    const db = `${b.dealYear}${String(b.dealMonth).padStart(2, '0')}`;
    return db.localeCompare(da);
  });

  const recentTrades: TradeRecord[] = sorted.slice(0, 10).map(i => ({
    aptName:   i.aptNm.trim(),
    area:      i.excluUseAr,
    floor:     i.floor,
    price:     parsePrice(i.dealAmount),
    yearMonth: `${i.dealYear}.${String(i.dealMonth).padStart(2, '0')}`,
    dong:      i.umdNm.trim(),
  }));

  const trend      = calcTrend(m1, m6);
  const monthRange = `${months[5].slice(0, 4)}.${months[5].slice(4)} ~ ${months[0].slice(0, 4)}.${months[0].slice(4)}`;

  return {
    district,
    dong,
    aptName: matchedAptName,
    avgPricePerPyeong,
    avg84Price,
    recentTrades,
    totalCount: valid.length,
    trend,
    monthRange,
  };
}

// ─── 유틸: API 키 설정 여부 확인 ─────────────────────────────
export function isMolitConfigured(): boolean {
  return Boolean(API_KEY);
}
