# Plan: 공공 API 연동으로 데이터 신뢰성 향상

> Feature: public-api-integration
> Phase: Plan
> Created: 2026-03-02
> Depends on: engine-restructure-v4 (7카테고리 완료 전제)

---

## 1. 목표 (Objective)

현재 `district` 기반 하드코딩 추정값으로 대체된 항목들을 **실제 공공 데이터 API**로 교체하여
분석 결과의 신뢰성을 높인다.

### 현재 문제
| 카테고리 | 항목 | 현재 방식 | 문제 |
|---------|------|---------|------|
| E. envRisk | flood_risk | district 하드코딩 | 실제 침수이력과 다를 수 있음 |
| G. supply | new_build_ratio | district 추정 | 신축 밀집 지역 오판 가능 |
| E. envRisk | - | air_quality 항목 없음 | 대기오염 미반영 |
| A. transport | employment_hubs | Haversine 직선거리 | 실제 출퇴근 시간 미반영 |
| F. futureValue | redevelopment | district 하드코딩 | 단지 레벨 재개발 정보 없음 |
| B. jobDemand | income_grade | district 추정 | 최신 통계 미반영 |
| D. education | district_preference | 주관적 추정 | 객관적 학교 데이터 없음 |

---

## 2. 대상 API 목록

### Phase 1 — 고우선순위 (신뢰도 향상 효과 큼)

| API | 제공처 | 대체 항목 | 배점 영향 | 갱신 주기 |
|-----|--------|---------|---------|---------|
| 서울시 침수흔적도 | 서울 열린데이터광장 | E.flood_risk (20pt) | district 3단계 → 실제 침수면적 | 연 1회 |
| 국토부 건축물대장 | data.go.kr | G.new_build_ratio (25pt) | district 추정 → 실제 연도별 건물 수 | 월 1회 |
| 에어코리아 (신규 항목) | data.go.kr | E.air_quality (신규 15pt) | 없음 → PM2.5 연평균 농도 | 일 1회 |

> **Phase 1 배점 변화**: E.envRisk 내부 재편 (police_fire 25 → 20, road_noise 25 → 20, flood_risk 20 유지, nuisance 20 → 15, rail_air 10 유지, **air_quality 신규 15pt**)

### Phase 2 — 중우선순위 (개발 난이도 중)

| API | 제공처 | 대체 항목 | 배점 영향 | 갱신 주기 |
|-----|--------|---------|---------|---------|
| TMAP 대중교통 경로 | SK TMAP | A.employment_hubs (40pt) | Haversine → 실제 출퇴근 시간 | 실시간 |
| 서울 클린업시스템 | 서울시 | F.redevelopment (35pt) | district 추정 → 단지 레벨 정비구역 포함 여부 | 분기 1회 |
| KOSIS 지역소득통계 | 통계청 | B.income_grade (15pt) | district 추정 → 시군구 GRDP | 연 1회 |

### Phase 3 — 저우선순위 (추가 가치 창출)

| API | 제공처 | 대체 항목 | 배점 영향 | 갱신 주기 |
|-----|--------|---------|---------|---------|
| 학교알리미 공시정보 | 학교알리미 | D.district_preference (15pt) | 주관적 학군 → 실제 교원 1인당 학생수 | 연 1회 |
| 토지이음 도시계획정보 | 국토부 | F.transit_project (40pt) | district 추정 → 용도지역·지구단위계획 | 분기 1회 |

---

## 3. 아키텍처 설계

### 3-1. 캐싱 레이어 (필수)

공공 API는 호출 제한(일 1000~10000회)이 있으므로 Redis 또는 파일 캐시를 사용한다.

```
lib/
  cache/
    index.ts          — 캐시 인터페이스 (get/set/invalidate)
    file-cache.ts     — 개발/소규모: JSON 파일 캐시 (MVP)
    redis-cache.ts    — 운영: Redis 연동 (Phase 2 도입)
```

| API | TTL | 캐시 키 |
|-----|-----|--------|
| 침수흔적도 | 7일 | `flood:{district}` |
| 건축물대장 | 30일 | `building:{lawdCd}:{dong}` |
| 에어코리아 | 6시간 | `airquality:{stationCode}` |
| TMAP 경로 | 24시간 | `commute:{lat}:{lng}:{hub}` |
| 클린업시스템 | 7일 | `redevelop:{address_hash}` |
| KOSIS 소득 | 90일 | `income:{sggu_code}` |
| 학교알리미 | 30일 | `school:{district}` |
| 토지이음 | 30일 | `landuse:{pnu_code}` |

