# PRD — Estate-Ledger: 부동산 통합관리 시스템

**Product Requirements Document**
작성일: 2026-03-03 | 버전: 1.0

---

## 목차

1. [제품 개요](#1-제품-개요)
2. [배경 및 문제 정의](#2-배경-및-문제-정의)
3. [사용자 정의](#3-사용자-정의)
4. [기능 요구사항](#4-기능-요구사항)
5. [비기능 요구사항](#5-비기능-요구사항)
6. [기술 스택](#6-기술-스택)
7. [시스템 아키텍처](#7-시스템-아키텍처)
8. [데이터 모델](#8-데이터-모델)
9. [API 설계](#9-api-설계)
10. [외부 API 연동](#10-외부-api-연동)
11. [입지분석 엔진 설계](#11-입지분석-엔진-설계)
12. [화면 설계](#12-화면-설계)
13. [인증 및 보안](#13-인증-및-보안)
14. [성공 지표](#14-성공-지표)
15. [릴리스 계획](#15-릴리스-계획)

---

## 1. 제품 개요

### 1.1 제품명
**Estate-Ledger** — 부동산 중개업소를 위한 매물 장부 + AI 입지분석 통합 웹 앱

### 1.2 한 줄 정의
> "주소 하나로 부동산 입지를 7가지 관점에서 자동 분석하고, 매물 장부까지 한 곳에서 관리하는 중개업소 전용 웹 툴"

### 1.3 핵심 가치

| 가치 | 설명 |
|------|------|
| **정확한 분석** | Kakao·TMAP·에어코리아 등 공공 API 실측 데이터 기반 점수 산출 |
| **업무 효율** | 매매·상가·전월세 매물 장부를 하나의 앱에서 CRUD + Excel 연동 |
| **즉시 활용** | 별도 설치 없이 브라우저에서 바로 사용, SQLite 로컬 DB |
| **경량 운영** | 단일 관리자 계정, 서버 비용 최소화 |

---

## 2. 배경 및 문제 정의

### 2.1 현재 문제

중소 부동산 중개업소는 다음과 같은 업무 비효율을 겪는다.

1. **매물 장부 분산 관리**: Excel 파일·메모장·네이버 카페 등 도구 파편화
2. **입지 분석의 주관성**: 경험과 감에 의존한 입지 판단, 객관적 근거 제시 어려움
3. **고객 응대 한계**: 입지 설명 시 정량적 데이터 부족으로 설득력 저하
4. **도구 비용 부담**: 전문 부동산 SaaS의 높은 월 구독료

### 2.2 기존 솔루션의 한계

| 솔루션 | 문제점 |
|--------|--------|
| Excel 파일 | 공유 어려움, 버전 관리 없음, 검색 불편 |
| 네이버 부동산 | 일반 소비자용, 업무 관리 기능 없음 |
| 전문 CRM | 월 수십만 원 구독료, 기능 과다 |
| 수기 노트 | 분실 위험, 검색 불가, 통계 없음 |

### 2.3 해결 방향

- **입지분석 자동화**: 주소 입력 → 7카테고리 점수 자동 산출 (30초 이내)
- **매물 장부 디지털화**: 매매·상가·전월세 3종 테이블 CRUD + Excel 양방향 연동
- **단일 도구 통합**: 매물 장부에서 바로 입지분석 연동

---

## 3. 사용자 정의

### 3.1 주요 사용자

**개인 또는 소규모 부동산 중개업소 관리자** (1인 운영 기준)

| 항목 | 내용 |
|------|------|
| 직군 | 공인중개사, 부동산 중개 보조원 |
| 규모 | 1~3인 사무소 |
| 기술 수준 | 스마트폰·Excel 사용 가능 수준 |
| 주요 니즈 | 빠른 매물 등록, 고객 상담 시 입지 근거 제시 |

### 3.2 사용자 스토리

```
As 중개업소 관리자,
I want to 새 매물을 접수할 때 주소·가격·고객 정보를 빠르게 등록하고,
So that 나중에 검색하거나 Excel로 내보낼 수 있다.

As 중개업소 관리자,
I want to 고객에게 매물을 추천할 때 입지 점수를 보여주고,
So that "이 곳은 교통 85점, 교육 90점"처럼 객관적 근거로 설득할 수 있다.

As 중개업소 관리자,
I want to 기존 Excel 파일을 그대로 가져와서 쓰고,
So that 새 시스템 전환 시 데이터 마이그레이션 부담이 없다.
```

---

## 4. 기능 요구사항

### 4.1 인증 시스템 (AUTH)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| AUTH-01 | 단일 관리자 비밀번호로 로그인 | Critical |
| AUTH-02 | 로그인 성공 시 JWT 쿠키 발급 (httpOnly, 만료 24h) | Critical |
| AUTH-03 | 미인증 접근 시 `/login` 리다이렉트 | Critical |
| AUTH-04 | Sidebar 로그아웃 버튼 | High |
| AUTH-05 | 비밀번호 변경 기능 | Medium |

---

### 4.2 매물 장부 — 매매 (SALES)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| SALES-01 | 매물 목록 조회 (30개 컬럼, 페이지네이션 미적용·전체 표시) | Critical |
| SALES-02 | 새 매물 등록 (Dialog 폼, 4컬럼 레이아웃) | Critical |
| SALES-03 | 매물 수정 (기존 데이터 프리필) | Critical |
| SALES-04 | 매물 삭제 (확인 모달) | Critical |
| SALES-05 | 검색 필터: 주소 키워드, 구분, 접수일 기간 | High |
| SALES-06 | Excel 내보내기 (.xlsx) | High |
| SALES-07 | Excel 가져오기 (템플릿 기반) | High |
| SALES-08 | 테이블 → 입지분석 연동 버튼 (주소 자동 전달) | High |
| SALES-09 | 평당가·순투자금 자동 계산 (면적·매가 입력 시) | Medium |

**매매 매물 주요 컬럼:**
접수일, 구분, 도로명 주소, 주소지, 경로, 용도지역, 해당층, 층(지하/지상),
건축년도, 주차(자주/기계), 엘리베이터, 토지(㎡/평), 건평,
매가, 평당매매가, 순투자금, 보증금, 소계, 월세, 관리비, 현 수익율,
성명, 연락처, 통신사, 비고

---

### 4.3 매물 장부 — 상가 (SHOP)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| SHOP-01 | 상가 목록 조회 (27개 컬럼) | Critical |
| SHOP-02 | 상가 등록/수정/삭제 | Critical |
| SHOP-03 | 검색 필터: 주소, 종류, 기간 | High |
| SHOP-04 | Excel 내보내기/가져오기 | High |
| SHOP-05 | 권리금·VAT 포함 소계 자동 계산 | Medium |

**상가 매물 주요 컬럼:**
접수일, 종류, 상호, 용도지역, 주소, 건축년도, 해당층, 전체층,
계약면적(㎡/평), 실면적(㎡/평), 연료,
소계, 보증금, 권리금, 월세, VAT, 관리비, 평당임대료, 평당관리비,
성명, 연락처, 통신사, 비고

---

### 4.4 매물 장부 — 전월세 (RENTAL)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| RENT-01 | 전월세 목록 조회 (22개 컬럼) | Critical |
| RENT-02 | 전월세 등록/수정/삭제 | Critical |
| RENT-03 | 검색 필터: 주소, 건물구분, 기간 | High |
| RENT-04 | Excel 내보내기/가져오기 | High |

**전월세 매물 주요 컬럼:**
접수일, 전월세구분(월세/전세), 건물구분, 주소, 호수, 비밀번호,
계약일자, 전입일자, 확정일자,
보증금, 월세, 관리비, 임대인, 임차인, 입주상태,
성명, 연락처, 통신사, 비고

---

### 4.5 입지분석 엔진 (ANALYSIS)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| ANA-01 | 주소 입력 → Kakao 지오코딩 → 좌표 산출 | Critical |
| ANA-02 | 7카테고리 점수 병렬 계산 (30초 이내) | Critical |
| ANA-03 | 종합 점수 (0–100) + 등급 (A·B·C·D·F) 산출 | Critical |
| ANA-04 | 패널티 엔진 적용 (소음·혐오시설·침수 위험) | Critical |
| ANA-05 | 카테고리별 세부 근거 문자열 표시 | High |
| ANA-06 | 레이더 차트 시각화 (recharts) | High |
| ANA-07 | 실거래가 조회 (MOLIT API) | High |
| ANA-08 | 분석 결과 페이지 공유/저장 (URL 복사) | Medium |
| ANA-09 | Kakao API 실패 시 district 데이터로 자동 Fallback | High |
| ANA-10 | 서울·경기·인천 수도권 전역 지원 | High |

**7카테고리 배점:**

| 카테고리 | 가중치 | 주요 지표 |
|----------|--------|-----------|
| A. 교통 접근성 | 20% | 지하철 도보 시간, 환승 노선 수, 업무지구 통근 시간 |
| B. 일자리·수요 | 15% | 업무지구 접근성(TMAP), 대학·종합병원, 소득등급 |
| C. 생활인프라 | 15% | 편의점·음식점·카페·대형마트·은행·문화시설 |
| D. 교육 | 15% | 초등학교 도보 거리, 학원가 밀도, 교육 선호 지역 |
| E. 환경위험 | 15% | 파출소·소방서, 소음·침수·혐오시설, PM2.5 |
| F. 미래가치 | 10% | GTX·지하철 연장 계획, 재개발·재정비, 공급 압력 |
| G. 상품·공급 | 10% | 단지 규모, 건물 연식, 신규 공급 경쟁 |

**점수 산출 공식:**
```
totalScore = Σ(categoryScore × weight)
finalScore = clamp(totalScore + penaltyScore, 0, 100)
penaltyScore 최소: -30pt
```

**패널티 규칙:**
```
소음 위험 (거리 기반 차등):
  나들목 0–200m → -10pt
  나들목 200–350m → -5pt
  나들목 350–500m → -2pt
  고가도로 0–150m → -10pt
  고가도로 150–300m → -5pt

혐오시설 (거리 기반 차등):
  0–500m → -8pt
  500m–1km → -4pt

침수 위험 (district 기반):
  고위험구 → -15pt
  중위험구 → -8pt
```

---

### 4.6 랜딩 페이지 (LANDING)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| LAND-01 | 서비스 소개 Hero 섹션 | High |
| LAND-02 | 주요 기능 소개 (Features) | High |
| LAND-03 | 사용 방법 안내 (How It Works) | Medium |
| LAND-04 | 신뢰 지표 배지 (Trust Badges) | Medium |
| LAND-05 | 로그인 CTA 버튼 | High |

---

### 4.7 공통 UX

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| UX-01 | 모바일(375px) ~ 데스크탑(1280px) 반응형 | Critical |
| UX-02 | Sidebar: 데스크탑 고정 / 모바일 Drawer | High |
| UX-03 | 테이블 가로 스크롤 (컬럼 다수) | High |
| UX-04 | 폼 입력 오류 시 Zod 검증 메시지 표시 | High |
| UX-05 | API 호출 중 로딩 상태 표시 | High |
| UX-06 | 404 커스텀 에러 페이지 | Low |

---

## 5. 비기능 요구사항

### 5.1 성능

| 항목 | 목표 |
|------|------|
| 입지분석 응답 시간 | 30초 이내 (Kakao API 병렬 호출) |
| 매물 목록 초기 로딩 | 1초 이내 (SQLite 로컬 쿼리) |
| 페이지 첫 렌더링 (LCP) | 2.5초 이내 |

### 5.2 브라우저 지원

- Chrome 최신, Edge 최신, Safari 최신
- 모바일 Safari (iOS 16+), Chrome Mobile (Android 12+)

### 5.3 보안

- JWT `httpOnly` 쿠키: JavaScript 접근 불가 (XSS 방어)
- `sameSite: 'lax'`: CSRF 기본 방어
- HTTPS 환경에서만 `secure` 플래그 활성화
- 비밀번호 bcrypt 해시 저장 (bcryptjs)
- API Routes: 인증 미들웨어 적용 (`/api/listings/**`)

### 5.4 운영 환경

- **단일 서버 배포**: Vercel (서버리스) or 로컬 Node.js 서버
- **DB**: SQLite 파일 (`data/estate.db`) — 동시 접속 1인 기준
- **환경 변수**: `.env.local` 기반 (API 키 총 8종)
- **캐시**: 파일 기반 캐시 (`/.cache/`) — API 응답 재사용

---

## 6. 기술 스택

| 분류 | 기술 | 선택 이유 |
|------|------|-----------|
| **프레임워크** | Next.js 15 (App Router) | SSR + API Routes 통합, 파일 기반 라우팅 |
| **언어** | TypeScript 5 | 타입 안전성, IDE 자동완성 |
| **스타일** | Tailwind CSS v4 | 유틸리티 클래스, 빠른 반응형 구현 |
| **UI 컴포넌트** | shadcn/ui | 접근성, 커스터마이징 용이 |
| **아이콘** | lucide-react | shadcn/ui 기본 세트 |
| **차트** | recharts | React 친화적, 레이더 차트 지원 |
| **폼** | React Hook Form + Zod | 비제어 컴포넌트, 스키마 검증 |
| **DB** | better-sqlite3 | 동기 SQLite, API Route 최적 |
| **인증** | jose (JWT) | Edge Runtime 호환, httpOnly 쿠키 |
| **Excel** | xlsx (SheetJS) | 내보내기/가져오기 양방향 지원 |
| **상태관리** | React useState | 폼/모달 단순 상태, Zustand 불필요 |

---

## 7. 시스템 아키텍처

### 7.1 라우트 구조

```
app/
├── (landing)/                  # 공개 — 랜딩 페이지
│   ├── layout.tsx
│   └── page.tsx                → /
│
├── (ledger)/                   # 인증 필요 — 매물장 + 분석
│   ├── layout.tsx              → Sidebar 레이아웃
│   ├── listings/
│   │   ├── sales/page.tsx      → /listings/sales
│   │   ├── shops/page.tsx      → /listings/shops
│   │   └── rentals/page.tsx    → /listings/rentals
│   └── analyze/page.tsx        → /analyze (매물 선택 연동)
│
├── (analysis)/                 # 공개 — 독립 입지분석
│   └── analysis/
│       ├── page.tsx            → /analysis
│       └── results/page.tsx    → /analysis/results
│
├── login/page.tsx              → /login
│
└── api/
    ├── analyze/route.ts        → POST /api/analyze
    ├── auth/
    │   ├── login/route.ts      → POST /api/auth/login
    │   ├── logout/route.ts     → POST /api/auth/logout
    │   ├── me/route.ts         → GET /api/auth/me
    │   └── change-password/    → POST /api/auth/change-password
    └── listings/
        ├── sales/
        │   ├── route.ts        → GET(목록) POST(등록)
        │   └── [id]/route.ts   → PUT(수정) DELETE(삭제)
        ├── shops/ (동일 패턴)
        └── rentals/ (동일 패턴)
```

### 7.2 미들웨어 보호 범위

```
middleware.ts
├── /listings/**        → 인증 필요
├── /analyze            → 인증 필요
├── /api/listings/**    → 인증 필요
└── /api/auth/**        → 공개 (로그인 자체)
```

### 7.3 입지분석 처리 흐름

```
클라이언트 [주소 입력]
    │
    ▼
POST /api/analyze
    │
    ├── Kakao 지오코딩 → (lat, lng, district)
    │
    ├── 병렬 실행:
    │   ├── calcTransportScore()     → Kakao (지하철) + TMAP (통근 시간)
    │   ├── calcJobDemandScore()     → Kakao (병원) + KOSIS (소득) + TMAP
    │   ├── calcLivingScore()        → Kakao (편의점·음식점 등)
    │   ├── calcEducationScore()     → Kakao (초등학교·학원)
    │   ├── calcEnvRiskScore()       → Kakao (파출소·소방서) + 에어코리아 + 서울 열린데이터
    │   ├── calcFutureValueScore()   → district 정적 데이터
    │   ├── calcSupplyScore()        → district 정적 데이터
    │   ├── calcPenalty()            → Kakao (나들목·혐오시설)
    │   └── fetchTradeSummary()      → MOLIT 실거래가
    │
    ├── aggregateScore() → totalScore
    ├── finalScore = clamp(totalScore + penaltyScore, 0, 100)
    └── generateSummary()

    ▼
클라이언트 [결과 표시]
```

---

## 8. 데이터 모델

### 8.1 매매 매물 (sales_listings)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | INTEGER PK | 자동 증가 |
| created_at / updated_at | TEXT | ISO 8601 |
| recv_date | TEXT | 접수일 |
| category | TEXT | 구분 |
| road_addr | TEXT | 도로명 주소 |
| lot_addr | TEXT | 주소지 |
| source | TEXT | 경로 |
| zoning | TEXT | 용도지역 |
| floor_this | TEXT | 해당층 |
| floor_b / floor_g | TEXT | 층(지하/지상) |
| built_year | INTEGER | 건축년도 |
| built_date | TEXT | 건축년월일 |
| park_self / park_mech | INTEGER | 주차 대수 |
| elevator | TEXT | 엘리베이터 |
| land_m2 / land_py | REAL | 토지 면적 |
| bldg_area | REAL | 건평 |
| price | INTEGER | 매가 (만원) |
| price_per_py | INTEGER | 평당 매매가 |
| net_invest | INTEGER | 순투자금 |
| deposit | INTEGER | 보증금 |
| subtotal | INTEGER | 소계 |
| monthly | INTEGER | 월세 |
| mng_fee | INTEGER | 관리비 |
| yield_cur | REAL | 현 수익률 (%) |
| client_name | TEXT | 성명 |
| client_phone | TEXT | 연락처 |
| carrier | TEXT | 통신사 |
| memo | TEXT | 비고 |

### 8.2 상가 매물 (shop_listings) — 27개 컬럼

접수일 / 종류 / 상호 / 용도지역 / 주소 / 건축년도 / 해당층 / 전체층 /
계약면적(㎡·평) / 실면적(㎡·평) / 연료 / 소계 / 보증금 / 권리금 / 소계2 /
월세 / VAT / 관리비 / 평당임대료 / 평당관리비 / 성명 / 연락처 / 통신사 / 비고

### 8.3 전월세 매물 (oneroom_listings) — 22개 컬럼

접수일 / 전월세구분 / 건물구분 / 주소 / 호수 / 비밀번호 /
계약일자 / 전입일자 / 확정일자 / 보증금 / 월세 / 관리비 /
임대인 / 임차인 / 입주상태 / 성명 / 연락처 / 통신사 / 비고

---

## 9. API 설계

### 9.1 인증 API

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/login` | 비밀번호 검증 → JWT 쿠키 발급 | ❌ |
| POST | `/api/auth/logout` | 쿠키 삭제 | ✅ |
| GET | `/api/auth/me` | 세션 유효성 확인 | ✅ |
| POST | `/api/auth/change-password` | 비밀번호 변경 | ✅ |

**로그인 Request:**
```json
{ "password": "string" }
```
**로그인 Response:**
```json
{ "success": true }
// Set-Cookie: ce_session=<JWT>; HttpOnly; Path=/; SameSite=Lax
```

### 9.2 매물 API (매매 예시, 상가·전월세 동일 패턴)

| Method | Path | 설명 | Query Params |
|--------|------|------|--------------|
| GET | `/api/listings/sales` | 목록 조회 | `search`, `dateFrom`, `dateTo` |
| POST | `/api/listings/sales` | 매물 등록 | — |
| PUT | `/api/listings/sales/[id]` | 매물 수정 | — |
| DELETE | `/api/listings/sales/[id]` | 매물 삭제 | — |

**공통 Response 형식:**
```json
{
  "success": true,
  "data": { ... }   // 또는 배열
}
// 실패 시:
{
  "success": false,
  "error": "오류 메시지"
}
```

### 9.3 입지분석 API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/analyze` | 주소 → 7카테고리 입지분석 실행 |

**Request:**
```json
{
  "address": "서울특별시 서초구 강남대로 373",
  "lat": 37.4969,   // 선택 (없으면 Kakao 지오코딩)
  "lng": 127.0276
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "address": "서울 서초구 강남대로 373",
    "district": "서초구",
    "lat": 37.4969, "lng": 127.0276,
    "totalScore": 76,
    "penaltyScore": -5,
    "penaltyReasons": ["반경 350m 이내 고속도로 나들목: 양재IC (소음 주의)"],
    "finalScore": 71,
    "grade": "B",
    "categories": {
      "transport":   { "score": 85, "grade": "A", "label": "교통 접근성", "details": [...], "weight": 0.20 },
      "jobDemand":   { "score": 80, "grade": "A", "label": "일자리·수요", ... },
      "living":      { "score": 95, "grade": "A", "label": "생활인프라",  ... },
      "education":   { "score": 95, "grade": "A", "label": "교육",        ... },
      "envRisk":     { "score": 62, "grade": "C", "label": "환경위험",    ... },
      "futureValue": { "score": 70, "grade": "B", "label": "미래가치",    ... },
      "supply":      { "score": 55, "grade": "D", "label": "상품·공급",   ... }
    },
    "summary": "생활인프라·교육 우수한 프리미엄 입지 (종합 71점)",
    "analyzedAt": "2026-03-03T10:00:00Z",
    "tradeSummary": { ... }
  }
}
```

---

## 10. 외부 API 연동

| API | 용도 | 환경변수 | 발급처 |
|-----|------|----------|--------|
| **Kakao Local API** | 지오코딩, 키워드/카테고리 검색 | `KAKAO_REST_API_KEY` | [Kakao Developers](https://developers.kakao.com) |
| **TMAP Pedestrian API** | 업무지구 대중교통 통근 시간 | `TMAP_API_KEY` | [SK OpenAPI](https://openapi.sk.com) |
| **에어코리아 (data.go.kr)** | PM2.5 실측 대기질 | `DATA_GO_API_KEY` | [공공데이터포털](https://data.go.kr) |
| **서울 열린데이터 광장** | 침수 흔적도 실측 | `SEOUL_OPEN_API_KEY` | [서울 열린데이터](https://data.seoul.go.kr) |
| **KOSIS 국가통계포털** | 자치구 GRDP 소득 등급 | `KOSIS_API_KEY` | [KOSIS](https://kosis.kr) |
| **MOLIT 국토교통부** | 아파트 실거래가 조회 | `MOLIT_API_KEY` | [공공데이터포털](https://data.go.kr) |
| **Nominatim (무료)** | 주소 → 좌표 (Kakao 보조) | 없음 | OSM 무료 API |

> **API 키 미설정 시 동작:** 각 API는 독립적으로 실패를 처리하며,
> 실패 시 district(자치구) 기반 정적 데이터로 자동 Fallback.
> Kakao API가 없으면 전체 엔진이 district Fallback으로 전환됨.

### 10.1 API 키 발급 방법

**Kakao REST API Key (필수)**
1. [https://developers.kakao.com](https://developers.kakao.com) 접속
2. 내 애플리케이션 → 애플리케이션 추가
3. 앱 키 → REST API 키 복사
4. `.env.local`에 `KAKAO_REST_API_KEY=발급받은키` 추가

**TMAP API Key (권장)**
1. [https://openapi.sk.com](https://openapi.sk.com) 접속
2. 회원가입 → TMAP API 신청
3. 앱 키 발급 → `.env.local`에 `TMAP_API_KEY=발급받은키` 추가

**공공데이터포털 API (선택)**
1. [https://data.go.kr](https://data.go.kr) 접속
2. 회원가입 → 원하는 API 활용 신청
3. 일반 인증키(Encoding) 발급 → 각 환경변수에 추가

---

## 11. 입지분석 엔진 설계

### 11.1 Fallback 계층 구조

```
실측 데이터 (최우선)
    Kakao API + 공공 API
        │ 실패 시
        ▼
district 정적 데이터 (Fallback)
    서울 25개 구, 경기·인천 주요 시·구
        │ 매칭 없음 시
        ▼
전국 기본값 (최후)
    보통 수준 기본값 반환
```

### 11.2 카테고리별 데이터 소스

| 카테고리 | 실측 소스 | Fallback |
|----------|-----------|----------|
| 교통 | Kakao (지하철역), TMAP (통근 시간) | district 지하철 등급 |
| 일자리·수요 | Kakao (병원), KOSIS (GRDP) | district 소득·임대 등급 |
| 생활인프라 | Kakao 카테고리 (편의점·음식점 등) | district 상권 밀도 |
| 교육 | Kakao 키워드 (초등학교·학원) | district 교육 선호도 |
| 환경위험 | Kakao (파출소·소방서), 에어코리아, 서울 열린데이터 | district 위험 등급 |
| 미래가치 | — | district 교통 계획·재개발 데이터 (정적) |
| 상품·공급 | — | district 공급 압력 데이터 (정적) |

### 11.3 지원 지역

**서울**: 25개 자치구 전체
**경기도**: 광명시, 과천시, 성남시(분당구·수정구·중원구), 하남시, 구리시,
남양주시, 고양시(덕양구·일산동구·일산서구), 부천시, 안양시(동안구·만안구),
수원시(팔달구·영통구·장안구·권선구), 의왕시, 군포시, 의정부시
**인천**: 연수구, 남동구, 부평구, 계양구

---

## 12. 화면 설계

### 12.1 화면 목록

| 화면명 | 경로 | 인증 |
|--------|------|------|
| 랜딩 | `/` | ❌ |
| 로그인 | `/login` | ❌ |
| 매매 매물장 | `/listings/sales` | ✅ |
| 상가 매물장 | `/listings/shops` | ✅ |
| 전월세 매물장 | `/listings/rentals` | ✅ |
| 입지분석 (연동) | `/analyze` | ✅ |
| 입지분석 (독립) | `/analysis` | ❌ |
| 분석 결과 | `/analysis/results` | ❌ |

### 12.2 Ledger 레이아웃

```
┌────────────────────────────────────────────────────┐
│  Header: Estate-Ledger          [로그아웃]          │
├──────────────┬─────────────────────────────────────┤
│  Sidebar     │  <children />                        │
│  ──────────  │                                      │
│  📋 매물장    │  (매매·상가·전월세 테이블)            │
│   ├ 매매     │  또는                                │
│   ├ 상가     │  (입지분석 결과)                     │
│   └ 전월세   │                                      │
│  ──────────  │                                      │
│  🔍 입지분석  │                                      │
└──────────────┴─────────────────────────────────────┘

모바일:
┌────────────────────────────┐
│ [☰] Estate-Ledger [로그아웃]│
├────────────────────────────┤
│  <children />              │
│  (Sidebar → Drawer 방식)   │
└────────────────────────────┘
```

### 12.3 매물 테이블 화면

```
┌─ 매매 매물장 ─────────────────────────────────────┐
│ [신규 등록] [엑셀 내보내기] [템플릿] [가져오기]     │
│ 검색: [주소______] [구분▼] [기간 From~To]  [검색]  │
├──────────────────────────────────────────────────┤
│ 접수일 │ 구분 │ 도로명 주소 │ 매가 │ 성명 │ [수정][삭제][분석] │
│  ...   │  ... │     ...     │  ... │  ... │                   │
└──────────────────────────────────────────────────┘
```

### 12.4 입지분석 결과 화면

```
┌─ 입지분석 결과 ─────────────────────────────────────┐
│ 서울 서초구 강남대로 373                            │
│                                                     │
│  ┌─────────────────┐  ┌───────────────────────────┐ │
│  │  종합 점수: 71   │  │  레이더 차트              │ │
│  │  등급: B (우수)  │  │  (7카테고리 방사형)       │ │
│  │  패널티: -5pt    │  │                           │ │
│  └─────────────────┘  └───────────────────────────┘ │
│                                                     │
│  카테고리 Accordion:                                │
│  ▼ 교통 접근성  85점 A  지하철 2호선 250m...        │
│  ▶ 일자리·수요  80점 A                              │
│  ▶ 생활인프라   95점 A                              │
│  ...                                               │
│                                                     │
│  실거래가: 3.3㎡당 7,500만원 (2025.11~2026.01)      │
└─────────────────────────────────────────────────────┘
```

---

## 13. 인증 및 보안

### 13.1 인증 플로우

```
1. 사용자 → POST /api/auth/login { password }
2. 서버: bcrypt.compare(password, ADMIN_PASSWORD_HASH)
3. 성공: JWT 서명 (jose, HS256, 24h 만료)
4. Set-Cookie: ce_session=<JWT>; HttpOnly; SameSite=Lax; Path=/
5. 이후 요청: middleware.ts에서 쿠키 검증
6. 실패 또는 만료: 401 → /login 리다이렉트
```

### 13.2 환경 변수 목록

```env
# 인증 (필수)
ADMIN_PASSWORD=강력한_비밀번호_여기에
JWT_SECRET=최소_32자_랜덤_시크릿_여기에

# Kakao (필수 — 없으면 district Fallback)
KAKAO_REST_API_KEY=카카오_REST_API_키

# TMAP (권장)
TMAP_API_KEY=TMAP_앱키

# 공공 API (선택 — 없어도 동작, 정확도 향상)
DATA_GO_API_KEY=공공데이터포털_인증키      # 에어코리아 PM2.5
SEOUL_OPEN_API_KEY=서울열린데이터_인증키    # 침수 흔적도
KOSIS_API_KEY=KOSIS_인증키                 # 소득 등급

# MOLIT (선택 — 없으면 실거래가 미표시)
MOLIT_API_KEY=국토교통부_실거래가_인증키
```

---

## 14. 성공 지표

### 14.1 기능 완성도 체크리스트

**인증**
- [ ] `/login` → 비밀번호 입력 → 쿠키 발급 → `/listings/sales` 이동
- [ ] 미인증 접근 → `/login` 리다이렉트
- [ ] Sidebar 로그아웃 → 쿠키 삭제 → `/` 이동

**매물 장부**
- [ ] 매매 CRUD (등록·수정·삭제) 정상 동작
- [ ] 상가 CRUD 정상 동작
- [ ] 전월세 CRUD 정상 동작
- [ ] Excel 내보내기 (.xlsx 파일 생성)
- [ ] Excel 가져오기 (템플릿 기반 bulk insert)
- [ ] 검색 필터 동작

**입지분석**
- [ ] 서울 주소 → 7카테고리 점수 산출
- [ ] 경기도 주소 → 점수 산출 (district Fallback 포함)
- [ ] 패널티 엔진 정상 적용
- [ ] 실거래가 조회 (MOLIT)
- [ ] 레이더 차트 표시
- [ ] 매물 테이블 → 분석 연동

**공통**
- [ ] 모바일 375px 반응형 정상
- [ ] TypeScript 빌드 오류 없음

### 14.2 품질 기준

| 항목 | 기준 |
|------|------|
| 입지분석 응답 속도 | 30초 이내 |
| Kakao API 없이 Fallback | 정상 동작 (district 데이터 반환) |
| TypeScript 오류 | 0개 |
| ESLint 오류 | 0개 |

---

## 15. 릴리스 계획

### Phase 1 — 로컬 MVP (현재 완료)
- 매물 장부 CRUD 3종
- 입지분석 엔진 7카테고리
- 랜딩 페이지
- 로컬 SQLite DB

### Phase 2 — 인증 강화 + 반응형 완성 (예정)
- JWT 인증 시스템 완성
- 모바일 Sidebar Drawer
- 랜딩 헤더 중복 해소
- 404 에러 페이지

### Phase 3 — 배포 (예정)
- Vercel 배포 설정
- 환경 변수 설정 가이드
- DB 마이그레이션 전략 (SQLite → PlanetScale or Supabase 검토)
- 도메인 연결

### Phase 4 — 고도화 (미래)
- 다중 사용자 지원 (팀 계정)
- 분석 결과 저장·히스토리
- 알림 기능 (만료 매물, 시세 변동)
- 상업용 입지분석 특화 엔진

---

*문서 최종 업데이트: 2026-03-03*
*작성: Estate-Ledger 프로젝트*
