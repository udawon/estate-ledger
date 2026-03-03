// ─── 매물 공통 기반 ────────────────────────────────────
interface BaseListingRow {
  id: number;
  created_at: string;
  updated_at: string;
}

// ─── 매매 매물 ─────────────────────────────────────────
export interface SaleListing extends BaseListingRow {
  recv_date: string;       // 접수일
  category: string;        // 구분
  road_addr: string;       // 도로명 주소
  lot_addr: string;        // 주소지
  source: string;          // 경로
  zoning: string;          // 용도지역
  floor_this: string;      // 해당층
  floor_b: string;         // 층(지하)
  floor_g: string;         // 층(지상)
  built_year: number | null;
  built_date: string;
  park_self: number | null;
  park_mech: number | null;
  elevator: string;
  land_m2: number | null;
  land_py: number | null;
  bldg_area: number | null;
  price: number | null;       // 매가
  price_per_py: number | null;
  net_invest: number | null;
  deposit: number | null;
  subtotal: number | null;
  monthly: number | null;
  mng_fee: number | null;
  yield_cur: number | null;
  client_name: string;
  client_phone: string;
  carrier: string;
  memo: string;
}

// ─── 상가 매물 ─────────────────────────────────────────
export interface ShopListing extends BaseListingRow {
  recv_date: string;
  type: string;            // 종류
  brand: string;           // 상호
  zoning: string;
  addr: string;
  built_year: number | null;
  floor_this: string;
  floors_total: string;
  area_lease_m2: number | null;
  area_lease_py: number | null;
  area_net_m2: number | null;
  area_net_py: number | null;
  fuel: string;
  subtotal: number | null;
  deposit: number | null;
  premium: number | null;   // 권리금
  subtotal2: number | null;
  monthly: number | null;
  vat: number | null;
  mng_fee: number | null;
  rent_per_py: number | null;
  mng_per_py: number | null;
  client_name: string;
  client_phone: string;
  carrier: string;
  memo: string;
}

// ─── 전월세 매물 ───────────────────────────────────────
export interface RentalListing extends BaseListingRow {
  recv_date: string;
  category: string;        // 전월세구분(월세/전세)
  building: string;        // 건물구분
  addr: string;
  unit_no: string;         // 호수
  door_pw: string;         // 비밀번호
  contract_date: string;
  move_in_date: string;
  confirm_date: string;
  deposit: number | null;
  monthly: number | null;
  mng_fee: number | null;
  lessor: string;          // 임대인
  lessee: string;          // 임차인
  move_in: string;         // 입주상태
  client_name: string;
  client_phone: string;
  carrier: string;
  memo: string;
}

// ─── 폼 입력용 타입 (id, created_at, updated_at 제외) ──
export type SaleListingInput = Omit<SaleListing, 'id' | 'created_at' | 'updated_at'>;
export type ShopListingInput = Omit<ShopListing, 'id' | 'created_at' | 'updated_at'>;
export type RentalListingInput = Omit<RentalListing, 'id' | 'created_at' | 'updated_at'>;

// ─── 목록 필터 ─────────────────────────────────────────
export interface ListingFilter {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
