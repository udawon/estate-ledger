# Plan: 입지분석 엔진 고도화 v3

> Feature: engine-upgrade-v3
> Phase: Plan
> Created: 2026-03-02
> Reference: docs/location_engine_live.md

---

## 1. 목표 (Objective)

`location_engine_live.md` 명세 기준으로 현재 v2 엔진에서 누락된 핵심 기능을 구현한다.

### 현재 v2 엔진 상태 (구현 완료)
| 카테고리 | 구현 항목 | 배점 |
|---------|---------|------|
| transport | Walk Time Bands, 환승역 감지, 광역버스 | 100pt |
| commercial | 편의점, 음식점, 카페, 대형마트, 은행, 문화시설 | 100pt |
| environment | 공원, 학교/초등, 의료(병원/약국), 학원, 어린이집 | 100pt |
| safety | 파출소, 지구대, 소방서, 공공기관 | 100pt |
| scoring | 가중 평균 집계, 등급 산출, 단순 요약 | - |

### 명세서 대비 미구현 항목
| 기능 | 명세서 위치 | 비고 |
|------|-----------|------|
| **패널티 엔진** | Section 4. Red Flag Penalty | 명세서 핵심 기능 |
| **직장 접근성** | A. Transport - job_center_commute_min | transport 서브스코어 |
| **대학/종합병원** | B. Job & Demand - university_hospital_access | environment 추가 |
| **학군 선호도** | D. Education - district_preference | district-data 확장 |
| **요약 고도화** | Section 7. Report Output Schema | 강점/위험 명시 |
| **score clamp** | Section 1.2 Score Formula | final = clamp(total + penalty, 0, 100) |

---

## 2. 구현 범위 (Scope)

### IN SCOPE

#### F1. 패널티 엔진 (Penalty Engine)
- `lib/engine/penalty.ts` 신규 파일 생성
- Kakao API 활용 가능 항목:
  - **소음 위험**: 반경 500m 이내 고속도로IC/나들목, 철도역(KTX/경의선) 검색
  - **혐오시설 위험**: 반경 1km 이내 소각장, 폐기물처리시설, 화장장 검색
- District 데이터 기반 추정 항목:
  - **침수 위험**: 한강/한천 인근 구(도봉, 중랑, 강동 등) 보정
  - **대규모 입주 물량**: 분석 대상 구의 최근 공급 압력 추정
- 배점 공식:
  ```
  penalty = 0
  소음 위험 심각: -10
  혐오시설 근접: -8
  침수 위험 구역: -15 (district 기반)
  대규모 공급 압력: -10 (district 기반)
  penalty = clamp(penalty, -30, 0)
  final_score = clamp(total_score + penalty, 0, 100)
  ```

#### F2. 직장 접근성 서브스코어 (transport에 추가)
- 주요 업무지구 좌표 하드코딩 (강남, 여의도, 마포, 광화문, 판교, 잠실)
- 분석 좌표에서 각 업무지구까지 직선거리 계산
- 가장 가까운 업무지구까지의 거리를 Commute Time Bands로 변환
  ```
  ≤30분(2.4km): 20pt
  ≤40분(3.2km): 16pt
  ≤50분(4.0km): 11pt
  ≤60분(4.8km): 6pt
  60분+: 2pt
  ```
- transport 배점 재조정: 도보(45pt) + 노선(25pt) + 버스(15pt) + 직장접근성(15pt) = 100pt

#### F3. 대학/종합병원 접근성 (environment에 추가)
- Kakao API `HP8(병원)` + 필터링: place_name에 "대학병원", "종합병원", "의료원" 포함
- 반경 3km 내 검색 (일반 병원과 반경 차별화)
- environment 배점 재조정: 공원(25pt) + 학교(20pt) + 의료(20pt) + 대형병원(15pt) + 학원(10pt) + 어린이집(10pt) = 100pt

#### F4. 요약 고도화 (scoring.ts 개선)
- 현재: `"교통·상권이 우수한 프리미엄 입지 (종합 85점)"` (1줄)
- 개선: 강점 TOP2 + 취약점 + 패널티 경고
  ```
  "교통·상권 우수 입지 (종합 85점) | 주의: 소음 위험 지역"
  "교통 최우수 / 환경 취약 (종합 62점) | 권장: 소음·녹지 확인 필요"
  ```

#### F5. score clamp 적용 (index.ts + scoring.ts)
- `aggregateScore()` 반환값에 penalty 반영
- `final_score = clamp(totalScore + penaltyScore, 0, 100)`
- `AnalysisResult`에 `penaltyScore?: number` 필드 추가 (types/index.ts)

### OUT OF SCOPE
- 실측 소음 데이터 (dB 측정값 없음)
- 실측 침수 위험 지도 (국토부 API 연동 미진행)
- 일조권/조망권 평가 (데이터 없음)
- 재개발/정비사업 단계 평가 (데이터 없음)
- 상대적 점수 (Relative Scoring)

---

## 3. 기술 스택

- 언어: TypeScript (기존 유지)
- API: Kakao Local API (기존 유지)
- 신규 파일: `lib/engine/penalty.ts`
- 수정 파일: `lib/engine/transport.ts`, `lib/engine/environment.ts`, `lib/engine/scoring.ts`, `lib/engine/index.ts`, `types/index.ts`

---

## 4. 구현 순서 (Implementation Order)

```
1. types/index.ts        → penaltyScore 필드 추가 (리드 작업)
2. penalty.ts            → 패널티 엔진 신규 구현
3. transport.ts          → 직장 접근성 서브스코어 추가
4. environment.ts        → 대학/종합병원 추가, 배점 재조정
5. scoring.ts            → 요약 고도화, clamp 적용
6. index.ts              → penalty 병렬 호출, final_score 계산
```

---

## 5. 성공 기준 (Success Criteria)

- [ ] 패널티 엔진: 혐오시설/소음 위험 지역에서 -5~-15pt 패널티 적용 확인
- [ ] 직장 접근성: 강남 인근 주소 분석 시 "강남 업무지구 도보 20분" 류 문구 표시
- [ ] 대학병원: 서울대병원/세브란스 인근 주소 분석 시 details에 표시
- [ ] 요약 문구: 패널티 발동 시 "주의:" 경고 포함
- [ ] final_score: total + penalty가 100 초과/0 미만 방지 확인

---

## 6. 리스크

| 리스크 | 가능성 | 대응 |
|--------|--------|------|
| 혐오시설 Kakao 검색어 매칭 불완전 | 중 | 다중 키워드 조합 + 오탐 필터 |
| 직장 접근성 직선거리가 실제 통근 시간과 괴리 | 중 | "참고 수치" 안내 문구 추가 |
| 배점 재조정으로 기존 점수 변동 | 낮 | 총합 100pt 유지, 변동 예상 범위 ±5pt |
