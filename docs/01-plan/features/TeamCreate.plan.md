# [Plan] TeamCreate — 부동산 입지분석 Agent Teams 구성

> **Phase**: Plan
> **생성일**: 2026-03-02
> **상태**: In Progress
> **프로젝트**: claude-estate (부동산 입지분석 엔진 + 랜딩 페이지)

---

## 1. 개요 (Overview)

Agent Teams를 활용하여 **부동산 입지분석 엔진**과 **랜딩 페이지**를 병렬로 개발한다.
각 teammate는 독립적인 파일 영역을 소유하여 충돌 없이 동시에 작업한다.

### 기술 스택
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Content**: Markdown (MDX)
- **Agent Teams**: Claude Code Experimental (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

---

## 2. 문제 정의 (Problem Statement)

| 문제 | 설명 |
|------|------|
| 개발 병목 | 랜딩 페이지, 분석 엔진, 콘텐츠를 순차 개발 시 시간 낭비 |
| 파일 충돌 위험 | 단일 세션에서 여러 영역 동시 작업 시 충돌 가능성 |
| 컨텍스트 오염 | 한 세션이 모든 작업을 처리하면 컨텍스트 창 소진 |

**해결**: Agent Teams로 영역별 담당자를 분리하여 병렬 개발 + 독립적 컨텍스트 유지.

---

## 3. 목표 (Goals)

### Must Have
- [ ] Next.js 프로젝트 초기화 (TypeScript + App Router + Shadcn + Tailwind)
- [ ] 공유 타입 정의 (`types/index.ts`) — 모든 teammate 의존
- [ ] 랜딩 페이지 완성 (Hero / Features / How It Works / CTA)
- [ ] 입지분석 엔진 로직 + API Route (`/api/analyze`)
- [ ] 분석 결과 대시보드 UI
- [ ] Markdown 콘텐츠 파일 작성

### Nice to Have
- [ ] 지도 컴포넌트 (카카오맵 또는 Leaflet)
- [ ] 분석 결과 PDF 내보내기
- [ ] SEO 최적화 (메타태그, OG 이미지)

### Out of Scope
- 실제 외부 API 연동 (공공데이터포털 등) — 목 데이터 사용
- 사용자 인증 / 로그인

---

## 4. 팀 구성 전략 (Team Strategy)

### Phase 1 — Lead 단독 (순차)
> 모든 teammate의 전제조건. 타입 충돌 방지를 위해 반드시 먼저 완료.

| 작업 | 출력물 |
|------|--------|
| Next.js + Shadcn + TS 초기화 | `package.json`, `tsconfig.json`, `tailwind.config.ts` |
| 공유 타입 정의 | `types/index.ts` |
| 폴더 구조 확정 + CLAUDE.md 작성 | `CLAUDE.md` (teammate context 제공) |

### Phase 2 — 3 Teammates 병렬
> 각각 독립된 파일 영역 소유 → 충돌 없음

| Teammate | 담당 영역 | 파일 소유 | 모델 |
|----------|-----------|-----------|------|
| `landing-dev` | 랜딩 페이지 전체 | `app/(landing)/`, `components/landing/` | sonnet |
| `engine-dev` | 분석 엔진 + API | `lib/engine/`, `app/api/` | sonnet |
| `content-dev` | Markdown 콘텐츠 | `content/*.md`, `content/*.mdx` | haiku |

### Phase 3 — 2 Teammates 병렬
> Phase 2 완료 후 시작. engine-dev 결과물을 UI에 통합.

| Teammate | 담당 영역 | 파일 소유 | 모델 | 의존 |
|----------|-----------|-----------|------|------|
| `dashboard-dev` | 분석 대시보드 UI | `app/(analysis)/`, `components/analysis/` | sonnet | engine-dev 완료 |
| `polish-dev` | SEO + 반응형 + 최적화 | `app/layout.tsx`, `public/` | haiku | landing-dev 완료 |

---

## 5. 의존성 다이어그램 (Dependency Graph)

```
[Phase 1: Lead]
    ├── 프로젝트 초기화
    ├── types/index.ts 정의
    └── CLAUDE.md 작성
            │
            ▼ (완료 후 동시 시작)
[Phase 2: 병렬]
    ├── landing-dev  ─ app/(landing)/
    ├── engine-dev   ─ lib/engine/ + app/api/
    └── content-dev  ─ content/
            │
            ▼ (engine-dev 완료 후)
[Phase 3: 병렬]
    ├── dashboard-dev ─ app/(analysis)/
    └── polish-dev    ─ SEO/최적화
            │
            ▼
[Lead: 통합 검증 + 배포]
```

---

## 6. 파일 구조 계획 (File Structure)

```
claude-estate/
├── app/
│   ├── (landing)/
│   │   ├── page.tsx            # 랜딩 메인 [landing-dev]
│   │   └── layout.tsx          # 랜딩 레이아웃 [landing-dev]
│   ├── (analysis)/
│   │   ├── page.tsx            # 분석 대시보드 [dashboard-dev]
│   │   └── results/
│   │       └── page.tsx        # 결과 페이지 [dashboard-dev]
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts        # 분석 API [engine-dev]
│   ├── layout.tsx              # 루트 레이아웃 [polish-dev]
│   └── globals.css             # 전역 스타일 [Lead]
├── components/
│   ├── landing/
│   │   ├── Hero.tsx            # [landing-dev]
│   │   ├── Features.tsx        # [landing-dev]
│   │   ├── HowItWorks.tsx      # [landing-dev]
│   │   └── CTA.tsx             # [landing-dev]
│   ├── analysis/
│   │   ├── AnalysisForm.tsx    # [dashboard-dev]
│   │   ├── ScoreCard.tsx       # [dashboard-dev]
│   │   └── ResultChart.tsx     # [dashboard-dev]
│   └── ui/                     # shadcn 자동 생성 [Lead]
├── lib/
│   └── engine/
│       ├── index.ts            # 엔진 진입점 [engine-dev]
│       ├── transport.ts        # 교통 점수 계산 [engine-dev]
│       ├── commercial.ts       # 상권 점수 계산 [engine-dev]
│       ├── environment.ts      # 환경 점수 계산 [engine-dev]
│       └── scoring.ts          # 종합 점수 집계 [engine-dev]
├── content/
│   ├── guide.md                # 사용 가이드 [content-dev]
│   ├── criteria.md             # 분석 기준 설명 [content-dev]
│   └── faq.md                  # FAQ [content-dev]
├── types/
│   └── index.ts                # 공유 타입 [Lead - Phase 1]
├── CLAUDE.md                   # teammate 컨텍스트 [Lead - Phase 1]
└── docs/                       # PDCA 문서
```

---

## 7. 공유 타입 계획 (`types/index.ts`)

```typescript
// 입지분석 요청
export interface AnalysisRequest {
  address: string;
  lat: number;
  lng: number;
}

// 카테고리별 점수
export interface CategoryScore {
  score: number;       // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: string[];
}

// 종합 분석 결과
export interface AnalysisResult {
  address: string;
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    transport: CategoryScore;
    commercial: CategoryScore;
    environment: CategoryScore;
    safety: CategoryScore;
  };
  analyzedAt: string;
}
```

---

## 8. 성공 기준 (Success Criteria)

| 기준 | 측정 방법 |
|------|-----------|
| 랜딩 페이지 완성 | 4개 섹션 렌더링 확인 |
| 분석 API 정상 작동 | `/api/analyze` POST 200 응답 |
| 대시보드 데이터 연결 | API 결과 → UI 표시 |
| 파일 충돌 없음 | 각 teammate 파일 영역 독립성 유지 |
| TypeScript 에러 없음 | `tsc --noEmit` 통과 |

---

## 9. 리스크 (Risks)

| 리스크 | 대응 |
|--------|------|
| tmux 미설치 (Windows) | `in-process` 모드로 폴백 |
| teammate 타입 불일치 | Phase 1에서 types/index.ts 완성 후 시작 |
| engine-dev 지연 → dashboard-dev 대기 | content-dev, polish-dev 먼저 병렬 진행 |
| 컨텍스트 창 소진 | 태스크를 5~6개 단위로 분할 |

---

## 10. 다음 단계 (Next Steps)

1. `/pdca design TeamCreate` → 상세 설계 문서 작성
2. Phase 1 실행: `npx create-next-app@latest` + Shadcn 설치
3. `TeamCreate` 팀 생성: `Create an agent team for claude-estate project`
4. teammate별 spawn prompt 작성

---

*Generated by /pdca plan TeamCreate — 2026-03-02*
