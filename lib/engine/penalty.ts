// ─── 패널티 엔진 ─────────────────────────────────────────────
// location_engine_live.md Section 4. Red Flag Penalty Rules 기반
// final_score = clamp(totalScore + penaltyScore, 0, 100)
// 패널티 누적 상한: -30pt

import { searchByKeyword } from '@/lib/api/kakao';

// ─── 반환 타입 ──────────────────────────────────────────────
export interface PenaltyResult {
  penaltyScore: number;   // 0 이하 (최소 -30)
  reasons: string[];      // 패널티 이유 목록 (UI 표시용)
}

// ─── 침수 위험 구역 (district 기반) ─────────────────────────
// 한강·하천 저지대 인근 구 분류
const FLOOD_RISK_HIGH = new Set([
  '강동구', '도봉구', '중랑구', // 한강·중랑천 저지대
]);
const FLOOD_RISK_MEDIUM = new Set([
  '강서구', '양천구', '광진구', // 한강변 일부 침수 취약
]);

// ─── 소음 위험 감지 (최대 -10pt) ─────────────────────────
// 거리 기반 차등 패널티: 가까울수록 심각
// 나들목: 0-200m=-10pt, 201-350m=-5pt, 351-500m=-2pt
// 고가도로: 0-150m=-10pt, 151-300m=-5pt
async function calcNoisePenalty(
  lat: number,
  lng: number,
): Promise<{ penalty: number; reason: string | null }> {
  const [icRes, flyoverRes] = await Promise.all([
    searchByKeyword('나들목', lat, lng, 500, 5),
    searchByKeyword('고가도로', lat, lng, 300, 3),
  ]);

  // 나들목 거리 기반 차등 패널티
  if (icRes.places.length > 0) {
    const nearest = icRes.places[0];
    const dist = parseInt(nearest.distance);
    if (dist <= 200) {
      return { penalty: -10, reason: `반경 200m 이내 고속도로 나들목: ${nearest.place_name} (소음 심각)` };
    }
    if (dist <= 350) {
      return { penalty: -5,  reason: `반경 350m 이내 고속도로 나들목: ${nearest.place_name} (소음 주의)` };
    }
    // 350-500m: 경미한 패널티
    return { penalty: -2, reason: `반경 500m 고속도로 나들목: ${nearest.place_name} (소음 경미)` };
  }

  // 고가도로 거리 기반 차등 패널티
  if (flyoverRes.places.length > 0) {
    const nearest = flyoverRes.places[0];
    const dist = parseInt(nearest.distance);
    if (dist <= 150) {
      return { penalty: -10, reason: `반경 150m 이내 고가도로: ${nearest.place_name} (소음 심각)` };
    }
    return { penalty: -5, reason: `반경 300m 이내 고가도로: ${nearest.place_name} (소음 주의)` };
  }

  return { penalty: 0, reason: null };
}

// ─── 혐오시설 근접 감지 (최대 -8pt) ──────────────────────
// 거리 기반 차등 패널티: 500m 이내=-8pt, 500-1km=-4pt
async function calcNuisancePenalty(
  lat: number,
  lng: number,
): Promise<{ penalty: number; reason: string | null }> {
  const KEYWORDS = ['소각장', '화장장', '납골당', '폐기물처리'];

  const results = await Promise.all(
    KEYWORDS.map(kw => searchByKeyword(kw, lat, lng, 1000, 3)),
  );

  // 가장 가까운 혐오시설 탐색
  let nearestName = '';
  let nearestDist = 9999;

  for (const res of results) {
    if (res.places.length > 0) {
      const dist = parseInt(res.places[0].distance);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestName = res.places[0].place_name;
      }
    }
  }

  if (nearestName === '') return { penalty: 0, reason: null };

  // 거리 기반 차등 패널티
  if (nearestDist <= 500) {
    return { penalty: -8, reason: `반경 500m 이내 혐오시설: ${nearestName} (심각)` };
  }
  return { penalty: -4, reason: `반경 1km 이내 혐오시설: ${nearestName} (주의)` };
}

// ─── 침수 위험 패널티 (district 기반) ─────────────────────
function calcFloodPenalty(
  district: string,
): { penalty: number; reason: string | null } {
  if (FLOOD_RISK_HIGH.has(district)) {
    return {
      penalty: -15,
      reason: `${district} 한강·하천 인근 침수 위험 지역`,
    };
  }
  if (FLOOD_RISK_MEDIUM.has(district)) {
    return {
      penalty: -8,
      reason: `${district} 일부 침수 취약 구역 포함`,
    };
  }
  return { penalty: 0, reason: null };
}

// ─── 메인 함수 ────────────────────────────────────────────
/**
 * 입지 위험 패널티 계산
 * - 소음 위험 (Kakao API): -10pt
 * - 혐오시설 근접 (Kakao API): -8pt
 * - 침수 위험 (district 기반): -15pt/-8pt
 * - 누적 상한: -30pt
 */
export async function calcPenalty(
  lat: number,
  lng: number,
  district: string,
): Promise<PenaltyResult> {
  // 소음·혐오시설은 Kakao API 병렬 호출
  const [noiseResult, nuisanceResult] = await Promise.all([
    calcNoisePenalty(lat, lng),
    calcNuisancePenalty(lat, lng),
  ]);

  // 침수 위험은 동기 처리 (district 기반)
  const floodResult = calcFloodPenalty(district);

  const rawPenalty =
    noiseResult.penalty + nuisanceResult.penalty + floodResult.penalty;

  // 패널티 상한 적용 (-30 이상으로 제한)
  const penaltyScore = Math.max(rawPenalty, -30);

  const reasons: string[] = [
    noiseResult.reason,
    nuisanceResult.reason,
    floodResult.reason,
  ].filter((r): r is string => r !== null);

  return { penaltyScore, reasons };
}
