# Plan: 부동산 통합관리 시스템 — 기능 점검 및 미개발 보강

**Feature**: `real-estate-integrated`
**Phase**: Plan
**작성일**: 2026-03-03
**담당**: claude-estate 프로젝트

---

## 1. 목적 (Why)

현재 Next.js 앱은 매물장(ledger) + 입지분석(analysis) 두 축이 파일/코드 레벨에서는
완성되어 있으나, **인증 시스템이 미개발**이고 **랜딩·레이아웃 일관성 문제**가 존재한다.
이 플랜은 누락된 기능을 보강해 실제 배포 가능한 완성 상태로 만드는 것을 목표로 한다.

---

## 2. 현재 상태 진단 (AS-IS)

### ✅ 구현 완료

| 영역 | 구현 내용 |
|------|-----------|
| **랜딩** | 부동산 통합관리 시스템 (투 컬럼 대시보드형) |
| **매물장 UI** | SalesTable, ShopTable, RentalTable + FormDialogs + ExcelButtons |
| **Sidebar** | 매매·상가·전월세·입지분석 네비게이션 |
| **입지분석 엔진** | 7종 카테고리 (transport, jobDemand, living, education, envRisk, futureValue, supply) |
| **입지분석 페이지** | /analysis (입력), /analysis/results (결과), /analyze (ledger 내부) |
| **DB 스키마** | better-sqlite3, 3개 테이블 (sales_listings, shop_listings, oneroom_listings) |
| **API Routes** | /api/listings/* (GET/POST/PUT/DELETE) × 3종, /api/analyze |
| **Excel** | 내보내기 + 템플릿 내려받기 + 가져오기 |

### ❌ 미개발 (TO-DO 목록)

| 우선순위 | 항목 | 영향 범위 |
|----------|------|-----------|
| 🔴 Critical | **로그인 페이지** (`app/login/page.tsx`) | 인증 진입점 없음 |
| 🔴 Critical | **인증 API** (`/api/auth/login`, `/api/auth/logout`) | 세션 발급/삭제 불가 |
| 🔴 Critical | **JWT 헬퍼** (`lib/auth.ts`) | 토큰 서명·검증 불가 |
| 🔴 Critical | **미들웨어 활성화** (`middleware.ts`) | ledger 라우트 무방비 |
| 🟡 High | **Sidebar 로그아웃 버튼** | 로그아웃 방법 없음 |
| 🟡 High | **랜딩 레이아웃 헤더 중복** | (landing)/layout.tsx의 absolute 헤더와 새 랜딩 페이지 자체 헤더 충돌 |
| 🟡 High | **모바일 Sidebar 반응형** | 모바일에서 Sidebar 항상 노출 (w-60 고정) |
| 🟠 Medium | **메타데이터 업데이트** | title/description이 구버전 텍스트 |
| 🟠 Medium | **(analysis) 레이아웃** | 분석 페이지에 공통 네비 없음 |
| 🟢 Low | **랜딩→매물장 리다이렉트** | 로그인 상태에서 / 방문 시 /listings/sales로 이동 |
| 🟢 Low | **에러 페이지** | 404, 500 커스텀 페이지 없음 |

---

## 3. 목표 상태 (TO-BE)

### 3-1. 인증 플로우

```
[랜딩 /]
    │
    └── [로그인하기 버튼] → [/login]
                               │
                        비밀번호 입력
                               │
                    POST /api/auth/login
                               │
                   ┌── 성공: JWT httpOnly 쿠키 세션 발급
                   │            └→ redirect /listings/sales
                   └── 실패: 오류 메시지 표시

[/listings/*] [/analyze]
    │
    middleware.ts: session 쿠키 없으면 → redirect /login

[로그아웃 버튼 (Sidebar)]
    │
POST /api/auth/logout → 쿠키 삭제 → redirect /
```

### 3-2. 레이아웃 계층 정리

```
app/layout.tsx (글로벌 — 메타데이터만)
│
├── app/(landing)/layout.tsx   → 헤더 제거 (새 랜딩이 자체 헤더 보유)
├── app/(analysis)/layout.tsx  → 신규: 분석 공통 래퍼 (없어도 됨, 검토 필요)
└── app/(ledger)/layout.tsx    → Sidebar + 모바일 햄버거 메뉴
```

### 3-3. 모바일 반응형 Sidebar

```
모바일 (< lg):
  - 상단 모바일 헤더 바 표시 (햄버거 버튼)
  - Sidebar → slide-in drawer 방식

데스크탑 (>= lg):
  - 기존 고정 Sidebar 유지
```

---

## 4. 구현 범위 (Scope)

### Phase A — 인증 시스템 (Critical)

1. `lib/auth.ts` — JWT 발급/검증 헬퍼 (jose 사용)
2. `app/api/auth/login/route.ts` — POST: 비밀번호 검증 → JWT 쿠키
3. `app/api/auth/logout/route.ts` — POST: 쿠키 삭제
4. `app/login/page.tsx` — 비밀번호 입력 폼 (React Hook Form + Zod)
5. `middleware.ts` — /listings/\*\*, /analyze, /api/listings/\*\* 보호

### Phase B — 레이아웃 정리 (High)

6. `app/(landing)/layout.tsx` — 헤더 제거 (랜딩 페이지가 자체 포함)
7. `components/ledger/Sidebar.tsx` — 로그아웃 버튼 추가 + 모바일 반응형
8. `app/(ledger)/layout.tsx` — 모바일 헤더 바 추가

### Phase C — 메타데이터 + 마무리 (Medium)

9. `app/layout.tsx` — 메타데이터 "부동산 통합관리 시스템"으로 업데이트
10. `app/(landing)/layout.tsx` — 메타데이터 업데이트
11. `app/not-found.tsx` — 404 커스텀 페이지 (선택)

---

## 5. 기술 결정

| 항목 | 선택 | 이유 |
|------|------|------|
| JWT 라이브러리 | `jose` (이미 설치됨) | Edge Runtime 호환, httpOnly 쿠키 |
| 인증 방식 | 단일 관리자 비밀번호 | 개인/소규모 사무소 전용 툴 |
| 쿠키 옵션 | `httpOnly: true, sameSite: 'lax', secure: prod only` | XSS/CSRF 기본 방어 |
| 미들웨어 | Next.js middleware.ts (Edge) | 서버 렌더링 전 인증 체크 |
| 모바일 Sidebar | 클라이언트 useState toggle | zustand 불필요, 단순 구현 |

---

## 6. 환경 변수 요구사항

```env
# .env.local (이미 존재 — 추가 필요)
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_random_32char_secret_here
```

---

## 7. 성공 기준

- [ ] `/login` → 비밀번호 입력 → 세션 쿠키 발급 → `/listings/sales` 이동
- [ ] 미인증 상태에서 `/listings/sales` 접근 → `/login` 리다이렉트
- [ ] Sidebar 로그아웃 버튼 클릭 → 쿠키 삭제 → `/` 이동
- [ ] 모바일(375px)에서 Sidebar drawer 정상 작동
- [ ] TypeScript 오류 없음
- [ ] 랜딩 페이지 헤더 중복 해소 (layout 헤더 제거)
- [ ] 기존 매물장 기능(CRUD, Excel) 정상 유지

---

## 8. 구현 우선순위 & 예상 순서

```
1. lib/auth.ts                        (JWT 헬퍼 기반)
2. app/api/auth/login/route.ts        (로그인 API)
3. app/api/auth/logout/route.ts       (로그아웃 API)
4. app/login/page.tsx                 (로그인 UI)
5. middleware.ts 활성화               (라우트 보호)
6. Sidebar 로그아웃 + 모바일 반응형   (UX 완성)
7. (landing)/layout.tsx 헤더 정리     (중복 제거)
8. 메타데이터 업데이트               (SEO/브랜딩)
```

---

## 9. 비고

- `.env.local`은 이미 존재하나 `ADMIN_PASSWORD`, `JWT_SECRET`이 설정되어 있는지 확인 필요
- `app/api/auth/` 디렉토리 신규 생성 필요
- 기존 `middleware.ts`는 비활성화 상태(matcher: []) → 활성화로 변경
- 랜딩 컴포넌트들 (`components/landing/`) 은 더 이상 메인 페이지에서 사용 안 됨 → 삭제 or 유지 검토
