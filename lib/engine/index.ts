// ─── 분석 엔진 진입점 (v4 7카테고리) ────────────────────────
// analyze(req) → AnalysisResult 전체 파이프라인

import type { AnalysisRequest, AnalysisResult } from '@/types';
import { calcTransportScore }   from './transport';
import { calcJobDemandScore }   from './job-demand';
import { calcLivingScore }      from './living';
import { calcEducationScore }   from './education';
import { calcEnvRiskScore }     from './env-risk';
import { calcFutureValueScore } from './future-value';
import { calcSupplyScore }      from './supply';
import { calcPenalty }          from './penalty';
import { aggregateScore, generateSummary, getGrade, calculateRelativeScore } from './scoring';
import type { Grade } from '@/types';
import { GRADE_CONFIG } from '@/types';

import { extractDistrict } from './district-data';
import { isKakaoConfigured, geocodeByKakao, getRegionCode, searchByKeyword } from '@/lib/api/kakao';
import { fetchTradeSummary, isMolitConfigured } from '@/lib/api/molit';

/**
 * Nominatim (OpenStreetMap) API로 주소 → 좌표 변환
 * 서버 사이드 전용
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  try {
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&accept-language=ko`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Estate-Ledger/1.0 (contact@Estate-Ledger.local)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Nominatim API 오류: ${res.status}`);

    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (data.length === 0) throw new Error('주소를 찾을 수 없습니다.');

    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.warn('[geocodeAddress] 지오코딩 실패, 서울 시청 기본 좌표 사용:', err);
    return { lat: 37.5665, lng: 126.9780 };
  }
}

/**
 * 부동산 입지분석 메인 함수 (v4 7카테고리)
 *
 * 실행 순서:
 * 1. 주소에서 행정구 추출
 * 2. 좌표 확보 (Kakao → Nominatim fallback)
 * 3. Phase 1: A-E 카테고리 + 패널티 + 실거래가 병렬 분석
 * 4. Phase 2: F(동기) + G(Kakao + 실거래 활용) 계산
 * 5. 가중 평균 집계 + 등급·요약 생성
 */
export async function analyze(req: AnalysisRequest): Promise<AnalysisResult> {
  const { address } = req;

  // 1. 행정구 추출 (텍스트 패턴 우선)
  let district = extractDistrict(address);

  // 2. 좌표 확보 — Kakao 주소검색 API 우선, 실패 시 Nominatim fallback
  let coords: { lat: number; lng: number };
  // Kakao가 해석한 실제 전체 주소 (예: "경기 광명시 시청로 50") — 짧은 입력의 모호성 해소용
  let resolvedAddress = address;

  if (req.lat !== undefined && req.lng !== undefined) {
    coords = { lat: req.lat, lng: req.lng };
  } else if (isKakaoConfigured()) {
    const kakaoResult = await geocodeByKakao(address);
    if (kakaoResult) {
      console.info(`[analyze] Kakao 지오코딩 성공: ${kakaoResult.lat}, ${kakaoResult.lng} → ${kakaoResult.resolvedAddress}`);
      coords = { lat: kakaoResult.lat, lng: kakaoResult.lng };
      resolvedAddress = kakaoResult.resolvedAddress; // 실제 해석된 주소로 교체
    } else {
      console.warn('[analyze] Kakao 지오코딩 실패, Nominatim fallback');
      coords = await geocodeAddress(address);
    }
  } else {
    coords = await geocodeAddress(address);
  }

  const { lat, lng } = coords;

  // 2-1. district 보완 — 텍스트 추출 실패 시 좌표 → 행정구역 API로 보완
  if (!district && isKakaoConfigured()) {
    try {
      const { sigungu } = await getRegionCode(lat, lng);
      district = sigungu;
      console.info(`[analyze] district 좌표 보완: ${sigungu}`);
    } catch {
      // 무시 — 분석은 district="" 로 계속 진행
    }
  }

  // 3. 데이터 소스 로깅
  if (isKakaoConfigured()) {
    console.info(`[analyze] Kakao API 연동됨 — ${address} (${district})`);
  } else {
    console.info(`[analyze] District Fallback 사용 — ${address} (${district})`);
  }

  // ─── Phase 1: A-E 카테고리 + 패널티 + 실거래가 병렬 분석 ────
  const [transport, jobDemand, living, education, envRisk, penaltyResult, tradeResult] = await Promise.all([
    calcTransportScore(lat, lng, district),   // A. 교통 (20%)
    calcJobDemandScore(lat, lng, district),   // B. 일자리·수요 (15%)
    calcLivingScore(lat, lng, district),      // C. 생활인프라 (15%)
    calcEducationScore(lat, lng, district),   // D. 교육 (15%)
    calcEnvRiskScore(lat, lng, district),     // E. 환경위험 (15%)
    calcPenalty(lat, lng, district),          // 패널티 엔진
    // 실거래가: Kakao 법정동코드 + 인근 아파트 단지명 조회 후 국토부 API 호출
    (async () => {
      if (!isMolitConfigured()) return undefined;
      try {
        const { lawdCd, dong } = await getRegionCode(lat, lng);

        // 반경 200m 이내 아파트 건물 검색 ('주거시설 > 아파트' 카테고리만 허용)
        let nearAptName = '';
        try {
          const aptResult = await searchByKeyword('아파트', lat, lng, 200, 5);
          const aptPlace = aptResult.places.find(p => p.category_name.includes('주거시설 > 아파트'));
          nearAptName = aptPlace?.place_name ?? '';
          if (nearAptName) {
            console.info(`[analyze] 인근 아파트(200m): ${nearAptName}`);
          } else {
            console.info('[analyze] 반경 200m 내 아파트 없음 — 실거래가 생략');
            return undefined;
          }
        } catch {
          return undefined;
        }

        return await fetchTradeSummary(lawdCd, dong, district, nearAptName);
      } catch (err) {
        console.warn('[analyze] 실거래가 조회 실패:', (err as Error).message);
        return undefined;
      }
    })(),
  ]);

  // ─── Phase 2: F(동기) + G(실거래 활용) ───────────────────────
  const futureValue = calcFutureValueScore(district);                     // F. 미래가치 (10%)
  const supply      = await calcSupplyScore(lat, lng, district, tradeResult ?? undefined); // G. 상품·공급 (10%)

  const categories = { transport, jobDemand, living, education, envRisk, futureValue, supply };

  // 4. 가중 평균 집계 (raw)
  const { totalScore } = aggregateScore(categories);

  // 5. 패널티 적용 → finalScore 계산
  const penaltyScore   = penaltyResult.penaltyScore;
  const penaltyReasons = penaltyResult.reasons;
  const finalScore     = Math.max(0, Math.min(100, totalScore + penaltyScore));
  const grade          = getGrade(finalScore);

  // 6. 요약 문구 생성 (v4 7카테고리)
  const summary = generateSummary(
    { totalScore, finalScore, grade, penaltyReasons },
    categories,
  );

  // 6-1. 상대 점수 계산 (서울 25개 구 분포 기준 percentile)
  const relativeScore = calculateRelativeScore(finalScore);

  return {
    id: generateId(),
    address: resolvedAddress, // 모호한 입력(예: "시청로 50") → Kakao 해석 전체 주소 표시
    district,
    lat,
    lng,
    totalScore,
    penaltyScore,
    penaltyReasons,
    finalScore,
    grade,
    categories,
    summary,
    relativeScore,
    analyzedAt: new Date().toISOString(),
    tradeSummary: tradeResult ?? undefined,
  };
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `est-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
