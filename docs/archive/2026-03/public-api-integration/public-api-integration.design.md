# Design: 공공 API 연동 — 데이터 신뢰성 향상

> Feature: public-api-integration
> Phase: Design
> Created: 2026-03-02
> Depends on: engine-restructure-v4 ✅ (완료)

---

## 0. 현황 정리 (engine-restructure-v4 완료 후)

### 이미 완료된 항목 (재구현 불필요)

| API | 파일 | 상태 |
|-----|------|:----:|
| 에어코리아 PM2.5 | `lib/api/data-go.ts` + `env-risk.ts` | ✅ 완료 |
| 국토부 건축물대장 | `lib/api/data-go.ts` + `supply.ts` | ✅ 완료 |
| 캐시 레이어 (TTL 기반) | `lib/cache/index.ts` + `file-cache.ts` | ✅ 완료 |
| TMAP 대중교통 경로 | ~~`lib/api/tmap.ts`~~ | ❌ 제외 (Free 10회/일 한도 부족) |

### 잔여 구현 대상 (district fallback → 실측 전환)

| 카테고리 | 항목 | 현재 방식 | 목표 | 우선순위 |
|---------|------|---------|------|:-------:|
| E.envRisk | `flood_risk` (20pt) | district 하드코딩 3단계 | 서울시 침수흔적도 실측 | P1 |
| B.jobDemand | `income_grade` (15pt) | district 추정 5단계 | KOSIS 시군구 소득통계 | P2 |
| D.education | `district_preference` (15pt) | 주관적 학군 추정 | 학교알리미 교원비율 | P3 |
| F.futureValue | `transit_project` (40pt) | district 추정 | 토지이음 도시계획정보 | P3 |

---

## 1. Phase 1: 서울시 침수흔적도 (E.flood_risk 실측)

### 1-1. API 명세

| 항목 | 값 |
|------|-----|
| 서비스명 | 서울시 침수흔적도 정보 |
| 엔드포인트 | `http://openapi.seoul.go.kr:8088/{KEY}/json/DrainpipeFloodArea/1/100/` |
| 인증키 | `SEOUL_OPEN_API_KEY` (이미 `.env.local`에 설정됨) |
| 응답 | 침수구역명, 침수면적(㎡), 침수날짜, 행정동 |
| TTL | 7일 (`CACHE_TTL.FLOOD_RISK`) |

### 1-2. 점수 기준

```
침수 이력 없음 (최근 5년)           → 20pt
5년 내 경미 침수 (1~2회, 소규모)    → 12pt
5년 내 반복 침수 (3회+ 또는 대규모) → 0pt
```

### 1-3. 캐시 키

```
flood:{district}    TTL: 7일
```

### 1-4. 구현 계획

**신규 파일**: `lib/api/seoul-open.ts`

```typescript
// 서울시 열린데이터광장 클라이언트
export function isSeoulOpenConfigured(): boolean
export async function fetchFloodHistory(district: string): Promise<FloodResult>

interface FloodResult {
  score: number;        // 0 | 12 | 20
  historyCount: number; // 침수 이력 건수
  isActual: boolean;    // true=실측, false=district fallback
}
```

**수정 파일**: `lib/engine/env-risk.ts`

```typescript
// getFloodRisk(district) → 기존 district 방식 (fallback용 유지)
// fetchFloodScore(district) → 실측 우선, 실패 시 getFloodRisk() fallback
const floodResult = await fetchFloodScore(district);
const floodScore = floodResult.score;
```

### 1-5. Fallback 동작

```
1. SEOUL_OPEN_API_KEY 미설정 → getFloodRisk(district) (기존 방식)
2. API 응답 오류/타임아웃   → getFloodRisk(district) (기존 방식)
3. 해당 구 데이터 없음      → 20pt (침수 이력 없음으로 간주)
```

---

## 2. Phase 2: KOSIS 지역소득통계 (B.income_grade 실측)

### 2-1. API 명세