### 3-2. API 클라이언트 구조

```
lib/
  api/
    kakao.ts          — 기존 (유지)
    molit.ts          — 기존 국토부 실거래가 (유지)
    seoul-open.ts     — 서울 열린데이터광장 (Phase 1 신규)
    data-go.ts        — data.go.kr 공통 클라이언트 (Phase 1 신규)
    tmap.ts           — TMAP 경로 API (Phase 2 신규)
    kosis.ts          — 통계청 KOSIS (Phase 2 신규)
    school-info.ts    — 학교알리미 (Phase 3 신규)
```

### 3-3. 환경변수 추가

```bash
# Phase 1
SEOUL_OPEN_API_KEY=       # 서울시 열린데이터 인증키
DATA_GO_API_KEY=          # 공공데이터포털 통합 인증키 (건축물대장 + 에어코리아)

# Phase 2
TMAP_API_KEY=             # TMAP Web API 키 (SK Open API)
KOSIS_API_KEY=            # 통계청 KOSIS API 키

# Phase 3
SCHOOL_API_KEY=           # 학교알리미 API 키 (NEIS)
LAND_API_KEY=             # 토지이음 API 키
```

---

## 4. Phase별 상세 구현 계획

### Phase 1: 침수흔적도 + 건축물대장 + 에어코리아

#### 4-1-A. 서울시 침수흔적도 (E.flood_risk 대체)

**API 정보:**
- Endpoint: `http://openapi.seoul.go.kr/openAPI/service/rest/FloodFloodInfo/getFloodInfo`
- 인증: 서울시 API 키 (SEOUL_OPEN_API_KEY)
- 응답: 침수면적(m²), 침수날짜, 행정동

**현재 district 점수 → 실제 침수면적 기준:**
```
침수 이력 없음           → 20pt
5년 내 1~2회 경미 침수   → 12pt
5년 내 3회 이상 or 대규모 → 0pt
```

**변경 파일:** `lib/engine/env-risk.ts`, `lib/api/seoul-open.ts`

#### 4-1-B. 국토부 건축물대장 (G.new_build_ratio 대체)

**API 정보:**
- Endpoint: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrBasisOulnInfo`
- 인증: DATA_GO_API_KEY
- 파라미터: 법정동코드(sigunguCd), 법정동(bjdongCd)
- 응답: 사용승인일, 건물용도, 층수 등

**현재 district 점수 → 실제 건축 연도 기준:**
```
10년 이내 신축 비율 40% 이상   → 25pt
10년 이내 신축 비율 20~40%     → 15pt
10년 이내 신축 비율 20% 미만   → 5pt
```

**변경 파일:** `lib/engine/supply.ts`, `lib/api/data-go.ts`

#### 4-1-C. 에어코리아 PM2.5 (E.air_quality 신규 항목)

**API 정보:**
- Endpoint: `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty`
- 인증: DATA_GO_API_KEY
- 파라미터: 측정소명(stationName), 조회기간(dataTerm)
- 응답: PM2.5 농도(㎍/㎥)

**PM2.5 농도별 점수:**
```
15 이하 (좋음)   → 15pt
16~25 (보통)     → 10pt
26~35 (나쁨)     → 5pt
36 이상 (매우나쁨) → 0pt
```

**E.envRisk 내부 배점 재편 필요:**
```
기존: police_fire(25) + road_noise(25) + flood_risk(20) + nuisance(20) + rail_air(10) = 100
변경: police_fire(20) + road_noise(20) + flood_risk(20) + nuisance(15) + rail_air(10) + air_quality(15) = 100
```

**변경 파일:** `lib/engine/env-risk.ts`, `lib/api/data-go.ts`, `types/index.ts`

---

### Phase 2: TMAP + 클린업 + KOSIS

#### 4-2-A. TMAP 대중교통 경로 (A.employment_hubs 대체)

**API 정보:**
- Endpoint: `https://apis.openapi.sk.com/transit/routes`
- 인증: TMAP_API_KEY (SK Open API)
- 파라미터: 출발지(lat/lng), 목적지(lat/lng)
- 응답: 소요시간(분), 환승횟수

