# Design: portfolio-deployment

> **상태**: 작성 완료
> **작성일**: 2026-03-03
> **참조 Plan**: `docs/01-plan/features/portfolio-deployment.plan.md`

---

## 1. 아키텍처 개요

### 1.1 변경 전 / 후

```
[변경 전]
Vercel (Serverless)
  └── better-sqlite3 → 파일 시스템 필요 → ❌ 동작 불가
      └── data/estate.db (로컬 전용)

[변경 후]
Vercel (Serverless)
  └── @libsql/client → HTTP/WebSocket → ✅ 동작
      └── Turso Cloud SQLite (원격 DB)
```

### 1.2 데이터 격리 구조

```
Turso DB
├── sales_listings
│   ├── scope = 'admin'  ← Admin 로그인 시에만 조회/수정
│   └── scope = 'demo'   ← Demo 로그인 시에만 조회/수정 (샘플 데이터)
├── shop_listings    (동일)
└── oneroom_listings (동일)

JWT 토큰 (role: 'admin' | 'demo')
  → API Route에서 role → scope 매핑
  → DB 쿼리에 WHERE scope = ? 조건 추가
```

---

## 2. 환경변수 추가

### 2.1 `.env.local` 추가 항목

```env
# Turso Cloud SQLite
TURSO_DB_URL=libsql://your-db-name-yourname.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here
```

### 2.2 전체 환경변수 목록

| 변수명 | 용도 | 필수 |
|--------|------|:----:|
| `TURSO_DB_URL` | Turso DB 주소 | ✅ |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 | ✅ |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 | ✅ |
| `JWT_SECRET` | JWT 서명 키 | ✅ |
| `KAKAO_REST_API_KEY` | 지오코딩·키워드 검색 | 권장 |
| `TMAP_APP_KEY` | 도보 경로 계산 | 권장 |
| `MOLIT_API_KEY` | 국토부 실거래가 | 선택 |

---

## 3. DB 레이어 설계

### 3.1 `lib/db/index.ts` — Turso 클라이언트 전환

**핵심 변경:**
- `better-sqlite3` 제거 → `@libsql/client` 도입
- 동기(sync) → 비동기(async)
- `ensureDb()` 패턴으로 초기화 보장

```typescript
import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;

// DB 클라이언트 싱글톤
function getDb(): Client {
  if (client) return client;
  client = createClient({
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

// 초기화 Promise (중복 실행 방지)
let initPromise: Promise<void> | null = null;

export async function ensureDb(): Promise<Client> {
  if (!initPromise) {
    initPromise = initSchema();
  }
  await initPromise;
  return getDb();
}
```

### 3.2 스키마 변경 — `scope` 컬럼 추가

3개 테이블 모두 동일하게 `scope` 컬럼 추가:

```sql
-- sales_listings, shop_listings, oneroom_listings 공통
scope TEXT NOT NULL DEFAULT 'admin'

-- 기존 인덱스에 scope 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_sales_scope ON sales_listings(scope);
CREATE INDEX IF NOT EXISTS idx_shop_scope  ON shop_listings(scope);
CREATE INDEX IF NOT EXISTS idx_or_scope    ON oneroom_listings(scope);
```

### 3.3 `lib/db/sales.ts` — async 전환 + scope 필터

**함수 시그니처 변경:**

| 함수 | 변경 전 | 변경 후 |
|------|---------|---------|
| `getSales` | `(filter): SaleListing[]` | `(filter, scope): Promise<SaleListing[]>` |
| `getSaleById` | `(id): SaleListing \| undefined` | `(id, scope): Promise<SaleListing \| undefined>` |
| `createSale` | `(data): SaleListing` | `(data, scope): Promise<SaleListing>` |
| `updateSale` | `(id, data): SaleListing \| undefined` | `(id, data, scope): Promise<SaleListing \| undefined>` |
| `deleteSale` | `(id): boolean` | `(id, scope): Promise<boolean>` |

**쿼리 패턴 (better-sqlite3 → libsql):**

```typescript
// Before (better-sqlite3)
db.prepare('SELECT * FROM sales_listings WHERE 1=1').all(...params)

// After (@libsql/client)
const rs = await db.execute({ sql: 'SELECT * FROM sales_listings WHERE scope = ?', args: [scope] });
return rs.rows as unknown as SaleListing[];
```