| 항목 | 값 |
|------|-----|
| 서비스명 | KOSIS 통계청 Open API |
| 엔드포인트 | `https://kosis.kr/openapi/Param/statisticsParameterData.do` |
| 인증키 | `KOSIS_API_KEY` (이미 `.env.local`에 설정됨) |
| 통계표 | 시군구별 지역내총생산(GRDP) — 통계표 ID: `DT_1C65` |
| 응답 | 시군구 GRDP (1인당, 백만원 단위) |
| TTL | 90일 (`CACHE_TTL.KOSIS_INCOME`) — 연간 업데이트 데이터 |

### 2-2. 점수 기준

```
GRDP 상위 20% (강남·서초·중구 수준)   → 15pt
GRDP 상위 40%                          → 12pt
GRDP 상위 60%                          → 9pt
GRDP 상위 80%                          → 6pt
GRDP 하위 20%                          → 3pt
```

### 2-3. 캐시 키

```
income:{district}    TTL: 90일
```

### 2-4. 구현 계획

**신규 파일**: `lib/api/kosis.ts`

```typescript
export function isKosisConfigured(): boolean
export async function fetchIncomeGrade(district: string): Promise<IncomeResult>

interface IncomeResult {
  score: number;         // 3 | 6 | 9 | 12 | 15
  grdpRank: string;      // '상위 20%' 등 표시용
  isActual: boolean;
}
```

**수정 파일**: `lib/engine/job-demand.ts`

```typescript
// getIncomeGrade(district) → fallback 유지
// fetchKosisIncomeScore(district) → 실측 우선
const incomeResult = await fetchKosisIncomeScore(district);
const incomeScore = incomeResult.score;
```

### 2-5. Fallback 동작

```
1. KOSIS_API_KEY 미설정       → getIncomeGrade(district) (기존 방식)
2. API 오류/타임아웃           → getIncomeGrade(district) (기존 방식)
3. 해당 시군구 데이터 없음     → 9pt (중간값 적용)
```

---

## 3. Phase 3: 학교알리미 (D.district_preference 실측)

### 3-1. API 명세

| 항목 | 값 |
|------|-----|
| 서비스명 | 학교알리미 공시정보 API |
| 엔드포인트 | `https://www.schoolinfo.go.kr/openApi/` (NEIS) |
| 인증키 | `SCHOOL_API_KEY` (미발급 — 별도 신청 필요) |
| 데이터 | 교원 1인당 학생수, 초등학교 기준 |
| TTL | 30일 |

### 3-2. 점수 기준

```
교원 1인당 학생수 14명 이하  → 15pt (우수)
교원 1인당 학생수 15~17명    → 9pt (보통)
교원 1인당 학생수 18명 이상  → 3pt (과밀)
```

> **조건**: `SCHOOL_API_KEY` 발급 후 구현. 미발급 시 기존 district 방식 유지.

---

## 4. Phase 3: 토지이음 도시계획정보 (F.transit_project 보완)

### 4-1. API 명세

| 항목 | 값 |
|------|-----|
| 서비스명 | 토지이음 도시계획정보 |
| 엔드포인트 | `https://www.eum.go.kr/api/` |
| 인증키 | `LAND_API_KEY` (미발급) |
| 데이터 | 용도지역, 지구단위계획구역, 개발행위허가 |
| TTL | 30일 |

> **조건**: Phase 1, 2 완료 후 검토.

---

## 5. 파일 변경 계획

### Phase 1 (즉시 시작 가능 — API 키 이미 있음)

| 파일 | 작업 | 비고 |
|------|------|------|
| `lib/api/seoul-open.ts` | 신규 — 침수흔적도 클라이언트 | |
| `lib/engine/env-risk.ts` | 수정 — `flood_risk` 실측 전환 | async 함수로 변경 |
| `lib/cache/index.ts` | 수정 — `FLOOD_RISK` TTL 상수 추가 | |
| `components/analysis/ApiUsageBanner.tsx` | 수정 — 침수 API 항목 추가 | |

### Phase 2 (Phase 1 완료 후)

| 파일 | 작업 | 비고 |
|------|------|------|
| `lib/api/kosis.ts` | 신규 — KOSIS 소득 클라이언트 | |
| `lib/engine/job-demand.ts` | 수정 — `income_grade` 실측 전환 | async 함수로 변경 |
| `lib/cache/index.ts` | 수정 — `KOSIS_INCOME` TTL 상수 추가 | |
| `components/analysis/ApiUsageBanner.tsx` | 수정 — KOSIS 항목 추가 | |

