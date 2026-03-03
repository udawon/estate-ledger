// ─── 분석 요청 ────────────────────────────────────────
export interface AnalysisRequest {
  address: string;
  lat?: number;  // 서버에서 Nominatim 지오코딩으로 자동 산출
  lng?: number;
}

// ─── 점수 등급 ─────────────────────────────────────────
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// ─── 카테고리별 점수 ───────────────────────────────────
export interface CategoryScore {
  score: number;      // 0–100
  grade: Grade;
  label: string;      // 예: "교통 접근성"
  details: string[];  // 세부 항목 설명
  weight: number;     // 가중치 (합계 = 1.0)
}

// ─── 종합 분석 결과 ────────────────────────────────────
export interface AnalysisResult {
  id: string;
  address: string;
  district: string;    // 분석된 행정구 (예: "강남구")
  lat: number;         // 위도 (지도 표시용)
  lng: number;         // 경도 (지도 표시용)
  totalScore: number;       // 패널티 적용 전 raw 합산 점수
  penaltyScore: number;     // 패널티 점수 (0 이하, 최소 -30)
  penaltyReasons: string[]; // 패널티 이유 목록 (UI 표시용)
  finalScore: number;       // clamp(totalScore + penaltyScore, 0, 100)
  grade: Grade;             // finalScore 기준 등급
  categories: {
    transport:   CategoryScore;  // A. 교통 (20%)
    jobDemand:   CategoryScore;  // B. 일자리·수요 (15%)
    living:      CategoryScore;  // C. 생활인프라 (15%)
    education:   CategoryScore;  // D. 교육 (15%)
    envRisk:     CategoryScore;  // E. 환경위험 (15%)
    futureValue: CategoryScore;  // F. 미래가치 (10%)
    supply:      CategoryScore;  // G. 상품·공급 (10%)
  };
  summary: string;              // 한 줄 요약 문구
  analyzedAt: string;           // ISO 8601
  tradeSummary?: TradeSummary;  // 실거래가 (조회 실패 시 undefined)
}

// ─── 실거래가 단건 기록 ─────────────────────────────────
export interface TradeRecord {
  aptName: string;    // 아파트명
  area: number;       // 전용면적 (㎡)
  floor: number;      // 층
  price: number;      // 거래금액 (만원)
  yearMonth: string;  // 거래연월 (YYYY-MM)
  dong: string;       // 법정동
}

// ─── 실거래가 요약 ──────────────────────────────────────
export interface TradeSummary {
  district: string;            // 행정구 (예: "강남구")
  dong: string;                // 법정동 (예: "역삼동")
  aptName?: string;            // 특정 단지명 (좌표 인근 단지 필터 시 설정)
  avgPricePerPyeong: number;   // 3.3㎡당 평균가 (만원)
  avg84Price: number;          // 84㎡ 기준 환산가 (만원)
  recentTrades: TradeRecord[]; // 최근 거래 사례 (최대 5건)
  totalCount: number;          // 최근 3개월 총 거래 건수
  trend: 'up' | 'down' | 'flat'; // 시세 추세
  monthRange: string;          // 조회 기간 (예: "2025.11 ~ 2026.01")
}

// ─── API 응답 래퍼 ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── 등급 설정 (점수 기준 + 색상) ─────────────────────
export const GRADE_CONFIG: Record<Grade, { label: string; color: string; min: number }> = {
  A: { label: '최우수', color: '#22c55e', min: 90 },
  B: { label: '우수',   color: '#84cc16', min: 75 },
  C: { label: '보통',   color: '#eab308', min: 60 },
  D: { label: '미흡',   color: '#f97316', min: 40 },
  F: { label: '불량',   color: '#ef4444', min: 0  },
};

// ─── 카테고리 가중치 (location_engine_live.md 준수) ───────
export const CATEGORY_WEIGHTS = {
  transport:   0.20,  // A. 교통        20%
  jobDemand:   0.15,  // B. 일자리·수요 15%
  living:      0.15,  // C. 생활인프라  15%
  education:   0.15,  // D. 교육        15%
  envRisk:     0.15,  // E. 환경위험    15%
  futureValue: 0.10,  // F. 미래가치    10%
  supply:      0.10,  // G. 상품·공급   10%
} as const;
