# landing-page-improvement Design

> **Plan 참조**: docs/01-plan/features/landing-page-improvement.plan.md
> **작성일**: 2026-03-02

---

## 1. 변경 파일 목록

| 파일 | 유형 | 변경 내용 |
|------|------|-----------|
| `components/landing/Hero.tsx` | 수정 | 카테고리 뱃지 7개, 서브타이틀 신뢰 문구 추가 |
| `components/landing/Features.tsx` | 수정 | 4개 카드 → 7개 카드, 레이아웃 변경 |
| `components/landing/TrustBadges.tsx` | 신규 | 공공 API 실측 강점 배지 섹션 |
| `components/landing/HowItWorks.tsx` | 수정 | STEP 4 텍스트 수정 |
| `components/landing/CTA.tsx` | 수정 | 보조 문구 업데이트 |
| `app/(landing)/page.tsx` | 수정 | TrustBadges 섹션 추가 |

---

## 2. 컴포넌트 상세 설계

### 2.1 Hero.tsx

**현재**: 4개 뱃지 (교통, 상권, 환경, 안전), 서브타이틀에 신뢰 지표 없음

**변경 후**:
- 서브타이틀: `"공공 API 5개 실시간 연동으로 7개 카테고리를 종합 분석합니다"`
- 카테고리 뱃지: 7개 (교통, 일자리·수요, 생활인프라, 교육, 환경위험, 미래가치, 상품·공급)

```tsx
// 뱃지 목록
['교통', '일자리·수요', '생활인프라', '교육', '환경위험', '미래가치', '상품·공급']
```

---

### 2.2 Features.tsx

**현재**: 4개 카드 (교통/상권/환경/안전), `lg:grid-cols-4` 레이아웃

**변경 후**: 7개 카드, 실제 엔진 카테고리와 1:1 매칭

**레이아웃**: 모바일 1열 → sm 2열 → lg 3열
- 1행: 교통 / 일자리·수요 / 생활인프라
- 2행: 교육 / 환경위험 / 미래가치
- 3행: 상품·공급 (중앙 정렬)

**카드 데이터**:

| 카테고리 | 아이콘 | 색상 | API 표시 | 가중치 |
|---------|--------|------|---------|--------|
| 교통 접근성 | `Train` | blue | TMAP 대중교통 | 20% |
| 일자리·수요 | `Briefcase` | violet | KOSIS 통계청 | 15% |
| 생활인프라 | `ShoppingBag` | orange | Kakao 로컬 API | 15% |
| 교육 환경 | `GraduationCap` | emerald | 학교알리미 | 15% |
| 환경위험 | `AlertTriangle` | red | 서울시 침수흔적도 | 15% |
| 미래가치 | `TrendingUp` | amber | 국토부 실거래가 | 10% |
| 상품·공급 | `Building2` | slate | 건축물대장 | 10% |

각 카드 하단에 `API: {출처}` 뱃지 표시

---

### 2.3 TrustBadges.tsx (신규)

**위치**: Features 섹션 바로 아래 (HowItWorks 위)

**레이아웃**: 좁은 배경 배너 (`bg-slate-100`)
- 중앙 텍스트: "공공 데이터 기반 실측 분석"
- 배지 5개 수평 나열 (모바일: 2열 그리드)

**배지 목록**:
1. 공공 API 5종 연동
2. 서울시 실측 데이터
3. KOSIS 통계청
4. 90일 자동 캐시
5. 30초 분석 완료

---

### 2.4 HowItWorks.tsx

**변경**: STEP 4 `title: '보고서'` → `'상세 결과'`
- `description`: `'상세 분석 보고서로 입지 결정에 활용하세요.'` → `'카테고리별 상세 결과와 AI 요약으로 입지 결정에 활용하세요.'`

---

### 2.5 CTA.tsx

**변경**: 보조 정보 텍스트
- 현재: `"교통 · 상권 · 환경 · 안전 4가지 지표를 종합 분석"`
- 변경: `"교통 · 일자리 · 생활 · 교육 · 환경 · 미래 · 공급 — 7개 카테고리 종합 분석"`

---

### 2.6 page.tsx

```tsx
// Features 다음, HowItWorks 전에 TrustBadges 추가
<section id="features">
  <Features />
</section>

<TrustBadges />   {/* 신규 */}

<HowItWorks />
```

---

## 3. 반응형 설계

| 브레이크포인트 | Features 레이아웃 | TrustBadges 배지 |
|--------------|-----------------|----------------|
| 기본 (375px) | 1열 | 2열 그리드 |
| sm (640px) | 2열 | 3열 그리드 |
| lg (1024px) | 3열 | 5열 수평 |

Features 7번째 카드 (상품·공급): `lg:col-start-2` 또는 `mx-auto` 로 중앙 배치

---

## 4. 성공 기준

- [ ] Hero 뱃지 7개 정확히 표시
- [ ] Features 카드 7개, 각 카드에 API 출처 표시
- [ ] TrustBadges 섹션 page.tsx에 포함
- [ ] HowItWorks STEP 4 텍스트 수정 완료
- [ ] CTA 보조 문구 7개 카테고리 반영
- [ ] TypeScript 오류 없음
- [ ] 반응형 정상 동작 (375px ~ 1280px)
