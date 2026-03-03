# Design: 입지분석 엔진 7카테고리 재구조화 v4

> Feature: engine-restructure-v4
> Phase: Design
> Created: 2026-03-02
> Reference: docs/01-plan/features/engine-restructure-v4.plan.md

---

## 1. 타입 설계 (`types/index.ts`)

### 1-1. CATEGORY_WEIGHTS 재정의

```typescript
export const CATEGORY_WEIGHTS = {
  transport:   0.20,  // A. 교통        20%
  jobDemand:   0.15,  // B. 일자리·수요 15%
  living:      0.15,  // C. 생활인프라  15%
  education:   0.15,  // D. 교육        15%
  envRisk:     0.15,  // E. 환경위험    15%
  futureValue: 0.10,  // F. 미래가치    10%
  supply:      0.10,  // G. 상품·공급   10%
} as const;
```

### 1-2. AnalysisResult.categories 확장

```typescript
export interface AnalysisResult {
  // ... 기존 필드 유지 (id, address, district, lat, lng, totalScore, penaltyScore, penaltyReasons, finalScore, grade, summary, analyzedAt, tradeSummary)
  categories: {
    transport:   CategoryScore;  // A
    jobDemand:   CategoryScore;  // B
    living:      CategoryScore;  // C
    education:   CategoryScore;  // D
    envRisk:     CategoryScore;  // E
    futureValue: CategoryScore;  // F
    supply:      CategoryScore;  // G
  };
}
```

### 1-3. DistrictScore / DistrictDetails 확장 (`district-data.ts`)

```typescript
export interface DistrictScore {
  transport:   number;
  jobDemand:   number;
  living:      number;
  education:   number;
  envRisk:     number;
  futureValue: number;
  supply:      number;
}

export interface DistrictDetails {
  transport:   string[];
  jobDemand:   string[];
  living:      string[];
  education:   string[];
  envRisk:     string[];
  futureValue: string[];
  supply:      string[];
}
```

---

## 2. A. Transport — `transport.ts` (수정)

**변경 사항**: `CATEGORY_WEIGHTS.transport` 참조만 변경 (0.30 → 0.20), 로직 그대로 유지

```typescript
// 변경 전
weight: CATEGORY_WEIGHTS.transport,  // 0.30

// 변경 후 (자동 반영 — CATEGORY_WEIGHTS 수정 시)
weight: CATEGORY_WEIGHTS.transport,  // 0.20
```

**배점 구조 유지** (합계 100pt):
- station_walk_time: 45pt
- line_count + 환승 보너스: 25pt
- bus_grade (일반+광역): 15pt
- job_center_commute_min: 15pt

---

## 3. B. Job & Demand — `job-demand.ts` (신규)

### 함수 시그니처

```typescript
export async function calcJobDemandScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore>
```

### 서브스코어 공식 (합계 100pt)

#### employment_hubs (40pt) — Haversine 직선거리 기반
```
업무지구 목록: 강남(37.4979,127.0276), 여의도(37.5219,126.9245),
              광화문(37.5759,126.9769), 마포·홍대(37.5548,126.9228),
              잠실(37.5131,127.1003), 판교(37.3946,127.1108)

최근접 거리 → 점수:
  ≤ 2.4km (≤30분): 40pt
  ≤ 3.2km (≤40분): 32pt
  ≤ 4.0km (≤50분): 22pt
  ≤ 4.8km (≤60분): 10pt
  4.8km+  (60분+):   3pt
```

#### university_hospital (35pt) — Kakao HP8 반경 3km
```
BIG_HOSPITAL_KEYWORDS = ['대학병원', '종합병원', '의료원', '병원 > 종합병원']
  2개 이상: 35pt
  1개:      22pt
  0개:       0pt
```

