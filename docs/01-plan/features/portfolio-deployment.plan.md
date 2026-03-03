# Plan: portfolio-deployment

> **상태**: 작성 완료
> **작성일**: 2026-03-03
> **우선순위**: P0

---

## 1. 배경 및 목적

Estate-Ledger는 개인 업무용 + 포트폴리오 두 가지 목적으로 사용된다.
현재 Vercel 배포는 `better-sqlite3` 파일 기반 DB를 사용하기 때문에
서버리스 환경에서 매물장(CRUD) 기능이 정상 동작하지 않는다.

또한 채용 담당자가 데모 계정으로 접근할 경우 실제 업무 데이터가 노출되거나
훼손될 위험이 있다.

이 기능은 다음 두 가지를 동시에 해결한다:
1. **인프라 문제**: Turso(클라우드 SQLite) + Vercel로 모든 기능 정상화
2. **포트폴리오 문제**: Admin/Demo 데이터 완전 격리 + 샘플 데이터 + 원클릭 데모 체험

---

## 2. 목표

### 2.1 핵심 목표
- [ ] Vercel 배포에서 매물장 CRUD 전 기능 정상 동작
- [ ] 채용 담당자가 실제 Admin 데이터에 접근·수정 불가
- [ ] 데모 계정으로 모든 기능(매물 CRUD + 입지분석 + Excel)을 체험 가능
- [ ] 랜딩 페이지에서 원클릭 데모 체험 진입

### 2.2 성공 기준
- Vercel에서 매물 등록 → 새로고침 후 데이터 유지됨
- 데모 계정 로그인 시 Admin 매물 0건 보임 (샘플 데이터만 표시)
- 랜딩 → "데모 체험하기" → 매물장 진입까지 3초 이내
- 입지분석 주소 검색 결과 정상 반환

---

## 3. 요구사항

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|---------|
| PD-01 | Turso 클라우드 SQLite DB 연결 (better-sqlite3 대체) | P0 |
| PD-02 | DB 레이어 전체 async/await 전환 | P0 |
| PD-03 | 3개 테이블에 `scope` 컬럼 추가 ('admin' / 'demo') | P0 |
| PD-04 | CRUD 쿼리에 scope 필터 적용 (역할별 데이터 격리) | P0 |
| PD-05 | 데모 샘플 데이터 시딩 (매매 5건, 상가 5건, 전월세 5건) | P1 |
| PD-06 | 랜딩 페이지 "데모 체험하기" 버튼 추가 (원클릭 자동 로그인) | P1 |
| PD-07 | Vercel 환경변수 설정 (API 키 전체) | P0 |
| PD-08 | Turso 환경변수 추가 (`TURSO_DB_URL`, `TURSO_AUTH_TOKEN`) | P0 |

### 3.2 비기능 요구사항
- 기존 API Route 인터페이스 변경 없음 (프론트엔드 코드 수정 최소화)
- 데모 데이터는 현실적인 서울 주요 지역 매물로 구성
- Turso 무료 플랜으로 운영 가능 (9GB 스토리지, 월 10억 row read)

---

## 4. 범위 (In Scope / Out of Scope)

### In Scope
- better-sqlite3 → @libsql/client 마이그레이션
- scope 컬럼 기반 데이터 격리
- 데모 샘플 데이터 15건
- 랜딩 CTA 개선 (데모 체험 버튼)
- Vercel 환경변수 구성

### Out of Scope
- 데모 데이터 자동 리셋 (주기적 초기화)
- 다중 Admin 계정 지원
- 실시간 데이터 동기화

---

## 5. 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| DB | Turso (libSQL) | SQLite 호환, Vercel 서버리스 지원, 무료 플랜 충분 |
| 클라이언트 | `@libsql/client` | Turso 공식 SDK, HTTP/WebSocket 지원 |
| 스코프 방식 | `scope` 컬럼 | 테이블 분리 대비 쿼리 단순, 마이그레이션 용이 |
| 데모 로그인 | `/api/auth/demo-login` (기존) | 이미 구현됨, 랜딩에서 호출만 추가 |

---

## 6. 구현 순서

### Phase 1: Turso 마이그레이션 (DB 레이어)
1. `npm install @libsql/client` 설치
2. `lib/db/index.ts` — @libsql/client 싱글톤으로 교체 + 스키마 초기화 (scope 컬럼 포함)
3. `lib/db/sales.ts` — 전 함수 async/await 전환 + scope 필터 추가
4. `lib/db/shops.ts` — 동일
5. `lib/db/rentals.ts` — 동일

### Phase 2: API Route 업데이트
6. `app/api/listings/sales/route.ts` — await 추가
7. `app/api/listings/sales/[id]/route.ts` — await 추가
8. `app/api/listings/shops/route.ts` + `[id]/route.ts`
9. `app/api/listings/rentals/route.ts` + `[id]/route.ts`

### Phase 3: 데모 샘플 데이터 시딩
10. `lib/db/seed.ts` — 현실적인 샘플 데이터 15건 (scope='demo')
11. DB 초기화 시 자동 시딩 (데모 데이터 없을 때만)

### Phase 4: 랜딩 CTA 개선
12. `app/(landing)/page.tsx` — "데모 체험하기" 버튼 추가 + 자동 로그인 플로우

### Phase 5: 환경변수 & 배포
13. `.env.local.example` 업데이트 (TURSO_DB_URL, TURSO_AUTH_TOKEN 추가)
14. Vercel 환경변수 전체 설정
15. `vercel --prod` 재배포 + 동작 확인

---

## 7. 영향 범위

| 파일 | 변경 유형 |
|------|----------|
| `lib/db/index.ts` | 수정 (핵심 — DB 클라이언트 교체) |
| `lib/db/sales.ts` | 수정 (async 전환 + scope 필터) |
| `lib/db/shops.ts` | 수정 (async 전환 + scope 필터) |
| `lib/db/rentals.ts` | 수정 (async 전환 + scope 필터) |
| `lib/db/seed.ts` | 신규 (데모 샘플 데이터) |
| `app/api/listings/**` (6개) | 수정 (await 추가) |
| `app/(landing)/page.tsx` | 수정 (데모 CTA 버튼) |
| `.env.local.example` | 수정 (Turso 키 추가) |
| `package.json` | 수정 (의존성 추가) |

**변경 없는 파일**: 모든 페이지 컴포넌트, 입지분석 엔진, 인증 로직, 타입 정의

---

## 8. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| Turso 무료 플랜 한도 초과 | 포트폴리오 트래픽은 미미 — 문제 없음 |
| @libsql/client API 차이 | 공식 문서 참조, `.query()` 방식 통일 |
| 기존 SQLite 데이터 마이그레이션 | 불필요 — Turso는 새 DB로 시작 |
| scope 누락으로 데이터 노출 | API Route에서 role → scope 매핑 강제 |

---

*작성일: 2026-03-03*
