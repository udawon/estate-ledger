// ─── demo 매물 데이터 단위 수정 스크립트 ─────────────────────
// 원(KRW) 단위로 잘못 저장된 demo 데이터를 만원(萬圓) 단위로 수정
// 실행: node scripts/fix-demo-data.mjs

import { createClient } from '@libsql/client';

const db = createClient({
  url: 'libsql://estate-ledger-udawon.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI1NDE0ODUsImlkIjoiMDE5Y2IzYjMtZWMwMS03MzBmLWE1ZTAtZWIwZDhjYWExMGJmIiwicmlkIjoiYjAyNjQ2ODMtZjI0YS00MGUxLTkxNDgtYTkzODg1ODg5MzJmIn0.61T2b15V3NkYA6JUiUrgVAZ4X2q8iX03H5GZ4UL__eEc_Q9BQgVRVyG3A2h-tj8OeEuBYHRp_y8qp2TbR4_2Cg',
});

async function main() {
  // ─── 1. 현재 demo 매매 데이터 확인 ────────────────────────
  const salesRows = await db.execute({
    sql: 'SELECT id, price, price_per_py FROM sales_listings WHERE scope = ? ORDER BY id',
    args: ['demo'],
  });
  console.log('매매 현재 가격:', salesRows.rows.map(r => ({ id: r.id, price: r.price, ppp: r.price_per_py })));

  // ─── 2. price > 1,000,000 이면 원 단위 → 만원으로 변환 ──────
  const salesPriceCheck = Number(salesRows.rows[0]?.price ?? 0);
  if (salesPriceCheck > 1_000_000) {
    console.log('매매: 원 → 만원 변환 실행');
    await db.execute({
      sql: `UPDATE sales_listings
            SET price = ROUND(price / 10000),
                price_per_py = ROUND(price_per_py / 10000)
            WHERE scope = 'demo' AND price > 1000000`,
      args: [],
    });
  } else {
    console.log('매매: 이미 만원 단위이거나 데이터 없음 (skip)');
  }

  // ─── 3. 상가 ──────────────────────────────────────────────
  const shopRows = await db.execute({
    sql: 'SELECT id, deposit, monthly FROM shop_listings WHERE scope = ? ORDER BY id',
    args: ['demo'],
  });
  console.log('상가 현재 가격:', shopRows.rows.map(r => ({ id: r.id, deposit: r.deposit, monthly: r.monthly })));

  const shopDepositCheck = Number(shopRows.rows[0]?.deposit ?? 0);
  if (shopDepositCheck > 1_000_000) {
    console.log('상가: 원 → 만원 변환 실행');
    await db.execute({
      sql: `UPDATE shop_listings
            SET deposit = ROUND(deposit / 10000),
                monthly = ROUND(monthly / 10000)
            WHERE scope = 'demo' AND deposit > 1000000`,
      args: [],
    });
  } else {
    console.log('상가: 이미 만원 단위이거나 데이터 없음 (skip)');
  }

  // ─── 4. 전월세 ────────────────────────────────────────────
  const rentalRows = await db.execute({
    sql: 'SELECT id, deposit, monthly FROM oneroom_listings WHERE scope = ? ORDER BY id',
    args: ['demo'],
  });
  console.log('전월세 현재 가격:', rentalRows.rows.map(r => ({ id: r.id, deposit: r.deposit, monthly: r.monthly })));

  const rentalDepositCheck = Number(rentalRows.rows[0]?.deposit ?? 0);
  if (rentalDepositCheck > 1_000_000) {
    console.log('전월세: 원 → 만원 변환 실행');
    await db.execute({
      sql: `UPDATE oneroom_listings
            SET deposit = ROUND(deposit / 10000),
                monthly = ROUND(monthly / 10000)
            WHERE scope = 'demo'`,
      args: [],
    });
  } else {
    console.log('전월세: 이미 만원 단위이거나 데이터 없음 (skip)');
  }

  // ─── 5. 결과 확인 ─────────────────────────────────────────
  const afterSales = await db.execute({
    sql: 'SELECT id, price, price_per_py FROM sales_listings WHERE scope = ? ORDER BY id',
    args: ['demo'],
  });
  console.log('\n✅ 수정 후 매매 가격:', afterSales.rows.map(r => ({ id: r.id, price: r.price, ppp: r.price_per_py })));

  const afterShop = await db.execute({
    sql: 'SELECT id, deposit, monthly FROM shop_listings WHERE scope = ? ORDER BY id',
    args: ['demo'],
  });
  console.log('✅ 수정 후 상가 가격:', afterShop.rows.map(r => ({ id: r.id, deposit: r.deposit, monthly: r.monthly })));

  const afterRental = await db.execute({
    sql: 'SELECT id, deposit, monthly FROM oneroom_listings WHERE scope = ? ORDER BY id',
    args: ['demo'],
  });
  console.log('✅ 수정 후 전월세 가격:', afterRental.rows.map(r => ({ id: r.id, deposit: r.deposit, monthly: r.monthly })));

  console.log('\n완료!');
}

main().catch(console.error);