#### income_grade (15pt) — district 기반
```typescript
const INCOME_GRADE: Record<string, number> = {
  강남구: 15, 서초구: 15, 용산구: 13, 성동구: 12,
  마포구: 12, 송파구: 11, 광진구: 10, 종로구: 10, 중구: 10,
  동작구: 9,  영등포구: 9, 양천구: 8, 강동구: 8, 서대문구: 8,
  노원구: 7,  은평구: 7, 강북구: 6, 도봉구: 6, 관악구: 6,
  중랑구: 5,  금천구: 5, 구로구: 5, 강서구: 5, 성북구: 5,
  동대문구: 7, // 기본값
};
```

#### rental_demand (10pt) — district 기반
```typescript
const RENTAL_DEMAND: Record<string, number> = {
  강남구: 10, 서초구: 10, 마포구: 10, 용산구: 9, 성동구: 9,
  송파구: 8,  영등포구: 8, 광진구: 7, 종로구: 7, 중구: 7,
  // 기타: 4pt 기본값
};
```

### Fallback: calcFromDistrict — district.jobDemand 사용

---

## 4. C. Living Infrastructure — `living.ts` (신규)

### 함수 시그니처

```typescript
export async function calcLivingScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore>
```

### 서브스코어 공식 (합계 100pt)

#### park_walk (25pt) — Kakao '공원' 키워드 1km
```
최근접 거리:
  ≤200m: 17pt, ≤400m: 14pt, ≤700m: 9pt, ≤1000m: 5pt, 초과: 1pt
공원 수:
  5개+: 8pt, 3개+: 5pt, 1개+: 2pt
```

#### hospital_walk (20pt) — Kakao HP8 1km + 약국 500m
```
병원:  5개+: 12pt, 2개+: 8pt, 1개+: 4pt
약국:  3개+:  8pt, 1개+: 4pt
```

#### mart_walk (25pt) — Kakao 대형마트 2km
```
2개+: 25pt, 1개: 16pt, 0개: 0pt
(단일 마트 거리 보정: 500m 이내 +2pt, 1km 이내 +0pt, 2km 이내 -2pt)
```

#### convenience_food (20pt) — Kakao 편의점+음식점+카페 500m
```
편의점(8pt):  10개+: 8pt, 6개+: 6pt, 3개+: 4pt, 1개+: 2pt
음식점(8pt):  45개+: 8pt, 30개+: 6pt, 15개+: 4pt, 5개+: 2pt
카페(4pt):    15개+: 4pt, 8개+: 3pt, 4개+: 2pt, 1개+: 1pt
```

#### bank_culture (10pt) — Kakao 은행 500m + 문화시설 1km
```
은행(6pt):    6개+: 6pt, 3개+: 4pt, 1개+: 2pt
문화시설(4pt): 4개+: 4pt, 2개+: 3pt, 1개+: 2pt
```

---

## 5. D. Education — `education.ts` (신규)

### 함수 시그니처

```typescript
export async function calcEducationScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore>
```

### 서브스코어 공식 (합계 100pt)

#### elementary_walk (35pt) — Kakao SC4 1km
```
초등학교 수:
  3개+: 20pt, 2개+: 14pt, 1개: 8pt
전체 학교 수:
  6개+: 15pt, 4개+: 11pt, 2개+: 6pt, 1개+: 2pt
```

#### academy_access (30pt) — Kakao AC5 500m
```
학원 수(totalCount):
  20개+: 30pt, 10개+: 23pt, 5개+: 15pt, 1개+: 7pt, 0개: 0pt
```

#### daycare_access (20pt) — Kakao PS3 500m
```
어린이집 수:
  5개+: 20pt, 3개+: 14pt, 1개+: 8pt, 0개: 0pt
```

#### district_preference (15pt) — district 기반 학군 선호도
```typescript
const EDUCATION_PREFERENCE: Record<string, number> = {
  강남구: 15, 서초구: 15, 노원구: 13, 양천구: 13, 송파구: 12,
  마포구: 10, 용산구: 10, 성동구: 9,  광진구: 9,  중구: 8,
  // 기타: 5pt 기본값
};
```

