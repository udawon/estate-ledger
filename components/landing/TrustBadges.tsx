// ─── 신뢰 지표 배지 섹션 ─────────────────────────────────────
// 공공 API 실측 강점을 간결하게 표시하는 배너

import { Database, MapPin, BarChart2, Clock, Zap } from 'lucide-react';

/** 신뢰 지표 배지 데이터 타입 */
interface TrustBadge {
  icon: React.ReactNode;
  label: string;
}

/** 5개 신뢰 지표 */
const badges: TrustBadge[] = [
  {
    icon: <Database className="w-4 h-4" />,
    label: '공공 API 5종 연동',
  },
  {
    icon: <MapPin className="w-4 h-4" />,
    label: '서울시 실측 데이터',
  },
  {
    icon: <BarChart2 className="w-4 h-4" />,
    label: 'KOSIS 통계청',
  },
  {
    icon: <Clock className="w-4 h-4" />,
    label: '90일 자동 캐시',
  },
  {
    icon: <Zap className="w-4 h-4" />,
    label: '30초 분석 완료',
  },
];

/**
 * TrustBadges 컴포넌트
 * - Features 섹션 아래 위치
 * - 공공 데이터 실측 강점 5종 배지
 * - 반응형: 모바일 2열 → sm 3열 → lg 5열 수평
 */
export default function TrustBadges() {
  return (
    <section className="py-10 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4">
        {/* 섹션 라벨 */}
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">
          공공 데이터 기반 실측 분석
        </p>

        {/* 배지 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-50 border border-slate-100"
            >
              <span className="text-blue-500 shrink-0">{badge.icon}</span>
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
