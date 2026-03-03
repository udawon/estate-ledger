# [Design] TeamCreate — 부동산 입지분석 Agent Teams 상세 설계

> **Phase**: Design
> **생성일**: 2026-03-02
> **참조 Plan**: `docs/01-plan/features/TeamCreate.plan.md`
> **프로젝트**: claude-estate

---

## 1. 아키텍처 설계 (Architecture)

### 1-1. 전체 시스템 구조

```
┌─────────────────────────────────────────────────────┐
│                  claude-estate (Next.js 15)          │
│                                                     │
│  ┌──────────────────┐   ┌───────────────────────┐   │
│  │  (landing) Group │   │  (analysis) Group     │   │
│  │  /               │   │  /analysis            │   │
│  │  랜딩 페이지     │   │  /analysis/results    │   │
│  └──────────────────┘   └───────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  API Routes                                  │   │
│  │  POST /api/analyze → AnalysisResult          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  lib/engine/ (분석 엔진)                       │   │
│  │  transport · commercial · environment · safety │  │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 1-2. Agent Teams 구성도

```
┌─────────────────────────────────────────────────────┐
│                   Team Lead (You)                   │
│   Phase 1 실행 → teammate spawn → 통합 검증         │
└────────────────────┬────────────────────────────────┘
                     │ TeamCreate + spawn
          ┌──────────┼──────────────────────┐
          │          │                      │
          ▼          ▼                      ▼
   [landing-dev] [engine-dev]         [content-dev]
   sonnet        sonnet               haiku
   app/(landing) lib/engine/          content/*.md
   components/   app/api/
   landing/
          │          │
          │          ▼ (완료 후)
          │   [dashboard-dev]
          │   sonnet
          │   app/(analysis)/
          │   components/analysis/
          │
          ▼ (완료 후)
   [polish-dev]
   haiku
   SEO + 최적화
```

---

## 2. 타입 시스템 설계 (`types/index.ts`)

```typescript
// ─── 분석 요청 ────────────────────────────────────────
export interface AnalysisRequest {
  address: string;
  lat: number;
  lng: number;
}

// ─── 카테고리 점수 ─────────────────────────────────────
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CategoryScore {
  score: number;        // 0–100
  grade: Grade;
  label: string;        // "교통 접근성"
  details: string[];    // ["버스 정류장 2개 반경 300m", ...]
  weight: number;       // 가중치 0–1 (합계 = 1)
}

// ─── 종합 분석 결과 ────────────────────────────────────
export interface AnalysisResult {
  id: string;
  address: string;
  totalScore: number;
  grade: Grade;
  categories: {
    transport: CategoryScore;
    commercial: CategoryScore;
    environment: CategoryScore;
    safety: CategoryScore;
  };
  summary: string;      // 한 줄 요약 문구
  analyzedAt: string;   // ISO 8601
}

// ─── API 응답 래퍼 ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── 점수 등급 유틸 ────────────────────────────────────
export const GRADE_CONFIG: Record<Grade, { label: string; color: string; min: number }> = {
  A: { label: '최우수', color: '#22c55e', min: 90 },
  B: { label: '우수',   color: '#84cc16', min: 75 },
  C: { label: '보통',   color: '#eab308', min: 60 },
  D: { label: '미흡',   color: '#f97316', min: 40 },
  F: { label: '불량',   color: '#ef4444', min: 0  },
};
```

---

## 3. 컴포넌트 설계

### 3-1. 랜딩 페이지 컴포넌트 (`landing-dev` 담당)

#### `components/landing/Hero.tsx`
```
┌─────────────────────────────────────────────────────┐
│  [배경: 서울 도시 이미지 또는 그라디언트]              │
│                                                     │
│         부동산 입지분석 엔진                         │
│    AI로 분석하는 완벽한 입지 점수                     │
│                                                     │
│    [주소 입력창          ] [분석 시작 →]              │
│                                                     │
│    ✓ 교통  ✓ 상권  ✓ 환경  ✓ 안전                   │
└─────────────────────────────────────────────────────┘
```
- shadcn `Input` + `Button` 사용
- 입력값 → `/analysis` 페이지로 쿼리 파라미터 전달

#### `components/landing/Features.tsx`
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 교통접근성 │ │ 상권분석  │ │ 환경지수  │ │ 안전지수  │
│  아이콘   │ │  아이콘   │ │  아이콘   │ │  아이콘   │
│  설명글   │ │  설명글   │ │  설명글   │ │  설명글   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```
- Lucide 아이콘: `Train`, `ShoppingBag`, `Leaf`, `Shield`
- shadcn `Card` 컴포넌트

#### `components/landing/HowItWorks.tsx`
```
① 주소 입력  →  ② AI 분석  →  ③ 점수 확인  →  ④ 보고서
```
- Step indicator (shadcn `Badge` + 연결선)

#### `components/landing/CTA.tsx`
```
┌─────────────────────────────────┐
│  지금 바로 무료로 분석해보세요  │
│  [무료 분석 시작하기]           │
└─────────────────────────────────┘
```

---

### 3-2. 분석 대시보드 컴포넌트 (`dashboard-dev` 담당)

#### `components/analysis/AnalysisForm.tsx`
```
┌──────────────────────────────────────────┐
│ 주소를 입력하세요                         │
│ [                         ] [분석하기]   │
│ 예: 서울특별시 강남구 테헤란로 123        │
└──────────────────────────────────────────┘
```
- React Hook Form + Zod validation
- 로딩 상태: shadcn `Skeleton`

#### `components/analysis/ScoreCard.tsx`
```
┌────────────────────────────────────────────┐
│  종합 입지 점수                             │
│                                            │
│           87 / 100                         │
│           등급: A (최우수)                  │
│                                            │
│  교통 ████████░░ 82    환경 ██████░░░░ 65  │
│  상권 █████████░ 90    안전 ███████░░░ 78  │
└────────────────────────────────────────────┘
```
- shadcn `Progress` + `Badge`
- 등급별 색상: `GRADE_CONFIG` 참조

#### `components/analysis/ResultChart.tsx`
- Radar 차트 (recharts 또는 shadcn charts)
- 4개 카테고리 점수 시각화

---

## 4. API 설계 (`engine-dev` 담당)

### `POST /api/analyze`

**Request**:
```typescript
// Body: AnalysisRequest
{
  "address": "서울특별시 강남구 테헤란로 123",
  "lat": 37.5012,
  "lng": 127.0396
}
```

**Response**:
```typescript
// 200 OK: ApiResponse<AnalysisResult>
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "address": "서울특별시 강남구 테헤란로 123",
    "totalScore": 87,
    "grade": "A",
    "categories": {
      "transport": { "score": 82, "grade": "A", "label": "교통 접근성", "details": [...], "weight": 0.3 },
      "commercial": { "score": 90, "grade": "A", "label": "상권 분석", "details": [...], "weight": 0.25 },
      "environment": { "score": 65, "grade": "C", "label": "환경 지수", "details": [...], "weight": 0.25 },
      "safety": { "score": 78, "grade": "B", "label": "안전 지수", "details": [...], "weight": 0.2 }
    },
    "summary": "교통·상권이 우수한 프리미엄 입지",
    "analyzedAt": "2026-03-02T10:00:00Z"
  }
}
```

**Error Response**:
```typescript
// 400/500: ApiResponse<never>
{ "success": false, "error": "주소를 입력해주세요" }
```

---

## 5. 분석 엔진 설계 (`lib/engine/`)

### 점수 계산 방식

```
totalScore = Σ(categoryScore × weight)

weight:
  transport  = 0.30  (교통 30%)
  commercial = 0.25  (상권 25%)
  environment = 0.25 (환경 25%)
  safety     = 0.20  (안전 20%)
```

### 파일별 책임

| 파일 | 함수 | 설명 |
|------|------|------|
| `transport.ts` | `calcTransportScore(lat, lng)` | 지하철역·버스정류장 근접도 |
| `commercial.ts` | `calcCommercialScore(lat, lng)` | 편의시설·음식점 밀도 |
| `environment.ts` | `calcEnvironmentScore(lat, lng)` | 공원·학교·소음 지수 |
| `safety.ts` | `calcSafetyScore(lat, lng)` | 범죄율·소방서 근접도 |
| `scoring.ts` | `aggregateScore(scores)` | 가중 평균 + 등급 산출 |
| `index.ts` | `analyze(req)` | 전체 엔진 진입점 |

### 목 데이터 전략 (MVP)
```typescript
// 실제 API 대신 좌표 기반 결정론적 목 값 사용
const mockScore = Math.round((lat * lng * 100) % 40 + 60); // 60-100 범위
```

---

## 6. Markdown 콘텐츠 설계 (`content-dev` 담당)

| 파일 | 제목 | 분량 |
|------|------|------|
| `content/guide.md` | 입지분석 사용 가이드 | ~500자 |
| `content/criteria.md` | 점수 산출 기준 상세 | ~800자 |
| `content/faq.md` | 자주 묻는 질문 | 10개 Q&A |

---

## 7. Teammate Spawn Prompts (실행용)

### Phase 2 spawn 명령어

```
Create an agent team named "claude-estate" for building a real estate
location analysis engine. Use in-process mode.

Spawn 3 teammates simultaneously:

1. landing-dev (sonnet):
   Build the landing page. Own these files ONLY:
   - app/(landing)/page.tsx
   - app/(landing)/layout.tsx
   - components/landing/Hero.tsx
   - components/landing/Features.tsx
   - components/landing/HowItWorks.tsx
   - components/landing/CTA.tsx
   Use shadcn/ui components. Reference types/index.ts for shared types.
   The landing page should have: Hero with address input, 4 feature cards
   (Transport/Commercial/Environment/Safety), How-It-Works steps, CTA section.

2. engine-dev (sonnet):
   Build the analysis engine. Own these files ONLY:
   - lib/engine/index.ts
   - lib/engine/transport.ts
   - lib/engine/commercial.ts
   - lib/engine/environment.ts
   - lib/engine/safety.ts
   - lib/engine/scoring.ts
   - app/api/analyze/route.ts
   Implement mock scoring (no real API). See types/index.ts for AnalysisResult type.
   Expose POST /api/analyze endpoint returning AnalysisResult.

3. content-dev (haiku):
   Write Markdown content. Own these files ONLY:
   - content/guide.md (usage guide ~500 chars Korean)
   - content/criteria.md (scoring criteria ~800 chars Korean)
   - content/faq.md (10 Q&As in Korean)
   Write in Korean. Do not modify any code files.

Do NOT edit the same files as other teammates.
Require plan approval before engine-dev makes any breaking API changes.
```

### Phase 3 spawn 명령어 (Phase 2 완료 후)

```
Phase 2 is complete. Spawn 2 more teammates:

1. dashboard-dev (sonnet):
   Build the analysis dashboard UI. Own these files ONLY:
   - app/(analysis)/page.tsx
   - app/(analysis)/results/page.tsx
   - components/analysis/AnalysisForm.tsx
   - components/analysis/ScoreCard.tsx
   - components/analysis/ResultChart.tsx
   Connect to POST /api/analyze. Use React Hook Form + Zod for the form.
   Display results using ScoreCard with shadcn Progress bars.

2. polish-dev (haiku):
   Handle SEO and optimization. Own these files ONLY:
   - app/layout.tsx (add metadata)
   - public/ (add favicon, OG image placeholder)
   Add proper Next.js metadata for landing and analysis pages.
   Ensure all pages are mobile responsive with Tailwind breakpoints.
```

---

## 8. Task 목록 (teammate당 5~6개)

### landing-dev Tasks
1. `Hero.tsx` — 주소 입력 폼 + 배경 디자인
2. `Features.tsx` — 4개 카드 (교통/상권/환경/안전)
3. `HowItWorks.tsx` — 4단계 Step 인디케이터
4. `CTA.tsx` — 행동 유도 섹션
5. `app/(landing)/page.tsx` — 컴포넌트 조합 + 레이아웃
6. 반응형 확인 (모바일/태블릿)

### engine-dev Tasks
1. `types/index.ts` 확인 후 `lib/engine/transport.ts` 작성
2. `lib/engine/commercial.ts` + `environment.ts` 작성
3. `lib/engine/safety.ts` + `scoring.ts` 작성
4. `lib/engine/index.ts` — 전체 엔진 조합
5. `app/api/analyze/route.ts` — POST 핸들러
6. API 응답 타입 검증 (tsc --noEmit)

### content-dev Tasks
1. `content/guide.md` 작성
2. `content/criteria.md` 작성
3. `content/faq.md` 작성

### dashboard-dev Tasks
1. `AnalysisForm.tsx` — RHF + Zod 폼
2. `ScoreCard.tsx` — 점수 표시 컴포넌트
3. `ResultChart.tsx` — 레이더 차트
4. `app/(analysis)/page.tsx` — 폼 + 로딩 상태
5. `app/(analysis)/results/page.tsx` — 결과 표시
6. API 연동 테스트

### polish-dev Tasks
1. `app/layout.tsx` — 루트 메타데이터
2. `public/favicon.ico` 추가
3. 모바일 반응형 점검 (전 페이지)
4. Lighthouse 기본 점검

---

## 9. Phase 1 실행 체크리스트 (Lead 단독)

```bash
# 1. Next.js 초기화
npx create-next-app@latest . --typescript --tailwind --eslint \
  --app --src-dir=false --import-alias="@/*"

# 2. shadcn/ui 초기화
npx shadcn@latest init

# 3. 필수 shadcn 컴포넌트 설치
npx shadcn@latest add button input card badge progress skeleton

# 4. 추가 의존성
npm install lucide-react recharts react-hook-form zod @hookform/resolvers

# 5. types/index.ts 생성 (Design §2 참조)
# 6. content/ 폴더 생성
# 7. CLAUDE.md 작성 (teammate context)
```

---

## 10. CLAUDE.md 템플릿 (teammate context 제공용)

```markdown
# claude-estate — Agent Teams Context

## 프로젝트 구조
- Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- 부동산 입지분석 엔진 + 랜딩 페이지

## 파일 소유 규칙 (CRITICAL)
각 teammate는 지정된 파일만 수정한다. 다른 teammate 영역 절대 금지.

| Teammate     | 소유 폴더/파일                              |
|--------------|---------------------------------------------|
| landing-dev  | app/(landing)/, components/landing/         |
| engine-dev   | lib/engine/, app/api/                       |
| content-dev  | content/                                    |
| dashboard-dev| app/(analysis)/, components/analysis/       |
| polish-dev   | app/layout.tsx, public/                     |

## 공유 타입
- types/index.ts — 모든 teammate가 참조, 수정 금지 (Lead만 수정)

## 코딩 규칙
- any 타입 사용 금지
- 컴포넌트: PascalCase, 함수: camelCase
- 한국어 주석
- Tailwind CSS 사용, 인라인 스타일 금지
```

---

## 11. 검증 기준 (Design → Do 전환 조건)

| 항목 | 기준 |
|------|------|
| Plan 문서 완성 | ✅ 완료 |
| 타입 설계 확정 | `types/index.ts` 스펙 확정 |
| Spawn prompt 작성 | Phase 2, Phase 3 모두 준비 |
| Task 목록 작성 | teammate당 5~6개 |
| Phase 1 체크리스트 준비 | 설치 명령어 확인 |

---

*Generated by /pdca design TeamCreate — 2026-03-02*