---

## 6. E. Environment Risk — `env-risk.ts` (신규)

### 함수 시그니처

```typescript
export async function calcEnvRiskScore(
  lat: number,
  lng: number,
  district: string,
): Promise<CategoryScore>
```

### 서브스코어 공식 (합계 100pt)
> 위험 없을수록 고점 (역방향), police_fire는 예외 (근접할수록 고점)

> **구현 변경 사항 (v4 실제 구현 기준)**: 에어코리아 PM2.5 실측(air_quality 15pt) 항목이 추가되어
> police_fire 25pt→20pt, road_noise 25pt→20pt, nuisance 20pt→15pt로 재배분됨.

#### police_fire (20pt) — Kakao 파출소+소방서
```
파출소·지구대 (12pt):
  최근접 ≤300m: 7pt, ≤500m: 5pt, ≤800m: 3pt, ≤1km: 1pt
  수: 3개+: 5pt, 2개+: 3pt, 1개+: 1pt
소방서 (8pt):
  최근접 ≤500m: 5pt, ≤1km: 4pt, ≤1.5km: 2pt, ≤2km: 1pt
  수 보너스: 2개+: 3pt, 1개+: 1pt
```

#### road_noise (20pt) — Kakao 나들목 역방향
```
반경 500m 나들목: 없음 → 20pt / 있음 → 0pt
```

#### flood_risk (20pt) — district 역방향
```typescript
const FLOOD_RISK_PENALTY: Record<string, number> = {
  // 침수 위험 없음: 20pt
  // 중간 위험: 10pt (강서구, 양천구, 광진구)
  // 높은 위험: 0pt (강동구, 도봉구, 중랑구)
};
// 위험 없는 나머지 구: 20pt 기본값
```

#### nuisance (15pt) — Kakao 혐오시설 역방향
```
반경 1km 소각장·화장장·납골당·폐기물처리:
  없음 → 15pt / 1개 → 6pt (부분 점수) / 2개 이상 → 0pt
```

#### rail_air_noise (10pt) — Kakao 역방향
```
반경 300m KTX역·ITX역·공항: 없음 → 10pt / 있음 → 0pt
키워드: ['KTX역', '공항터미널']
```

#### air_quality (15pt) — 에어코리아 PM2.5 실측 (추가 구현)
```
에어코리아 API 연동, 서울 25개 구 측정소 자동 매핑, TTL 6시간 캐시
PM2.5 농도 → 점수:
  ≤15 μg/m³ (좋음):   15pt
  ≤25 μg/m³ (보통):   10pt
  ≤35 μg/m³ (나쁨):    5pt
  35μg/m³ 초과 (매우나쁨): 0pt
  API 실패 시 기본값: 25 μg/m³ (보통 등급 10pt)
```

---

## 7. F. Future Value — `future-value.ts` (신규)

### 함수 시그니처

```typescript
export function calcFutureValueScore(
  district: string,
): CategoryScore  // 동기 함수 (district 전용)
```

### 서브스코어 공식 (합계 100pt)

#### transit_project (40pt) — district 기반 교통 개발 계획
```typescript
const TRANSIT_PROJECT: Record<string, number> = {
  // GTX-A·C 수혜: 강남구(40), 서초구(38), 은평구(35), 동탄·수서(판교권)
  강남구: 40, 서초구: 38, 은평구: 35, 양천구: 30, 강동구: 28,
  용산구: 32, 성동구: 28, 마포구: 30, 종로구: 25, 중구: 25,
  // 기존 노선 풍부: 20pt 기본값
  // 개발 계획 없음: 12pt
};
```