**JOB_CENTERS 6개 → TMAP으로 실제 출퇴근 시간 측정:**
```
30분 이내  → 40pt
30~45분    → 30pt
45~60분    → 20pt
60분 초과  → 10pt
(가장 가까운 업무지구 기준)
```

**주의:** TMAP API 호출 6회(업무지구 6개) → 캐시 의무화 (TTL 24h)

#### 4-2-B. 서울 클린업시스템 (F.redevelopment 대체)

**API 정보:**
- Endpoint: 서울시 도시정비 현황 API (seoul.go.kr)
- 인증: SEOUL_OPEN_API_KEY
- 응답: 정비구역명, 정비유형, 사업단계

**현재 district 3단계 → 실제 사업단계별 점수:**
```
착공 이후 (시공사 선정~준공)    → 35pt (단기 가치 상승 확실)
추진위/조합 설립 단계            → 25pt (중기 기대)
구역 지정만 된 상태              → 15pt (장기 불확실)
정비구역 없음                    → 5pt
```

#### 4-2-C. KOSIS 지역소득통계 (B.income_grade 대체)

**API 정보:**
- Endpoint: `https://kosis.kr/openapi/Param/statisticsParameterData.do`
- 인증: KOSIS_API_KEY
- 통계표: 시군구별 1인당 GRDP (지역내총생산)

**TTL 90일 캐싱 필수 (연간 업데이트 데이터)**

---

### Phase 3: 학교알리미 + 토지이음

#### 4-3-A. 학교알리미 공시정보 (D.district_preference 대체)

**API 정보:**
- Endpoint: `https://www.schoolinfo.go.kr/openApi/`
- 인증: SCHOOL_API_KEY (NEIS)
- 데이터: 교원 1인당 학생수, 학교폭력 발생건수, 급식만족도 등

**점수 기준:** 교원 1인당 학생수 기준 (낮을수록 우수)
```
14명 이하  → 15pt
15~17명     → 9pt
18명 이상   → 3pt
```

#### 4-3-B. 토지이음 도시계획정보 (F.transit_project 보완)

**API 정보:**
- Endpoint: `https://www.eum.go.kr/api/`
- 인증: LAND_API_KEY
- 데이터: 용도지역, 지구단위계획구역, 개발행위허가

**현재 district 추정 → 지구단위계획 포함 여부 가중치 추가**

---

## 5. 파일 변경 계획

### Phase 1 신규/수정

| 파일 | 작업 | 우선순위 |
|------|------|---------|
| `lib/cache/index.ts` | 캐시 인터페이스 신규 | P1 |
| `lib/cache/file-cache.ts` | 파일 기반 캐시 신규 | P1 |
| `lib/api/seoul-open.ts` | 서울 열린데이터 클라이언트 신규 | P1 |
| `lib/api/data-go.ts` | data.go.kr 공통 클라이언트 신규 | P1 |
| `lib/engine/env-risk.ts` | flood_risk + air_quality 항목 교체 | P1 |
| `lib/engine/supply.ts` | new_build_ratio 건축물대장으로 교체 | P1 |
| `types/index.ts` | E.envRisk 서브항목 6개로 확장 | P1 (Lead 영역) |
| `.env.local.example` | 신규 환경변수 추가 | P1 |

### Phase 2 신규/수정

| 파일 | 작업 | 우선순위 |
|------|------|---------|
| `lib/cache/redis-cache.ts` | Redis 캐시 클라이언트 신규 | P2 |
| `lib/api/tmap.ts` | TMAP 경로 API 클라이언트 신규 | P2 |
| `lib/api/kosis.ts` | KOSIS 통계 API 클라이언트 신규 | P2 |
| `lib/engine/transport.ts` | employment_hubs → TMAP 실측 | P2 |
| `lib/engine/future-value.ts` | redevelopment → 클린업 실측 | P2 |
| `lib/engine/job-demand.ts` | income_grade → KOSIS 실측 | P2 |

### Phase 3 신규/수정

| 파일 | 작업 | 우선순위 |
|------|------|---------|
| `lib/api/school-info.ts` | 학교알리미 API 클라이언트 신규 | P3 |
| `lib/api/land-use.ts` | 토지이음 API 클라이언트 신규 | P3 |
| `lib/engine/education.ts` | district_preference → 학교알리미 | P3 |
| `lib/engine/future-value.ts` | transit_project 토지이음 보완 | P3 |

