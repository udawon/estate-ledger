# claude-estate — Agent Teams Context

## 프로젝트 개요
부동산 입지분석 엔진 + 랜딩 페이지
- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

## 언어 규칙
- 모든 주석: 한국어
- 변수·함수명: 영어 (camelCase / PascalCase)
- any 타입 사용 금지
- 컴포넌트: PascalCase, 함수: camelCase

## 파일 소유 규칙 (CRITICAL — 반드시 준수)

각 teammate는 **지정된 파일만 수정**한다. 다른 teammate 영역은 절대 수정 금지.

| Teammate      | 소유 폴더·파일                                          |
|---------------|--------------------------------------------------------|
| landing-dev   | app/(landing)/**, components/landing/**               |
| engine-dev    | lib/engine/**, app/api/**                             |
| content-dev   | content/**                                            |
| dashboard-dev | app/(analysis)/**, components/analysis/**             |
| polish-dev    | app/layout.tsx, public/**                             |
| Lead          | types/index.ts, CLAUDE.md, app/globals.css            |

## 공유 타입 (수정 금지 — Lead만 수정 가능)
- `types/index.ts` — AnalysisRequest, AnalysisResult, CategoryScore, Grade, GRADE_CONFIG

## 기술 스택
- UI 컴포넌트: shadcn/ui (components/ui/ 자동 설치됨)
- 아이콘: lucide-react
- 차트: recharts
- 폼: react-hook-form + zod + @hookform/resolvers
- 스타일: Tailwind CSS (인라인 스타일 금지)

## 주요 경로
- 랜딩 페이지: /  (app/(landing)/page.tsx)
- 분석 페이지: /analysis  (app/(analysis)/page.tsx)
- 결과 페이지: /analysis/results  (app/(analysis)/results/page.tsx)
- 분석 API: POST /api/analyze  (app/api/analyze/route.ts)

## API 스펙 (engine-dev 구현 / dashboard-dev 소비)
```
POST /api/analyze
Body: { address: string, lat: number, lng: number }
Response: ApiResponse<AnalysisResult>
```

## 반응형 필수
모든 컴포넌트는 모바일(375px)부터 데스크탑(1280px)까지 대응할 것.
Tailwind 브레이크포인트: sm(640) / md(768) / lg(1024) / xl(1280)