#### redevelopment (35pt) — district 기반 재개발·재건축 계획
```typescript
const REDEVELOPMENT: Record<string, number> = {
  성동구: 35,  // 성수전략정비구역
  영등포구: 33, // 여의도 재건축
  동작구: 32,  // 노량진 정비사업
  강북구: 30,  // 미아 뉴타운
  용산구: 30,  // 용산 개발 계획
  마포구: 25,  // 공덕·아현 재개발
  // 기타: 10pt 기본값
};
```

#### supply_pressure (25pt) — district 기반 역방향 (공급 적을수록 고점)
```typescript
const SUPPLY_PRESSURE: Record<string, number> = {
  // 공급 희소 (고점): 강남구(25), 서초구(25), 용산구(23)
  강남구: 25, 서초구: 25, 용산구: 23, 마포구: 20, 성동구: 20,
  // 공급 보통: 15pt 기본값
  // 공급 많음 (저점): 강동구(8), 송파구(8), 강서구(6), 양천구(6)
  강동구: 8, 송파구: 8, 강서구: 6, 양천구: 6,
};
```

---

## 8. G. Product & Supply — `supply.ts` (신규)

### 함수 시그니처

```typescript
export async function calcSupplyScore(
  lat: number,
  lng: number,
  district: string,
  tradeSummary?: TradeSummary,
): Promise<CategoryScore>
```

### 서브스코어 공식 (합계 100pt)

> **구현 변경 사항 (v4 실제 구현 기준)**:
> - complex_scale 하위 구간: 3개+→18pt, 1개+→8pt, 0개→0pt (설계 대비 소폭 조정)
> - trade_volume 구간 기준: 20건+/10건+/5건+/1건+ (설계 30건+/15건+ 대비 현실 거래량 반영)
> - new_build_ratio: 건축물대장 API 실측 우선, district 기반 fallback 후순위 적용

#### complex_scale (40pt) — Kakao '아파트' 키워드 반경 1km
```
주거시설 > 아파트 필터 적용
  10개+: 40pt, 6개+: 30pt, 3개+: 18pt, 1개+: 8pt, 0개: 0pt
```

#### trade_volume (35pt) — TradeSummary.totalCount 활용
```
최근 3개월 거래 건수 (tradeSummary가 undefined면 district 기반 추정):
  20건+: 35pt, 10건+: 25pt, 5건+: 15pt, 1건+: 8pt, 0건: 0pt

trend 보너스 (tradeSummary.trend 기반):
  'up':   +5pt (시세 상승세)
  'flat':  0pt (안정)
  'down': -5pt (시세 하락세)
  tradeSummary 없음: 0pt (보너스 미적용)
```

#### new_build_ratio (25pt) — 건축물대장 실측 우선, district fallback
```
DATA_GO_API_KEY 설정 시: 건축물대장 기본개요 API 조회
  → 10년 이내 사용승인 건물 비율 기반 점수 산출 (calcNewBuildScore)
  → TTL 30일 캐시 적용

API 미설정 또는 조회 실패 시 district 기반 fallback:
  HIGH_NEW (25pt): 강동구, 송파구, 강서구
  MID_HIGH (22pt): 양천구
  MID (15pt):      성동구, 마포구, 은평구, 노원구, 동작구, 영등포구
  LOW (8pt):       강남구, 서초구, 용산구, 종로구
  DEFAULT (12pt):  기타 구
```

---

## 9. `scoring.ts` 수정

### CategoryScores 인터페이스 확장

```typescript
export interface CategoryScores {
  transport:   CategoryScore;
  jobDemand:   CategoryScore;
  living:      CategoryScore;
  education:   CategoryScore;
  envRisk:     CategoryScore;
  futureValue: CategoryScore;
  supply:      CategoryScore;
}
```

### aggregateScore 수정

```typescript
export function aggregateScore(scores: CategoryScores): AggregateResult {
  const totalScore = Math.round(
    scores.transport.score   * scores.transport.weight   +
    scores.jobDemand.score   * scores.jobDemand.weight   +
    scores.living.score      * scores.living.weight      +
    scores.education.score   * scores.education.weight   +
    scores.envRisk.score     * scores.envRisk.weight     +
    scores.futureValue.score * scores.futureValue.weight +
    scores.supply.score      * scores.supply.weight,
  );
  return { totalScore, grade: getGrade(totalScore) };
}
```

