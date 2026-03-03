# Design: 입지분석 엔진 고도화 v3

> Feature: engine-upgrade-v3
> Phase: Design
> Created: 2026-03-02
> Plan Reference: docs/01-plan/features/engine-upgrade-v3.plan.md

---

## 1. 파일 변경 목록

| 파일 | 변경 유형 | 작업자 |
|------|---------|--------|
| `types/index.ts` | 수정 — `penaltyScore`, `penaltyReasons` 필드 추가 | Lead |
| `lib/engine/penalty.ts` | **신규 생성** — 패널티 엔진 | engine-dev |
| `lib/engine/transport.ts` | 수정 — 직장 접근성 서브스코어 추가 | engine-dev |
| `lib/engine/environment.ts` | 수정 — 대학/종합병원 추가, 배점 재조정 | engine-dev |
| `lib/engine/scoring.ts` | 수정 — 요약 고도화, clamp 적용 | engine-dev |
| `lib/engine/index.ts` | 수정 — penalty 병렬 호출, final_score 계산 | engine-dev |

---

## 2. types/index.ts 변경 명세

### 2-1. AnalysisResult에 필드 추가
```typescript
export interface AnalysisResult {
  // ... 기존 필드 유지 ...
  totalScore: number;     // raw 합산 점수 (penalty 적용 전)
  penaltyScore: number;   // 패널티 점수 (0 이하, 최소 -30) ← 신규
  penaltyReasons: string[]; // 패널티 이유 목록 ← 신규
  finalScore: number;     // clamp(totalScore + penaltyScore, 0, 100) ← 신규
  grade: Grade;           // finalScore 기준 등급
}
```

> **주의**: `grade`는 기존 `totalScore` 기준에서 `finalScore` 기준으로 변경됨

---

## 3. penalty.ts — 패널티 엔진 (신규)

### 3-1. 인터페이스
```typescript
export interface PenaltyResult {
  penaltyScore: number;   // 0 이하 (최소 -30)
  reasons: string[];      // 패널티 이유 목록 (UI 표시용)
}
```

### 3-2. 소음 위험 감지 (-10pt)
- **API**: `searchByKeyword('나들목', lat, lng, 500, 5)` + `searchByKeyword('고가도로', lat, lng, 300, 3)`
- **조건**: 반경 500m 이내 IC/나들목, 또는 반경 300m 이내 고가도로 존재
- **패널티**: `-10`
- **reason**: `"반경 {N}m 이내 고속도로 나들목/고가도로 (소음 위험)"`

### 3-3. 혐오시설 근접 감지 (-8pt)
- **API 키워드 목록**: `['소각장', '화장장', '납골당', '폐기물처리']`
- **API 호출**: 각 키워드별 `searchByKeyword(keyword, lat, lng, 1000, 3)` 병렬 호출
- **조건**: 하나라도 검색 결과 1개 이상
- **패널티**: `-8`
- **reason**: `"반경 1km 이내 혐오시설: {시설명}"`

### 3-4. 침수 위험 구역 (-15pt) — district 기반
```typescript
// 한강/하천 저지대 인근 구
const FLOOD_RISK_HIGH: Set<string> = new Set([
  '강동구', '도봉구', '중랑구', // 한강·중랑천 저지대
]);
const FLOOD_RISK_MEDIUM: Set<string> = new Set([
  '강서구', '양천구', '광진구', // 한강변 일부
]);
```
- `FLOOD_RISK_HIGH`: `-15`pt, reason: `"{구} 한강·하천 인근 침수 위험 지역"`
- `FLOOD_RISK_MEDIUM`: `-8`pt, reason: `"{구} 일부 침수 취약 구역 포함"`

### 3-5. 패널티 누적 상한
```typescript
const rawPenalty = noiseP + nuisanceP + floodP;
const penaltyScore = Math.max(rawPenalty, -30); // 최소 -30 상한
```

### 3-6. 함수 시그니처
```typescript
export async function calcPenalty(
  lat: number,
  lng: number,
  district: string,
): Promise<PenaltyResult>
```

---

## 4. transport.ts — 직장 접근성 추가

