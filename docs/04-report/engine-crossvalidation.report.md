# 입지분석 엔진 v4 교차검증 리포트

> 작성일: 2026-03-05
> 팀: engine-validator · score-auditor · data-quality-checker · engine-lead
> 검증 방식: 3인 병렬 독립 분석 → engine-lead 합의 기록

---

## 요약

| 구분 | 건수 |
|------|------|
| Critical | 1 |
| Major | 3 |
| Minor | 4 |
| 정상 확인 | A~G 카테고리 점수 로직 전체 · 가중치 · 단위 일관성 · API fallback |

**종합 판정**: 🟢 엔진 로직 견고 — Critical 1건 수정 후 프로덕션 유지 가능

---

## 1. 정상 확인 항목

### 1-1. A~G 카테고리 점수 로직 (engine-validator)

| 카테고리 | 파일 | 점수 범위 | 현실 반영 | 판정 |
|----------|------|-----------|-----------|------|
| A. 교통 접근성 | transport.ts | 0~100 | 강남 > 노원 > 은평 ✅ | 정상 |
| B. 일자리·수요 | job-demand.ts | 0~100 | 강남 > 노원 > 은평 ✅ | 정상 |
| C. 생활인프라 | living.ts | 0~100 | 강남 > 노원 > 은평 ✅ | 정상 |
| D. 교육 | education.ts | 0~100 | 노원 학원가 가산 ✅ | 정상 |
| E. 환경위험 | env-risk.ts | 0~100 | 역방향 점수 체계 정확 ✅ | 정상 |
| F. 미래가치 | future-value.ts | 0~100 | GTX·재개발 반영 ✅ | 정상 (데이터 검증 필요) |
| G. 상품·공급 | supply.ts | 0~105→cap100 | Math.min 처리 정상 ✅ | 정상 |

### 1-2. 점수 수식·가중치 (score-auditor)

- 가중치 합계: **100%** (A:20 B:15 C:15 D:15 E:15 F:10 G:10)
- total 계산: `Math.round(Σ category_score × weight)` — 설계 완벽 일치
- NaN 방어: 각 카테고리 0~100 정수 보장 → 자연 방어
- 페널티 상한: `-30pt` 적용, finalScore `Math.max(0, Math.min(100, total + penalty))`

### 1-3. 데이터 품질 (data-quality-checker)

- 서울 25개 구 누락 없음, 경기 15개 지역 추가 포함
- district 점수 현실 반영 우수 (강남3구 고점, 강북권 중간, 외곽 중하)
- 가격(만원) · 면적(㎡) · 점수(0~100) 단위 100% 일관
- API 6종 모두 try/catch + fallback 체계 완비
- 종합 품질 등급: **A등급**

---

## 2. 이슈 목록

### 🔴 Critical (1건)

#### C-1. Grade 산정 로직 중복 정의
- **발견자**: score-auditor
- **위치**: `lib/engine/scoring.ts:28-36` / `lib/engine/index.ts:18-24`
- **현상**: 동일한 `getGrade()` 함수가 두 파일에 완전히 복사되어 존재
- **위험**: 등급 기준 수정 시 한 곳만 수정하면 결과 불일치 발생
- **권장 조치**: `scoring.ts`에만 정의하고 `index.ts`는 import 사용
  ```ts
  // index.ts에서
  import { getGrade } from './scoring';
  ```

---

### 🟡 Major (3건)

#### M-1. future-value.ts 경기·인천 district 데이터 신뢰도
- **발견자**: engine-validator
- **위치**: `lib/engine/district-data.ts` (경기도·인천 지자체 항목)
- **현상**: 노원구 GTX-C 연장 등 "가능성" 추측 표현이 확정 수치와 혼재
- **영향**: 경기·인천 지역 F(미래가치) 점수 과대 또는 과소 산정 가능
- **권장 조치**: 각 항목에 `// 출처: [URL/문서명], 확정/예정/추정` 주석 추가