**createSale 패턴:**

```typescript
const rs = await db.execute({ sql: `INSERT INTO sales_listings (..., scope) VALUES (?, ..., ?)`, args: [...values, scope] });
const newId = Number(rs.lastInsertRowid);
return (await getSaleById(newId, scope))!;
```

**deleteSale 패턴:**

```typescript
// scope 조건 추가 — 다른 scope 데이터 삭제 방지
const rs = await db.execute({
  sql: 'DELETE FROM sales_listings WHERE id = ? AND scope = ?',
  args: [id, scope]
});
return rs.rowsAffected > 0;
```

### 3.4 `lib/db/shops.ts`, `lib/db/rentals.ts`

`sales.ts`와 동일한 패턴으로 async 전환 + scope 파라미터 추가.

---

## 4. 데모 시딩 설계

### 4.1 `lib/db/seed.ts` (신규)

```typescript
// 데모 데이터 없을 때만 자동 시딩
export async function seedDemoData(db: Client): Promise<void> {
  const rs = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM sales_listings WHERE scope = ?',
    args: ['demo']
  });
  if (Number((rs.rows[0] as { cnt: number }).cnt) > 0) return;
  // 매매·상가·전월세 샘플 삽입
}
```

### 4.2 샘플 데이터 명세

**매매 샘플 5건 (scope='demo')**

| 주소 | 구분 | 매가 | 면적 |
|------|------|------|------|
| 서울시 강남구 역삼동 735 | 오피스텔 | 850,000,000 | 33.5㎡ |
| 서울시 마포구 상암동 1600 | 아파트 | 720,000,000 | 59.3㎡ |
| 서울시 송파구 잠실동 20 | 상가 | 1,200,000,000 | 45.0㎡ |
| 경기도 성남시 분당구 정자동 | 아파트 | 650,000,000 | 84.7㎡ |
| 서울시 서초구 반포동 1 | 오피스텔 | 580,000,000 | 26.4㎡ |

**상가 샘플 5건 (scope='demo')**

| 주소 | 유형 | 보증금 | 월세 |
|------|------|--------|------|
| 서울시 강남구 테헤란로 123 | 근린상가 | 50,000,000 | 3,500,000 |
| 서울시 마포구 홍대입구 | 음식점 | 30,000,000 | 2,800,000 |
| 서울시 중구 명동 | 판매시설 | 100,000,000 | 8,000,000 |
| 경기도 수원시 팔달구 | 근린상가 | 20,000,000 | 1,500,000 |
| 서울시 영등포구 여의도동 | 사무실 | 50,000,000 | 4,200,000 |

**전월세 샘플 5건 (scope='demo')**

| 주소 | 구분 | 보증금 | 월세 |
|------|------|--------|------|
| 서울시 강남구 역삼동 | 월세 | 5,000,000 | 950,000 |
| 서울시 마포구 합정동 | 전세 | 280,000,000 | 0 |
| 서울시 은평구 불광동 | 월세 | 10,000,000 | 650,000 |
| 경기도 고양시 일산동구 | 전세 | 200,000,000 | 0 |
| 서울시 성동구 성수동 | 월세 | 3,000,000 | 1,100,000 |

---

## 5. API Route 설계

### 5.1 scope 추출 패턴 (공통)

모든 listings API route에 동일하게 적용:

```typescript
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// role → scope 매핑 헬퍼
function roleToScope(role: 'admin' | 'demo'): 'admin' | 'demo' {
  return role; // 1:1 매핑
}

export async function GET(req: NextRequest) {
  // 1. 세션에서 role 추출
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? '';
  const session = await verifyToken(token);
  const scope = roleToScope(session?.role ?? 'demo');

  // 2. scope 기반 조회
  const data = await getSales(filter, scope);
  return NextResponse.json({ success: true, data });
}
```