### 4-1. 업무지구 데이터 (하드코딩 상수)
```typescript
const JOB_CENTERS: Array<{ name: string; lat: number; lng: number }> = [
  { name: '강남',     lat: 37.4979, lng: 127.0276 },
  { name: '여의도',   lat: 37.5219, lng: 126.9245 },
  { name: '광화문',   lat: 37.5759, lng: 126.9769 },
  { name: '마포·홍대', lat: 37.5548, lng: 126.9228 },
  { name: '잠실',     lat: 37.5131, lng: 127.1003 },
  { name: '판교',     lat: 37.3946, lng: 127.1108 },
];
```

### 4-2. Haversine 직선거리 계산
```typescript
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### 4-3. 직장 접근성 점수 (15pt) — Commute Time Bands
```
직선거리 → 추정 통근 시간 (km ÷ 2.4 km/30분 기준)
≤2.4km  → 30분 이내: 15pt
≤3.2km  → 40분 이내: 12pt
≤4.0km  → 50분 이내: 8pt
≤4.8km  → 60분 이내: 4pt
4.8km+  → 60분 초과: 1pt
```

### 4-4. 배점 재조정
| 항목 | v2 배점 | v3 배점 |
|------|---------|---------|
| 지하철 도보 | 50pt | 45pt |
| 노선 다양성 | 30pt | 25pt |
| 버스 접근성 | 20pt | 15pt |
| 직장 접근성 | — | **15pt** (신규) |
| **합계** | 100pt | **100pt** |

> `calcSubwayWalkScore` 반환값 조정: 0-5분→45, 6-10분→36, 11-15분→24, 16-20분→14, 20분+→5
> `calcLineScore` 상한 25pt로 조정
> `calcBusScore` 상한 15pt로 조정

### 4-5. details 문자열 추가
```
"최근접 업무지구: 강남 (직선 1.8km · 추정 통근 22분)"
```

---

## 5. environment.ts — 대학/종합병원 추가

### 5-1. 대형병원 검색 및 필터
```typescript
// 반경 3km, 최대 10개
const bigHospRes = await searchByCategory(KAKAO_CATEGORY.병원, lat, lng, 3000, 10);

// 대학병원/종합병원 필터
const BIG_HOSPITAL_KEYWORDS = ['대학병원', '종합병원', '의료원', '병원 > 종합병원'];
const bigHospitals = bigHospRes.places.filter(p =>
  BIG_HOSPITAL_KEYWORDS.some(kw =>
    p.place_name.includes(kw) || p.category_name.includes(kw)
  )
);
```

### 5-2. 대형병원 점수 (15pt)
```
3km 이내 대학/종합병원 수:
≥2개: 15pt
1개:  10pt
0개:  0pt
```

### 5-3. 배점 재조정
| 항목 | v2 배점 | v3 배점 |
|------|---------|---------|
| 공원 | 30pt | 25pt |
| 학교/초등학교 | 25pt | 20pt |
| 의료(병원+약국) | 25pt | 20pt |
| 대학/종합병원 | — | **15pt** (신규) |
| 학원 | 10pt | 10pt |
| 어린이집 | 10pt | 10pt |
| **합계** | 100pt | **100pt** |

### 5-4. details 문자열 추가
```
"반경 3km 대학·종합병원: 서울대병원 (2.1km), 서울아산병원 (2.8km)"
// 없을 경우:
"반경 3km 이내 대학·종합병원 없음"
```

---

## 6. scoring.ts — 요약 고도화 + clamp

### 6-1. aggregateScore 반환 타입 변경
```typescript
// 기존
export interface AggregateResult {
  totalScore: number;
  grade: Grade;
}

// 변경 후 (penalty는 index.ts에서 적용)
export interface AggregateResult {
  totalScore: number;  // raw 합산 (패널티 미적용)
  grade: Grade;        // finalScore 기준 등급
}
```

### 6-2. generateSummary 시그니처 변경
```typescript
export function generateSummary(
  result: {
    totalScore: number;
    finalScore: number;
    grade: Grade;
    penaltyReasons: string[];
  },
  categories: CategoryScores,
): string
```

### 6-3. 요약 문구 생성 로직
```typescript
// 강점 TOP2 선택
const top2 = entries.sort((a,b)=>b.score-a.score).slice(0,2);

// 취약점: 점수 50 미만 카테고리
const weak = entries.filter(e => e.score < 50);