---

## 6. 구현 순서

```
Phase 1:
Step 1.  환경변수 문서화 (.env.local.example 업데이트)
Step 2.  lib/cache/index.ts + file-cache.ts — 공통 캐시 레이어
Step 3.  lib/api/data-go.ts — data.go.kr 클라이언트
Step 4.  lib/api/seoul-open.ts — 서울시 열린데이터 클라이언트
Step 5.  lib/engine/env-risk.ts 수정 — flood_risk + air_quality 통합
Step 6.  lib/engine/supply.ts 수정 — new_build_ratio 건축물대장 교체
Step 7.  types/index.ts 수정 — E 서브항목 6개 타입 추가 (Lead 영역)
Step 8.  Phase 1 검증: 강남구 테헤란로 152 분석 → 6개 항목 점수 확인

Phase 2:
Step 9.  lib/api/tmap.ts — TMAP 경로 클라이언트
Step 10. lib/api/kosis.ts — KOSIS 통계 클라이언트
Step 11. lib/engine/transport.ts 수정 — TMAP 실측 출퇴근 시간
Step 12. lib/engine/job-demand.ts 수정 — KOSIS 소득 데이터
Step 13. lib/engine/future-value.ts 수정 — 클린업 재개발 사업단계
Step 14. Phase 2 검증: 캐시 동작 + API 응답 시간 측정

Phase 3:
Step 15. lib/api/school-info.ts + lib/api/land-use.ts
Step 16. lib/engine/education.ts + future-value.ts 최종 업데이트
Step 17. 전체 통합 검증
```

---

## 7. API 키 발급 가이드

| 서비스 | 발급 URL | 예상 소요 |
|--------|---------|---------|
| 서울 열린데이터광장 | https://data.seoul.go.kr/ | 즉시 |
| 공공데이터포털 (data.go.kr) | https://www.data.go.kr/ | 1~3일 (승인 필요) |
| TMAP (SK Open API) | https://openapi.sk.com/ | 즉시 |
| KOSIS | https://kosis.kr/openapi/ | 즉시 |
| 학교알리미 (NEIS) | https://www.schoolinfo.go.kr/ | 1~2일 |
| 토지이음 | https://www.eum.go.kr/ | 즉시 |

---

## 8. OUT OF SCOPE

| 항목 | 이유 |
|------|------|
| 실시간 소음 dB 측정 | 공개 API 없음 |
| 개별 아파트 호가 연동 | 상업 API (네이버 부동산 등) |
| 재개발 예상 수익률 계산 | 투자 추천 영역 (법적 리스크) |
| 해외 API 연동 | 국내 서비스 집중 |
| 대기오염 실시간 측정 (에어코리아 30분) | 캐시 비효율, 일평균으로 충분 |

---

## 9. 성공 기준

- [ ] Phase 1: 3개 API 연동 후 `flood_risk`, `new_build_ratio`, `air_quality` 실제 값 반환
- [ ] Phase 1: API 미설정 시 기존 district fallback 정상 동작
- [ ] Phase 2: TMAP 출퇴근 시간 실측 (강남구 기준 20분 이내 예상)
- [ ] 캐시 히트율 95% 이상 (동일 지역 재분석 시)
- [ ] TypeScript 컴파일 오류 없음
- [ ] API 키 없이도 분석 가능 (모든 API 선택적 연동, fallback 보장)

---

## 10. 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| 공공 API 서비스 장애 (data.go.kr 불안정) | 중간 | 모든 API에 try-catch + district fallback |
| TMAP API 6회 호출 응답 지연 (>3초) | 높음 | 캐시 필수 + 타임아웃 2초 설정 |
| 건축물대장 API 법정동코드 불일치 | 중간 | Kakao getRegionCode로 코드 변환 |
| 에어코리아 측정소 좌표 매핑 | 낮음 | 반경 5km 이내 가장 가까운 측정소 사용 |
| API 키 발급 지연 (2~3일 대기) | 중간 | Phase 1부터 API 키 신청 즉시 진행 |
| district fallback과 실측값 괴리 심각 | 중간 | 점수 변동 ±20pt 이내 모니터링 |