### generateSummary 수정 — 7개 카테고리 기반 요약

```typescript
// 카테고리 레이블 매핑
const LABEL_MAP: Record<keyof CategoryScores, string> = {
  transport:   '교통',
  jobDemand:   '일자리',
  living:      '생활인프라',
  education:   '교육',
  envRisk:     '환경위험',
  futureValue: '미래가치',
  supply:      '상품공급',
};
```

---

## 10. `index.ts` 수정

### 7개 카테고리 병렬 호출

```typescript
import { calcJobDemandScore }   from './job-demand';
import { calcLivingScore }      from './living';
import { calcEducationScore }   from './education';
import { calcEnvRiskScore }     from './env-risk';
import { calcFutureValueScore } from './future-value';
import { calcSupplyScore }      from './supply';

// calcCommercialScore, calcEnvironmentScore, calcSafetyScore import 제거

const [transport, jobDemand, living, education, envRisk, tradeResult] =
  await Promise.all([
    calcTransportScore(lat, lng, district),
    calcJobDemandScore(lat, lng, district),
    calcLivingScore(lat, lng, district),
    calcEducationScore(lat, lng, district),
    calcEnvRiskScore(lat, lng, district),
    // 실거래가 (기존 유지)
    (async () => { /* 기존 tradeResult 로직 */ })(),
  ]);

// futureValue는 동기 함수
const futureValue = calcFutureValueScore(district);

// supply는 tradeResult 의존
const supply = await calcSupplyScore(lat, lng, district, tradeResult);

const categories = { transport, jobDemand, living, education, envRisk, futureValue, supply };
```

---

## 11. 프론트엔드 수정 (dashboard-dev 영역)

> `app/(analysis)/results/page.tsx` 및 `components/analysis/` 수정
> categories 키 변경에 따른 렌더링 업데이트

```typescript
// 변경 전
const { transport, commercial, environment, safety } = result.categories;

// 변경 후
const { transport, jobDemand, living, education, envRisk, futureValue, supply } = result.categories;
```

카테고리 카드 순서: A → B → C → D → E → F → G (7개 가로/세로 배치)

---

## 12. 구현 순서 (Steps)

| Step | 파일 | 작업 |
|------|------|------|
| 1 | `types/index.ts` | CATEGORY_WEIGHTS 7개 재정의, AnalysisResult.categories 확장 |
| 2 | `lib/engine/district-data.ts` | DistrictScore/Details 7카테고리 확장, 25개 구 데이터 추가 |
| 3 | `lib/engine/job-demand.ts` | B 카테고리 신규 구현 |
| 4 | `lib/engine/living.ts` | C 카테고리 신규 구현 |
| 5 | `lib/engine/education.ts` | D 카테고리 신규 구현 |
| 6 | `lib/engine/env-risk.ts` | E 카테고리 신규 구현 |
| 7 | `lib/engine/future-value.ts` | F 카테고리 신규 구현 (동기) |
| 8 | `lib/engine/supply.ts` | G 카테고리 신규 구현 |
| 9 | `lib/engine/transport.ts` | 가중치 참조 자동 반영 확인 |
| 10 | `lib/engine/scoring.ts` | CategoryScores 7개, generateSummary 업데이트 |
| 11 | `lib/engine/index.ts` | 7개 병렬 호출, 구 파일 import 제거 |
| 12 | `lib/engine/commercial.ts` | 파일 삭제 |
| 13 | `lib/engine/environment.ts` | 파일 삭제 |
| 14 | `lib/engine/safety.ts` | 파일 삭제 |
| 15 | `app/(analysis)/results/page.tsx` | 7카테고리 렌더링 업데이트 |
