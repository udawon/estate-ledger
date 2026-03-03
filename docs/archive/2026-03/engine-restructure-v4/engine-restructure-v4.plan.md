# Plan: 입지분석 엔진 7카테고리 재구조화 v4

> Feature: engine-restructure-v4
> Phase: Plan
> Created: 2026-03-02
> Reference: docs/location_engine_live.md

---

## 1. 목표 (Objective)

현재 4개 카테고리 구조를 `location_engine_live.md` 명세의 7개 카테고리(A-G)로 완전 재편한다.
Kakao Local API로 측정 가능한 항목은 실측 적용, 불가한 항목은 district 기반 추정값으로 대체한다.

---

## 2. 현재 vs 목표 구조

### 현재 (4카테고리)
| 카테고리 | 가중치 | 엔진 파일 |
|---------|--------|---------|
| transport (교통) | 30% | transport.ts |
| commercial (상권) | 25% | commercial.ts |
| environment (생활환경) | 25% | environment.ts |
| safety (안전) | 20% | safety.ts |

### 목표 (7카테고리 — location_engine_live.md 준수)
| ID | 카테고리 | 가중치 | 신규 파일 | 데이터 소스 |
|----|---------|--------|---------|-----------|
| A | transport (교통) | 20% | transport.ts (수정) | Kakao |
| B | jobDemand (일자리·수요) | 15% | job-demand.ts (신규) | Kakao + district |
| C | living (생활인프라) | 15% | living.ts (신규) | Kakao |
| D | education (교육) | 15% | education.ts (신규) | Kakao + district |
| E | envRisk (환경위험) | 15% | env-risk.ts (신규) | Kakao + district |
| F | futureValue (미래가치) | 10% | future-value.ts (신규) | district |
| G | supply (상품·공급) | 10% | supply.ts (신규) | Kakao + district |

---

## 3. 카테고리별 상세 구현 계획

### A. Transport (교통) — 20pt 가중치, 100pt 만점
> **기존 transport.ts 가중치만 변경 (0.30 → 0.20)**

| 서브항목 | 배점 | 측정 방법 |
|---------|------|---------|
| station_walk_time | 45pt | Kakao 지하철역 거리 (기존 유지) |
| line_count | 25pt | Kakao 환승역 감지 (기존 유지) |
| bus_grade | 15pt | Kakao 버스정류장 (기존 유지) |
| job_center_commute_min | 15pt | Haversine 직장접근성 (기존 유지) |

---

### B. Job & Demand (일자리·수요) — 15pt 가중치, 100pt 만점
> **신규 `job-demand.ts`**

| 서브항목 | 배점 | 측정 방법 | 가용성 |
|---------|------|---------|------|
| employment_hubs | 40pt | Haversine (강남/여의도 등 6개 업무지구) | ✅ Kakao 좌표 |
| university_hospital | 35pt | Kakao HP8 반경 3km 대학·종합병원 | ✅ Kakao |
| income_grade | 15pt | district 기반 자치구별 평균 소득 추정 | ✅ district |
| rental_demand | 10pt | 상업시설 밀도 proxy (district + Kakao) | ✅ district |

**district 소득 등급 기준 (서울 25구):**
```
HIGH(15pt):   강남구, 서초구, 용산구, 성동구
MID-H(12pt):  마포구, 송파구, 광진구, 종로구, 중구
MID(9pt):     동작구, 영등포구, 양천구, 강동구, 서대문구
MID-L(6pt):   노원구, 은평구, 강북구, 도봉구, 관악구
LOW(3pt):     중랑구, 금천구, 구로구, 강서구, 성북구
```

---

### C. Living Infrastructure (생활인프라) — 15pt 가중치, 100pt 만점
> **신규 `living.ts` — commercial.ts + environment.ts 공원/병원 흡수**

| 서브항목 | 배점 | 측정 방법 | 출처 |
|---------|------|---------|------|
| mart_walk | 25pt | Kakao 대형마트 2km | commercial.ts 이관 |
| hospital_walk | 20pt | Kakao 병원(1km) + 약국(500m) | environment.ts 이관 |
| park_walk | 25pt | Kakao 공원 1km | environment.ts 이관 |
| convenience_food | 20pt | Kakao 편의점+음식점+카페 500m | commercial.ts 이관 |
| bank_culture | 10pt | Kakao 은행+문화시설 500m~1km | commercial.ts 이관 |

