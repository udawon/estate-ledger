-- ===== New Ledgers (if not exists) =====
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT, updated_at TEXT,
  status TEXT, source TEXT,
  client_name TEXT, client_phone TEXT, carrier TEXT,
  property_type TEXT, address TEXT, building_name TEXT,
  area_m2 REAL, floor TEXT, trade_type TEXT,
  price INTEGER, deposit INTEGER, monthly_rent INTEGER, maintenance_fee INTEGER,
  available_from TEXT, approval_date TEXT,
  exclusive INTEGER, memo TEXT
);
CREATE INDEX IF NOT EXISTS idx_listings_phone ON listings(client_phone);
CREATE INDEX IF NOT EXISTS idx_listings_addr  ON listings(address);

CREATE TABLE IF NOT EXISTS sales_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT, updated_at TEXT,
  recv_date TEXT,                 -- 접수일
  category TEXT,                  -- 구분
  road_addr TEXT,                 -- 도로명 주소
  lot_addr TEXT,                  -- 주소지
  source TEXT,                    -- 경로
  zoning TEXT,                    -- 용도지역
  floor_this TEXT,                -- 해당층
  floor_b TEXT,                   -- 층(지하)
  floor_g TEXT,                   -- 층(지상)
  built_year INTEGER,             -- 건축년도
  built_date TEXT,                -- 건축년월일 (YYYY-MM-DD)
  park_self INTEGER,              -- 주차(자주)
  park_mech INTEGER,              -- 주차(기계)
  elevator TEXT,                  -- 엘레베이터
  land_m2 REAL,                   -- 토지(m²)
  land_py REAL,                   -- 토지(평)
  bldg_area REAL,                 -- 건평
  price INTEGER,                  -- 매가
  price_per_py INTEGER,           -- 평당매매가
  net_invest INTEGER,             -- 순투자금
  deposit INTEGER,                -- 보증금
  subtotal INTEGER,               -- 소계
  monthly INTEGER,                -- 월세
  mng_fee INTEGER,                -- 관리비
  yield_cur REAL,                 -- 현 수익율
  client_name TEXT,               -- 성명
  client_phone TEXT,              -- 연락처
  carrier TEXT,                   -- 통신사
  memo TEXT                       -- 비고
);

CREATE TABLE IF NOT EXISTS shop_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT, updated_at TEXT,
  recv_date TEXT,                 -- 접수일
  type TEXT,                      -- 종류
  brand TEXT,                     -- 상호
  zoning TEXT,                    -- 용도지역
  addr TEXT,                      -- 주소지
  built_year INTEGER,             -- 건축년도
  floor_this TEXT,                -- 해당층
  floors_total TEXT,              -- 전체층
  area_lease_m2 REAL,             -- 계약면적(㎡)
  area_lease_py REAL,             -- 계약면적(평)
  area_net_m2 REAL,               -- 실면적(㎡)
  area_net_py REAL,               -- 실면적(평)
  fuel TEXT,                      -- 연료
  subtotal INTEGER,               -- 소계
  deposit INTEGER,                -- 보증금
  premium INTEGER,                -- 권리
  subtotal2 INTEGER,              -- 소계2
  monthly INTEGER,                -- 월세
  vat INTEGER,                    -- VAT
  mng_fee INTEGER,                -- 관리
  rent_per_py INTEGER,            -- 평당 임대료
  mng_per_py INTEGER,             -- 평당 관리비
  client_name TEXT,               -- 성명
  client_phone TEXT,              -- 연락처
  carrier TEXT,                   -- 통신사
  memo TEXT                       -- 비고
);

CREATE TABLE IF NOT EXISTS oneroom_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT, updated_at TEXT,
  recv_date TEXT,                 -- 접수일
  category TEXT,                  -- 전월세구분(월세/전세)
  building TEXT,                  -- 건물구분
  addr TEXT,                      -- 주소
  unit_no TEXT,                   -- 호수
  door_pw TEXT,                   -- 비밀번호
  contract_date TEXT,             -- 계약일자 (YYYY-MM-DD)
  move_in_date TEXT,              -- 전입일자 (YYYY-MM-DD)
  confirm_date TEXT,              -- 확정일자 (YYYY-MM-DD)
  deposit INTEGER,                -- 보증금
  monthly INTEGER,                -- 월세
  mng_fee INTEGER,                -- 관리비
  lessor TEXT,                    -- 임대인
  lessee TEXT,                    -- 임차인
  move_in TEXT,                   -- 입주상태(문자열)
  client_name TEXT,               -- 성명
  client_phone TEXT,              -- 연락처
  carrier TEXT,                   -- 통신사
  memo TEXT                       -- 비고
);

CREATE INDEX IF NOT EXISTS idx_sales_phone ON sales_listings(client_phone);
CREATE INDEX IF NOT EXISTS idx_shop_phone  ON shop_listings(client_phone);
CREATE INDEX IF NOT EXISTS idx_or_phone    ON oneroom_listings(client_phone);