### 5.2 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `app/api/listings/sales/route.ts` | scope 추출 + await 추가 |
| `app/api/listings/sales/[id]/route.ts` | scope 추출 + await 추가 |
| `app/api/listings/shops/route.ts` | 동일 |
| `app/api/listings/shops/[id]/route.ts` | 동일 |
| `app/api/listings/rentals/route.ts` | 동일 |
| `app/api/listings/rentals/[id]/route.ts` | 동일 |

---

## 6. 랜딩 페이지 CTA 설계

### 6.1 "데모 체험하기" 버튼

기존 "매물장 관리 페이지로 이동" 버튼 위에 추가.

**위치**: 좌측 카드(매물 통합관리) 하단 CTA 영역

```
[기존]
┌──────────────────────────────┐
│  매물장 관리 페이지로 이동  →  │  (btn-cta, /login 링크)
└──────────────────────────────┘

[변경 후]
┌──────────────────────────────┐
│  데모 체험하기              →  │  (btn-cta, 클릭 → demo 로그인 → /listings/sales)
└──────────────────────────────┘
┌──────────────────────────────┐
│  관리자 로그인              →  │  (btn-ghost, /login 링크)
└──────────────────────────────┘
```

**동작 플로우:**

```
"데모 체험하기" 클릭
  → POST /api/auth/demo-login
  → 성공: 데모 JWT 쿠키 설정
  → router.push('/listings/sales')
  → 데모 샘플 매물 15건 즉시 표시
```

**컴포넌트 코드 패턴:**

```typescript
const [demoLoading, setDemoLoading] = useState(false);

async function handleDemoLogin() {
  setDemoLoading(true);
  try {
    const res = await fetch('/api/auth/demo-login', { method: 'POST' });
    if (res.ok) router.push('/listings/sales');
  } finally {
    setDemoLoading(false);
  }
}

// 버튼 JSX
<button onClick={handleDemoLogin} disabled={demoLoading} className="btn-cta">
  {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
  {demoLoading ? '로딩 중...' : '데모 체험하기'}
  {!demoLoading && <ArrowRight className="w-4 h-4" />}
</button>
```

---

## 7. 의존성 변경

### 7.1 제거

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

### 7.2 추가

```bash
npm install @libsql/client
```

---

## 8. 구현 순서 (Do Phase 체크리스트)

```
[ ] 1. npm uninstall better-sqlite3 @types/better-sqlite3
[ ] 2. npm install @libsql/client
[ ] 3. lib/db/index.ts — Turso 클라이언트 + ensureDb() + scope 컬럼 포함 스키마
[ ] 4. lib/db/seed.ts  — 데모 샘플 데이터 15건
[ ] 5. lib/db/sales.ts — async 전환 + scope 파라미터
[ ] 6. lib/db/shops.ts — async 전환 + scope 파라미터
[ ] 7. lib/db/rentals.ts — async 전환 + scope 파라미터
[ ] 8. app/api/listings/sales/route.ts — scope 추출 + await
[ ] 9. app/api/listings/sales/[id]/route.ts — scope 추출 + await
[ ] 10. app/api/listings/shops/route.ts + [id]/route.ts
[ ] 11. app/api/listings/rentals/route.ts + [id]/route.ts
[ ] 12. app/(landing)/page.tsx — 데모 체험하기 버튼
[ ] 13. .env.local — TURSO_DB_URL, TURSO_AUTH_TOKEN 추가
[ ] 14. Turso 계정 생성 + DB 생성 (https://turso.tech)
[ ] 15. Vercel 환경변수 전체 설정
[ ] 16. vercel --prod 재배포
[ ] 17. 동작 확인 (데모 로그인 → 매물 CRUD → 입지분석)
```

---

## 9. 보안 고려사항

| 항목 | 처리 방법 |
|------|----------|
| Admin 데이터 노출 방지 | scope='admin' WHERE 조건 — Demo 쿼리에서 절대 조회 불가 |
| 권한 없는 scope 수정 | API Route에서 JWT role → scope 강제 매핑, 클라이언트 scope 파라미터 무시 |
| Demo 데이터 훼손 | Demo 계정의 CRUD는 scope='demo' 한정 — Admin 데이터 영향 없음 |
| Turso 토큰 노출 | 서버사이드 전용 환경변수, 클라이언트 번들 포함 금지 |

---

*작성일: 2026-03-03*