#### M-2. penaltyReasons 다중 표시 누락
- **발견자**: score-auditor
- **위치**: `lib/engine/scoring.ts:98` `generateSummary()`
- **현상**: `penaltyReasons[0]`만 표시 — 여러 패널티 발생 시 2~3번째 이유 UI 미노출
- **권장 조치**:
  ```ts
  // 현재
  penaltyNote: penaltyReasons[0] ?? ''
  // 개선
  penaltyNote: penaltyReasons.join(' · ')
  ```

#### M-3. 소음 패널티 351~500m 구간 미적용
- **발견자**: score-auditor
- **위치**: `lib/engine/penalty.ts:47`
- **현상**: "경미한 패널티" 주석 있으나 실제 penalty = 0 (적용 안 됨)
- **권장 조치**: 설계 의도 명확화 — 적용하려면 `-3pt` 추가, 제외라면 주석 삭제

---

### 🔵 Minor (4건)

#### m-1. env-risk.ts Road Noise 부분 점수 원인 불명확
- **발견자**: engine-validator
- **위치**: `lib/engine/env-risk.ts` Road Noise 로직
- **현상**: 나들목 1개+ 시 8pt (20pt 기준 반감) — penalty.ts 이중 차감 방지 목적이라는 주석만 있음
- **권장 조치**: 주석에 `// penalty.ts의 소음 패널티와 이중 적용 방지: env-risk 40%만 반영` 명시

#### m-2. supply.ts 트렌드 보너스 영향도
- **발견자**: engine-validator
- **위치**: `lib/engine/supply.ts` Trend Bonus
- **현상**: Complex+Trade 점수가 낮을 때 ±5pt 보너스 비중 과대
- **평가**: 현재 Math.max/min 처리로 범위 이탈 없음 — UI 설명 시 주의 필요
- **권장 조치**: 분석 결과 화면에 "트렌드 반영" 항목 별도 표기 고려

#### m-3. 침수 위험 district 커버리지
- **발견자**: score-auditor
- **위치**: `lib/engine/penalty.ts` FLOOD_RISK_HIGH/MEDIUM
- **현상**: 서울 6개 구만 정의, 경기·인천 미적용
- **권장 조치**: 장기적으로 서울시 침수흔적도 API 기반 동적 처리 고려

#### m-4. district fallback 적용 시 로그 부재
- **발견자**: data-quality-checker
- **위치**: `lib/engine/env-risk.ts`, `lib/engine/job-demand.ts`
- **현상**: score=-1 신호 수신 후 district fallback 적용 시 로그 없음
- **권장 조치**: `console.warn('[fallback] district 데이터 적용:', districtName)` 추가 고려

---

## 3. 개선 우선순위

| 순위 | 이슈 | 난이도 | 효과 |
|------|------|--------|------|
| 1 | **C-1** Grade 중복 정의 제거 | 낮음 (import 1줄) | Critical 리스크 제거 |
| 2 | **M-2** penaltyReasons 다중 표시 | 낮음 (join 1줄) | UX 개선 |
| 3 | **M-3** 소음 351~500m 설계 명확화 | 낮음 (주석/코드) | 설계 신뢰성 |
| 4 | **M-1** 미래가치 데이터 출처 주석 | 중간 (데이터 검증) | 신뢰도 향상 |
| 5 | **m-1~4** Minor 개선 | 낮음 | 유지보수성 |

---

## 4. 팀원별 기여

| 팀원 | 담당 영역 | 발견 이슈 |
|------|-----------|-----------|
| engine-validator | A~G 카테고리 점수 로직 | Major 1 · Minor 2 |
| score-auditor | scoring.ts · penalty.ts | Critical 1 · Major 2 · Minor 2 |
| data-quality-checker | district-data · API 레이어 | Major 0 · Minor 1 (고품질 판정) |

---

## 5. 결론

엔진 v4는 **구조적으로 견고**합니다.

- 7카테고리 점수 로직 모두 0~100 범위 내 정상 작동
- 가중치 합계 100%, 수식 설계 완벽 일치
- API 6종 fallback 체계 완비, 데이터 단위 100% 일관
- Critical 이슈 1건은 코드 1줄 수정으로 해결 가능

**권장**: C-1(Grade 중복) → M-2(패널티 표시) → M-3(소음 설계 명확화) 순서로 수정 후 재배포.