---

### D. Education (교육) — 15pt 가중치, 100pt 만점
> **신규 `education.ts` — environment.ts 학교/학원 분리**

| 서브항목 | 배점 | 측정 방법 | 출처 |
|---------|------|---------|------|
| elementary_walk | 35pt | Kakao SC4 초등학교 1km | environment.ts 이관 |
| academy_access | 30pt | Kakao AC5 학원 500m | environment.ts 이관 |
| daycare_access | 20pt | Kakao PS3 어린이집 500m | environment.ts 이관 |
| district_preference | 15pt | district 기반 학군 선호도 | district-data.ts 확장 |

**district 학군 선호도 기준:**
```
HIGH(15pt):  강남구, 서초구, 노원구, 양천구, 송파구
MID(9pt):    마포구, 용산구, 성동구, 광진구, 중구
LOW(3pt):    기타
```

---

### E. Environment Risk (환경위험) — 15pt 가중치, 100pt 만점
> **신규 `env-risk.ts` — safety.ts 파출소/소방서 + 위험 역방향 점수**
> 위험 요소가 없을수록 고점 (역방향 점수 체계)

| 서브항목 | 배점 | 측정 방법 | 위험 없을 때 |
|---------|------|---------|-----------|
| police_fire | 25pt | Kakao 파출소+소방서 (safety.ts 이관) | 근접 = 고점 |
| road_noise | 25pt | Kakao 나들목/고가도로 500m 없으면 | ✅ 없으면 25pt |
| flood_risk | 20pt | district 침수 위험 없으면 | ✅ 없으면 20pt |
| nuisance | 20pt | Kakao 혐오시설 1km 없으면 | ✅ 없으면 20pt |
| rail_air_noise | 10pt | Kakao 기차역(KTX)/공항 300m 없으면 | ✅ 없으면 10pt |

> **주의**: police_fire는 가까울수록 고점 (기존 safety.ts 로직 재활용)
> 나머지 4항목은 위험 없을수록 고점 (penalty 엔진 역방향 활용)
> penalty.ts는 극단적 케이스용으로 별도 유지

---

### F. Future Value (미래가치) — 10pt 가중치, 100pt 만점
> **신규 `future-value.ts` — district 기반 하드코딩**

| 서브항목 | 배점 | 측정 방법 |
|---------|------|---------|
| transit_project | 40pt | GTX/지하철 연장 계획 district 기반 |
| redevelopment | 35pt | 재정비촉진지구 포함 여부 district 기반 |
| supply_pressure | 25pt | 3년 공급 압력 역방향 (낮을수록 고점) |

**transit_project 기준 (2026년 기준 계획 노선):**
```
HIGH(40pt):  강남구(GTX-A,C), 서초구(GTX-C), 은평구(GTX-A), 동탄·판교 등
MID(25pt):   종로구, 용산구, 마포구 (기존 노선 풍부)
LOW(10pt):   기타 계획 없음
```

**redevelopment 기준:**
```
HIGH(35pt):  성동구(성수), 영등포구(여의도), 동작구(노량진), 강북구(미아)
MID(20pt):   용산구, 마포구, 광진구
LOW(5pt):    기타
```

**supply_pressure 기준 (낮을수록 고점):**
```
LOW_SUPPLY(25pt):   강남구, 서초구, 용산구 (공급 희소)
MID_SUPPLY(15pt):   마포구, 성동구, 광진구
HIGH_SUPPLY(5pt):   강동구, 송파구, 강서구, 양천구 (공급 많음)
```

---

### G. Product & Supply (상품·공급) — 10pt 가중치, 100pt 만점
> **신규 `supply.ts` — Kakao 단지 밀도 + district 추정**

| 서브항목 | 배점 | 측정 방법 |
|---------|------|---------|
| complex_scale | 40pt | Kakao 반경 1km 아파트 단지 수 |
| trade_volume | 35pt | 실거래가 API 거래 건수 (TradeSummary 활용) |
| new_build_ratio | 25pt | district 기반 신축 비율 추정 |