### Phase 3 (별도 API 키 발급 후)

| 파일 | 작업 | 비고 |
|------|------|------|
| `lib/api/school-info.ts` | 신규 | `SCHOOL_API_KEY` 필요 |
| `lib/api/land-use.ts` | 신규 | `LAND_API_KEY` 필요 |
| `lib/engine/education.ts` | 수정 | |
| `lib/engine/future-value.ts` | 수정 | |

---

## 6. 환경변수 현황

| 변수 | 상태 | 용도 |
|------|:----:|------|
| `KAKAO_REST_API_KEY` | ✅ 설정됨 | 지오코딩, 로컬 API |
| `MOLIT_API_KEY` | ✅ 설정됨 | 국토부 실거래가 |
| `DATA_GO_API_KEY` | ✅ 설정됨 | 건축물대장 + 에어코리아 |
| `SEOUL_OPEN_API_KEY` | ✅ 설정됨 | 침수흔적도 (Phase 1) |
| `KOSIS_API_KEY` | ✅ 설정됨 | 지역소득통계 (Phase 2) |
| `SCHOOL_API_KEY` | ❌ 미발급 | 학교알리미 (Phase 3) |
| `LAND_API_KEY` | ❌ 미발급 | 토지이음 (Phase 3) |
| `TMAP_API_KEY` | ❌ 제외 | Free 10회/일 — 비활성화 유지 |

---

## 7. 구현 순서

```
Step 1. lib/cache/index.ts — FLOOD_RISK, KOSIS_INCOME TTL 상수 추가
Step 2. lib/api/seoul-open.ts — 침수흔적도 클라이언트 신규
Step 3. lib/engine/env-risk.ts — flood_risk 실측 전환 (async 처리)
Step 4. components/analysis/ApiUsageBanner.tsx — 침수 API 배너 추가
Step 5. 침수 검증: "서울특별시 관악구" (침수 취약) vs "서울특별시 중구" (침수 안전) 비교
Step 6. lib/api/kosis.ts — 소득통계 클라이언트 신규
Step 7. lib/engine/job-demand.ts — income_grade 실측 전환 (async 처리)
Step 8. components/analysis/ApiUsageBanner.tsx — KOSIS 배너 추가
Step 9. 소득 검증: "강남구" vs "노원구" KOSIS 실측 비교
```

---

## 8. 기술 고려사항

### 8-1. env-risk.ts async 전환

현재 `calcEnvRiskScore`는 동기 함수. flood_risk 실측 후 `async`로 변경 필요.
- `lib/engine/index.ts`의 `Promise.all` 호출 그대로 유지 (이미 await 처리됨)
- 영향 범위: `env-risk.ts` 내부만 변경

### 8-2. job-demand.ts async 전환

현재 `calcJobDemandScore`는 일부 async (TMAP 때문에 이미 async).
- KOSIS 추가는 기존 async 구조에 자연스럽게 통합 가능.

### 8-3. ApiUsageBanner 확장

현재 3개 항목 (업무지구 접근 시간, 에어코리아, 건축물대장).
Phase 1 완료 후: + 서울시 침수흔적도
Phase 2 완료 후: + KOSIS 소득통계

---

## 9. 성공 기준

- [ ] Phase 1: `flood_risk` 실측 — "관악구" 분석 시 침수 이력 반영
- [ ] Phase 1: API 미설정/오류 시 district fallback 정상 동작
- [ ] Phase 2: `income_grade` 실측 — 강남구 vs 노원구 점수 차이 확인
- [ ] 캐시 히트율: 동일 district 재분석 시 API 미호출 확인
- [ ] TypeScript 오류 없음 (`npx tsc --noEmit`)
- [ ] ApiUsageBanner에 신규 API 현황 표시

---

## 10. OUT OF SCOPE

| 항목 | 이유 |
|------|------|
| TMAP 실측 출퇴근 시간 | Free 10회/일 한도 — 유료 플랜 전환 전까지 보류 |
| 실시간 침수 경보 | 분석 목적과 맞지 않음 (역사적 침수 이력이 더 적합) |
| 전국 침수 데이터 | 서울 외 지역은 별도 API 필요 (현재 서울 집중) |
