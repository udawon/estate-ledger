# Plan: 미래가치 엔진 경기도 확장

> Feature: future-value-enhancement
> Phase: Plan
> Created: 2026-03-03
> Author: claude-estate

---

## 1. 목표 (Objective)

현재 `lib/engine/future-value.ts`는 **서울 25개 자치구 데이터만** 포함한다.
서울 외 지역(경기도 광명시, 성남시 등) 주소 입력 시 세 항목 모두 최하 기본값으로 고정되어
실제 GTX·KTX 수혜 지역임에도 **F등급**이 산출되는 문제가 발생한다.

### 현재 기본값 (서울 외 지역 전체 동일)
| 항목 | 기본값 | 비고 |
|------|--------|------|
| 교통 인프라 계획 | 10pt | "교통 인프라 신규 계획 없음" |
| 재개발·재정비 | 5pt | "재개발·재정비 계획 미확인" |
| 공급 압력 | 12pt | "공급 수준 보통" |
| **합계** | **27pt (F등급)** | 실제와 관계없이 고정 |

### 문제 사례
- 광명시: KTX 광명역 + GTX-B 계획 수혜 지역 → 현재 10pt로 과소 평가
- 하남시: 5호선 연장 완료 + 하남감일 신도시 → 현재 10pt
- 과천시: 4호선 + 재건축 다수 + 개발 희소 → 현재 10pt로 과소 평가
- 성남시 분당: 신분당선 수혜 + GTX-A 야탑역 예정 → 현재 10pt

---

## 2. 구현 범위 (Scope)

### IN SCOPE

#### F1. 경기도 주요 시군 데이터 추가 (TRANSIT_PROJECT, REDEVELOPMENT, SUPPLY_PRESSURE)

추가 대상: 서울 인접 경기도 15개 시·특례시

| 시군 | 교통 계획 | 재개발 | 공급 압력 |
|------|----------|--------|----------|
| 광명시 | GTX-B 광명역 수혜 예정 (30pt) | 철산·하안 재건축 진행 (20pt) | 광명시흥 신도시 공급 압박 (5pt) |
| 과천시 | 4호선·GTX-C 수혜 (25pt) | 과천지식정보타운·재건축 (20pt) | 개발 희소 (25pt) |
| 성남시 분당구 | 신분당선·GTX-A 야탑역 (35pt) | 분당 구도심 리뉴얼 (15pt) | 공급 균형 (15pt) |
| 성남시 수정구·중원구 | 8호선·위례 트램 (20pt) | 신흥·중앙 재개발 (20pt) | 위례 공급 압박 (8pt) |
| 하남시 | 5호선 연장 + 3호선 연장 계획 (30pt) | 감일·미사 신도시 (10pt) | 대규모 신규 공급 (5pt) |
| 구리시 | 8호선·별내선 연장 (25pt) | 교문·수택 재개발 (15pt) | 공급 보통 (12pt) |
| 남양주시 | GTX-B + 별내선·9호선 연장 계획 (25pt) | 다산·별내 신도시 (8pt) | 신도시 공급 압박 (5pt) |
| 고양시 일산 | GTX-A 킨텍스역 수혜 (30pt) | 일산 구도심 재개발 (15pt) | 3기 신도시 공급 압박 (5pt) |
| 부천시 | GTX-B + 7호선 연장 (25pt) | 원미·소사 재개발 (15pt) | 공급 보통 (12pt) |
| 안양시 | GTX-C 인덕원역 + 1·4호선 (30pt) | 만안·호계 재개발 (15pt) | 공급 균형 (15pt) |
| 수원시 | GTX-C 수원역 + 1호선 (25pt) | 팔달·장안 재개발 (15pt) | 공급 보통 (12pt) |
| 의왕시 | GTX-C 의왕역 예정 (20pt) | 재개발 미확인 (5pt) | 공급 보통 (12pt) |
| 군포시 | 1호선·안양선 (15pt) | 재개발 미확인 (5pt) | 공급 보통 (12pt) |
| 의정부시 | 1호선 + 경전철 + GTX-C 의정부역 (25pt) | 의정부역 역세권 재개발 (15pt) | 공급 보통 (12pt) |
| 인천 연수구 | GTX-B 송도역 (25pt) | 송도 국제도시 (8pt) | 공급 압박 (5pt) |

#### F2. 시 단위 district 매핑 로직 개선

현재 `extractDistrict()` 함수 및 `DISTRICT_SCORES`는 구(區) 단위 키만 지원.
경기도는 시(市) 단위 → `future-value.ts` 내 자체 매핑 테이블 추가.

문제 케이스:
- `"경기 광명시 시청로 50"` → `district = "광명시"` (extractDistrict 정상 동작)
- `TRANSIT_PROJECT["광명시"]` → undefined → default 10pt (버그)

해결: TRANSIT_PROJECT, REDEVELOPMENT, SUPPLY_PRESSURE에 경기도 시 키 추가.

