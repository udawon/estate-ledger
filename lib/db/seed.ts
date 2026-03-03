// ─── 데모 샘플 데이터 시딩 ────────────────────────────────
// 데모 계정용 샘플 매물 15건 (매매 5 · 상가 5 · 전월세 5)
// scope='demo' 데이터가 없을 때만 삽입

import type { Client } from '@libsql/client';

export async function seedDemoData(db: Client): Promise<void> {
  const now = new Date().toISOString();

  // ─── 매매 샘플 5건 ──────────────────────────────────────
  const salesCount = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM sales_listings WHERE scope = ?',
    args: ['demo'],
  });
  if (Number((salesCount.rows[0] as unknown as { cnt: number }).cnt) === 0) {
    const salesSamples = [
      {
        recv_date: '2026-02-10', category: '오피스텔',
        road_addr: '서울시 강남구 테헤란로 123', lot_addr: '서울시 강남구 역삼동 735',
        zoning: '상업지역', floor_this: '12', floor_g: '25',
        bldg_area: 33.5, price: 850000000, price_per_py: 83000000,
        client_name: '김민준', client_phone: '010-1234-5678',
        memo: '역세권 오피스텔, 강남역 도보 5분',
      },
      {
        recv_date: '2026-02-14', category: '아파트',
        road_addr: '서울시 마포구 월드컵북로 60', lot_addr: '서울시 마포구 상암동 1600',
        zoning: '2종일반주거', floor_this: '8', floor_g: '20',
        bldg_area: 59.3, price: 720000000, price_per_py: 39000000,
        client_name: '이소연', client_phone: '010-2345-6789',
        memo: '상암DMC 인근, 초역세권',
      },
      {
        recv_date: '2026-02-18', category: '근린상가',
        road_addr: '서울시 송파구 올림픽로 300', lot_addr: '서울시 송파구 잠실동 20',
        zoning: '상업지역', floor_this: '1', floor_g: '6',
        bldg_area: 45.0, price: 1200000000, price_per_py: 88000000,
        client_name: '박철수', client_phone: '010-3456-7890',
        memo: '잠실 메인 상권, 유동인구 최상급',
      },
      {
        recv_date: '2026-02-20', category: '아파트',
        road_addr: '경기도 성남시 분당구 정자일로 95', lot_addr: '경기도 성남시 분당구 정자동',
        zoning: '2종일반주거', floor_this: '15', floor_g: '25',
        bldg_area: 84.7, price: 650000000, price_per_py: 25000000,
        client_name: '최지훈', client_phone: '010-4567-8901',
        memo: '분당 정자역 초근접, 학군 우수',
      },
      {
        recv_date: '2026-02-25', category: '오피스텔',
        road_addr: '서울시 서초구 반포대로 201', lot_addr: '서울시 서초구 반포동 1',
        zoning: '상업지역', floor_this: '7', floor_g: '18',
        bldg_area: 26.4, price: 580000000, price_per_py: 72000000,
        client_name: '정수민', client_phone: '010-5678-9012',
        memo: '반포자이 인근, 한강뷰',
      },
    ];
    for (const s of salesSamples) {
      await db.execute({
        sql: `INSERT INTO sales_listings
          (scope, created_at, updated_at, recv_date, category, road_addr, lot_addr,
           zoning, floor_this, floor_g, bldg_area, price, price_per_py,
           client_name, client_phone, memo)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: ['demo', now, now,
          s.recv_date, s.category, s.road_addr, s.lot_addr,
          s.zoning, s.floor_this, s.floor_g, s.bldg_area, s.price, s.price_per_py,
          s.client_name, s.client_phone, s.memo],
      });
    }
  }

  // ─── 상가 샘플 5건 ──────────────────────────────────────
  const shopCount = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM shop_listings WHERE scope = ?',
    args: ['demo'],
  });
  if (Number((shopCount.rows[0] as unknown as { cnt: number }).cnt) === 0) {
    const shopSamples = [
      {
        recv_date: '2026-02-08', type: '근린상가', brand: '카페 예정',
        addr: '서울시 강남구 테헤란로 154', floor_this: '1', floors_total: '8',
        area_lease_m2: 66.0, area_lease_py: 20.0, deposit: 50000000, monthly: 3500000,
        client_name: '이강민', client_phone: '010-6789-0123',
        memo: '테헤란로 메인, 유동인구 최상',
      },
      {
        recv_date: '2026-02-12', type: '음식점', brand: '한식당',
        addr: '서울시 마포구 어울마당로 31', floor_this: '1', floors_total: '5',
        area_lease_m2: 99.0, area_lease_py: 30.0, deposit: 30000000, monthly: 2800000,
        client_name: '윤지영', client_phone: '010-7890-1234',
        memo: '홍대입구역 5분, 유동인구 다수',
      },
      {
        recv_date: '2026-02-16', type: '판매시설', brand: '의류매장',
        addr: '서울시 중구 명동길 14', floor_this: '1', floors_total: '6',
        area_lease_m2: 49.5, area_lease_py: 15.0, deposit: 100000000, monthly: 8000000,
        client_name: '한상우', client_phone: '010-8901-2345',
        memo: '명동 황금 상권, 외국인 관광객 多',
      },
      {
        recv_date: '2026-02-22', type: '근린상가', brand: '편의점',
        addr: '경기도 수원시 팔달구 정조로 800', floor_this: '1', floors_total: '4',
        area_lease_m2: 66.0, area_lease_py: 20.0, deposit: 20000000, monthly: 1500000,
        client_name: '오미래', client_phone: '010-9012-3456',
        memo: '수원 인계동 중심가, 주거밀집지역',
      },
      {
        recv_date: '2026-02-26', type: '사무실', brand: '',
        addr: '서울시 영등포구 의사당대로 82', floor_this: '10', floors_total: '20',
        area_lease_m2: 132.0, area_lease_py: 40.0, deposit: 50000000, monthly: 4200000,
        client_name: '서준혁', client_phone: '010-0123-4567',
        memo: '여의도 금융가, IFC몰 인근',
      },
    ];
    for (const s of shopSamples) {
      await db.execute({
        sql: `INSERT INTO shop_listings
          (scope, created_at, updated_at, recv_date, type, brand, addr,
           floor_this, floors_total, area_lease_m2, area_lease_py,
           deposit, monthly, client_name, client_phone, memo)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: ['demo', now, now,
          s.recv_date, s.type, s.brand, s.addr,
          s.floor_this, s.floors_total, s.area_lease_m2, s.area_lease_py,
          s.deposit, s.monthly, s.client_name, s.client_phone, s.memo],
      });
    }
  }

  // ─── 전월세 샘플 5건 ────────────────────────────────────
  const rentalCount = await db.execute({
    sql: 'SELECT COUNT(*) as cnt FROM oneroom_listings WHERE scope = ?',
    args: ['demo'],
  });
  if (Number((rentalCount.rows[0] as unknown as { cnt: number }).cnt) === 0) {
    const rentalSamples = [
      {
        recv_date: '2026-02-05', category: '월세',
        building: '역삼 e-편한세상', addr: '서울시 강남구 역삼동 735', unit_no: '305호',
        deposit: 5000000, monthly: 950000,
        client_name: '김나은', client_phone: '010-1111-2222',
        memo: '강남역 5분, 풀옵션',
      },
      {
        recv_date: '2026-02-09', category: '전세',
        building: '합정 두산위브', addr: '서울시 마포구 합정동 404', unit_no: '801호',
        deposit: 280000000, monthly: 0,
        client_name: '박도윤', client_phone: '010-2222-3333',
        memo: '합정역 2분, 신축급',
      },
      {
        recv_date: '2026-02-13', category: '월세',
        building: '불광 현대', addr: '서울시 은평구 불광동 12', unit_no: '201호',
        deposit: 10000000, monthly: 650000,
        client_name: '최아름', client_phone: '010-3333-4444',
        memo: '불광역 7분, 관리비 5만원',
      },
      {
        recv_date: '2026-02-17', category: '전세',
        building: '일산 라페스타 인근', addr: '경기도 고양시 일산동구 정발산동', unit_no: '602호',
        deposit: 200000000, monthly: 0,
        client_name: '이현우', client_phone: '010-4444-5555',
        memo: '정발산역 3분, 학군 우수',
      },
      {
        recv_date: '2026-02-21', category: '월세',
        building: '성수 SK V1', addr: '서울시 성동구 성수동1가 668', unit_no: '1104호',
        deposit: 3000000, monthly: 1100000,
        client_name: '정유진', client_phone: '010-5555-6666',
        memo: '성수역 도보 3분, 카페거리 인근',
      },
    ];
    for (const s of rentalSamples) {
      await db.execute({
        sql: `INSERT INTO oneroom_listings
          (scope, created_at, updated_at, recv_date, category, building, addr, unit_no,
           deposit, monthly, client_name, client_phone, memo)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: ['demo', now, now,
          s.recv_date, s.category, s.building, s.addr, s.unit_no,
          s.deposit, s.monthly, s.client_name, s.client_phone, s.memo],
      });
    }
  }
}