// 패널티 경고
const penaltyWarn = penaltyReasons.length > 0
  ? ` | 주의: ${penaltyReasons[0]}`
  : '';

// 최종 문구
"${top2[0].key}·${top2[1].key} 우수 입지 (종합 ${finalScore}점)${penaltyWarn}"
// 취약점 있을 경우:
"${top2[0].key} 우수 / ${weak[0].key} 취약 (종합 ${finalScore}점)${penaltyWarn}"
```

---

## 7. index.ts — 통합 변경

### 7-1. penalty 병렬 호출 추가
```typescript
import { calcPenalty } from './penalty';

const [transport, commercial, environment, safety, penaltyResult, tradeResult] =
  await Promise.all([
    calcTransportScore(lat, lng, district),
    calcCommercialScore(lat, lng, district),
    calcEnvironmentScore(lat, lng, district),
    calcSafetyScore(lat, lng, district),
    calcPenalty(lat, lng, district),   // ← 신규
    // ... 실거래가 ...
  ]);
```

### 7-2. final_score 계산
```typescript
const { totalScore, grade: rawGrade } = aggregateScore(categories);
const { penaltyScore, reasons: penaltyReasons } = penaltyResult;
const finalScore = Math.max(0, Math.min(100, totalScore + penaltyScore));
const grade = getGrade(finalScore); // finalScore 기준 재계산
```

### 7-3. AnalysisResult 반환 변경
```typescript
return {
  // ... 기존 필드 ...
  totalScore,         // raw 합산
  penaltyScore,       // 패널티 (0 이하)
  penaltyReasons,     // 패널티 이유
  finalScore,         // 최종 점수 (표시용)
  grade,              // finalScore 기준
  summary: generateSummary({ totalScore, finalScore, grade, penaltyReasons }, categories),
};
```

---

## 8. 점수 흐름 다이어그램

```
transport(0-100) × 0.30
commercial(0-100) × 0.25   →  totalScore(0-100)
environment(0-100) × 0.25                          →  finalScore = clamp(total + penalty, 0, 100)
safety(0-100) × 0.20                               →  grade = getGrade(finalScore)
                             penalty(0 ~ -30)  ↗
```

---

## 9. 구현 순서 (Do Phase 체크리스트)

```
[ ] Step 1: types/index.ts
    - penaltyScore, penaltyReasons, finalScore 필드 추가

[ ] Step 2: lib/engine/penalty.ts (신규)
    - PenaltyResult 인터페이스
    - calcNoisePenalty() — 소음 위험
    - calcNuisancePenalty() — 혐오시설
    - calcFloodPenalty() — 침수 위험 (district 기반)
    - calcPenalty() — 메인 함수

[ ] Step 3: lib/engine/transport.ts
    - JOB_CENTERS 상수 추가
    - haversineKm() 함수 추가
    - calcJobAccessScore() 함수 추가
    - calcSubwayWalkScore() 배점 조정 (50→45 최대)
    - calcLineScore() 상한 25pt로 조정
    - calcBusScore() 상한 15pt로 조정
    - calcFromKakao() 직장 접근성 통합

[ ] Step 4: lib/engine/environment.ts
    - calcBigHospitalScore() 함수 추가
    - calcFromKakao() — bigHospRes 병렬 호출 추가, 배점 재조정

[ ] Step 5: lib/engine/scoring.ts
    - generateSummary() 시그니처 변경 및 로직 개선

[ ] Step 6: lib/engine/index.ts
    - calcPenalty 임포트 및 병렬 호출
    - finalScore 계산 및 AnalysisResult 반환 수정
```

---

## 10. 예상 점수 변화 시나리오

| 주소 유형 | v2 예상 | v3 예상 | 변화 원인 |
|----------|---------|---------|---------|
| 강남 업무지구 인근 | 88점 | 91점 | 직장 접근성 +15pt, 배점 재조정 |
| 한강변 저지대 | 75점 | 60점 | 침수 위험 -15pt |
| 혐오시설 인근 | 70점 | 62점 | 혐오시설 -8pt |
| 고속도로 IC 근처 | 65점 | 55점 | 소음 위험 -10pt |
| 대학병원 인근 일반 주거 | 72점 | 78점 | 대형병원 +15pt |