#### F3. 서울 미등록 구 보완

현재 `TRANSIT_PROJECT` 누락 구 (기본값 10pt 적용 중):
`노원구`, `도봉구`, `성북구`, `서대문구`, `구로구`, `금천구`, `관악구`, `광진구`,
`동대문구`, `중랑구`, `송파구`, `중구`, `양천구`

각 구에 대해 교통 계획 데이터 추가.

#### F4. 상세 근거 문구 개선

현재: `"교통 인프라 계획: 교통 인프라 신규 계획 없음 (10pt)"`
개선: `"교통 인프라 계획: KTX 광명역 + GTX-B 광명역 계획 수혜 (30pt)"`

모든 신규 엔트리에 구체적인 근거 문구 포함.

### OUT OF SCOPE

- 공공 API 연동 (정비사업현황 API, 철도 계획 API 등): 향후 Phase 2에서 검토
- 인천·부산·대구 등 비수도권 확장: 현재 서비스 범위 외
- 실시간 GTX 사업 진행률 추적: 정적 데이터 유지

---

## 3. 기술 결정 (Technical Decision)

### 데이터 아키텍처

```
future-value.ts
├── TRANSIT_PROJECT: Record<string, {score, label}>
│   ├── 서울 25개 구 (기존 11개 + 누락 14개 추가)
│   └── 경기도 15개 시 (신규)
├── REDEVELOPMENT: Record<string, {score, label}>
│   └── 동일 구조
└── SUPPLY_PRESSURE: Record<string, {score, label}>
    └── 동일 구조
```

### 기본값 조정

현재 기본값(서울 외 전체):
- 교통: 10pt, 재개발: 5pt, 공급: 12pt → 합계 27pt

신규 기본값:
- 수도권 미등록 지역: 교통 15pt, 재개발 8pt, 공급 12pt → 합계 35pt (기존 대비 상향)
- 비수도권: 교통 8pt, 재개발 5pt, 공급 15pt → 합계 28pt (변경 없음)

단, 수도권 판별은 `district`에 "경기", "인천" 포함 여부로 구분.

---

## 4. 파일 변경 목록

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `lib/engine/future-value.ts` | **수정** | TRANSIT_PROJECT, REDEVELOPMENT, SUPPLY_PRESSURE에 경기도 15개 시 + 서울 누락 구 데이터 추가 |
| `lib/engine/district-data.ts` | **수정** | DISTRICT_SCORES, DISTRICT_DETAILS에 광명시 등 경기도 fallback 데이터 추가 |

총 2개 파일 수정 (신규 파일 없음).

---

## 5. 배점 설계 (Scoring Design)

### 경기도 광명시 예시 (수정 후)

```
TRANSIT_PROJECT["광명시"] = {
  score: 30,
  label: "KTX 광명역 인접 + GTX-B 광명역 계획 수혜 예정"
}

REDEVELOPMENT["광명시"] = {
  score: 20,
  label: "철산·하안동 노후 아파트 재건축 진행 중"
}

SUPPLY_PRESSURE["광명시"] = {
  score: 5,
  label: "광명시흥 3기 신도시 대규모 공급 예정 (공급 압박)"
}

// 합계: 30 + 20 + 5 = 55pt → C등급 (현재 27pt F등급 → 크게 개선)
```

### 서울 누락 구 보완 예시

```
TRANSIT_PROJECT["송파구"] = { score: 30, label: "8·2·9호선 집중 + 위례 트램 계획" }
TRANSIT_PROJECT["노원구"] = { score: 20, label: "4·7호선 환승 + 동북선 경전철 계획" }
TRANSIT_PROJECT["관악구"] = { score: 15, label: "2호선 서비스 + 서부선 계획 포함" }
```

---

## 6. 성공 기준 (Acceptance Criteria)

- [ ] `"경기 광명시 시청로 50"` 분석 시 미래가치 F등급 → C등급 이상으로 개선
- [ ] TRANSIT_PROJECT에 경기도 15개 시 추가 완료
- [ ] REDEVELOPMENT에 경기도 15개 시 추가 완료
- [ ] SUPPLY_PRESSURE에 경기도 15개 시 추가 완료
- [ ] 서울 TRANSIT_PROJECT 누락 구 13개 추가 완료
- [ ] TypeScript 컴파일 오류 없음
- [ ] district-data.ts fallback 점수도 광명시 등 경기도 수정

---

## 7. 구현 우선순위

1. **P0**: `future-value.ts` — TRANSIT_PROJECT 경기도 15개 시 추가
2. **P0**: `future-value.ts` — REDEVELOPMENT, SUPPLY_PRESSURE 경기도 추가
3. **P1**: `future-value.ts` — 서울 누락 구 13개 TRANSIT_PROJECT 보완
4. **P2**: `district-data.ts` — 광명시·하남시·구리시 fallback 점수 추가