---

## 4. 파일 변경 계획

### 신규 생성
| 파일 | 역할 |
|------|------|
| `lib/engine/job-demand.ts` | B 카테고리 |
| `lib/engine/living.ts` | C 카테고리 |
| `lib/engine/education.ts` | D 카테고리 |
| `lib/engine/env-risk.ts` | E 카테고리 |
| `lib/engine/future-value.ts` | F 카테고리 |
| `lib/engine/supply.ts` | G 카테고리 |

### 수정
| 파일 | 변경 내용 |
|------|---------|
| `types/index.ts` | categories 7개 카테고리로 확장, CATEGORY_WEIGHTS 재정의 |
| `lib/engine/transport.ts` | weight 0.30 → 0.20 |
| `lib/engine/scoring.ts` | 7개 카테고리 기반 요약 생성 |
| `lib/engine/index.ts` | 7개 카테고리 병렬 호출로 변경 |
| `lib/engine/district-data.ts` | B(income), D(district_preference), F, G 데이터 추가 |

### 삭제 (데이터 흡수 완료 후)
| 파일 | 흡수 대상 |
|------|---------|
| `lib/engine/commercial.ts` | → living.ts |
| `lib/engine/environment.ts` | → living.ts + education.ts + job-demand.ts |
| `lib/engine/safety.ts` | → env-risk.ts |

### 프론트엔드 수정 (engine-dev 영역 외 별도 작업)
| 파일 | 변경 내용 |
|------|---------|
| `app/(analysis)/results/page.tsx` | 7개 카테고리 표시 |
| `components/analysis/` | 카테고리 카드 렌더링 업데이트 |

---

## 5. 구현 순서

```
Step 1. types/index.ts         — 7개 카테고리 타입 + 가중치 재정의
Step 2. district-data.ts       — B(소득등급), D(학군), F, G 데이터 추가
Step 3. job-demand.ts          — B 카테고리 신규
Step 4. living.ts              — C 카테고리 신규 (commercial + environment 합산)
Step 5. education.ts           — D 카테고리 신규 (environment 분리)
Step 6. env-risk.ts            — E 카테고리 신규 (safety 흡수 + 위험 역방향)
Step 7. future-value.ts        — F 카테고리 신규 (district 기반)
Step 8. supply.ts              — G 카테고리 신규
Step 9. transport.ts           — 가중치만 수정
Step 10. scoring.ts            — 7개 카테고리 요약 업데이트
Step 11. index.ts              — 7개 병렬 호출 + 기존 파일 제거
Step 12. commercial/environment/safety.ts — 삭제
Step 13. 프론트엔드 업데이트   — 결과 페이지 7카테고리 표시
```

---

## 6. OUT OF SCOPE

| 항목 | 이유 |
|------|------|
| 실측 소음 dB 데이터 | 공개 API 없음 |
| 일조권/조망권 (sunlight/view) | 데이터 없음 (기본값 대체) |
| 단지 주차 비율 (parking_ratio) | 데이터 없음 |
| 실제 관리비 (management) | 데이터 없음 |
| 재개발 실시간 단계 | 국토부 별도 API 필요 |
| Relative Scoring | 별도 v5 과제 |

---

## 7. 성공 기준

- [ ] 7개 카테고리 합산 가중치 = 1.00 (정확히)
- [ ] TypeScript 컴파일 오류 없음
- [ ] 강남구 테헤란로 152 분석 시 7개 카테고리 점수 모두 반환
- [ ] 기존 4카테고리 대비 총점 변동 ±15pt 이내 (점수 연속성)
- [ ] 프론트엔드 결과 페이지에서 7개 카테고리 정상 표시

---

## 8. 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| district-data.ts 7카테고리 확장 공수 증가 | 높음 | 단계별 구현, F·G는 간소화 |
| 기존 4→7 전환으로 점수 급변 | 중간 | 성공 기준 ±15pt 허용 범위 설정 |
| 프론트엔드 카테고리 키 변경 대응 | 중간 | dashboard-dev 영역 별도 처리 |
| Kakao API 호출 수 증가 (병렬 7개) | 낮음 | Promise.all 병렬 처리로 지연 최소화 |
