// ─── 실거래가 카드 컴포넌트 ──────────────────────────────────
// 국토부 실거래가 API 데이터 표시

import { TrendingUp, TrendingDown, Minus, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TradeSummary } from '@/types';

interface TradePriceCardProps {
  tradeSummary: TradeSummary;
}

/** 추세 아이콘·색상 */
function TrendBadge({ trend }: { trend: TradeSummary['trend'] }) {
  if (trend === 'up') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
        <TrendingUp className="w-3 h-3" />
        상승
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
        <TrendingDown className="w-3 h-3" />
        하락
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
      <Minus className="w-3 h-3" />
      보합
    </Badge>
  );
}

/** 가격 포맷: 만원 → "X억 Y천만원" */
function formatPrice(priceWan: number): string {
  if (priceWan === 0) return '정보 없음';
  const eok = Math.floor(priceWan / 10000);
  const cheon = Math.round((priceWan % 10000) / 1000);
  if (eok === 0) return `${priceWan.toLocaleString()}만원`;
  if (cheon === 0) return `${eok}억`;
  return `${eok}억 ${cheon}천만원`;
}

export default function TradePriceCard({ tradeSummary }: TradePriceCardProps) {
  const {
    district,
    dong,
    aptName,
    avgPricePerPyeong,
    avg84Price,
    recentTrades,
    totalCount,
    trend,
    monthRange,
  } = tradeSummary;

  // 카드 제목: 단지명 필터 적용됐으면 단지명 표시, 아니면 동 기준
  const cardTitle = aptName ?? '아파트 실거래가';
  const scopeLabel = aptName ? `${dong} · 단지 기준` : `${district} ${dong}`;

  // 데이터 없음 처리
  if (totalCount === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            아파트 실거래가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            {monthRange} 기간 내 인근 아파트 거래 데이터가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            {cardTitle}
          </div>
          <TrendBadge trend={trend} />
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          {scopeLabel} · {monthRange} · {totalCount}건
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 평균가 요약 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">평당 평균가</p>
            <p className="text-lg font-bold text-slate-900">
              {avgPricePerPyeong.toLocaleString()}
              <span className="text-xs font-normal text-slate-500 ml-1">만원/평</span>
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">84㎡ 환산가</p>
            <p className="text-lg font-bold text-blue-700">
              {formatPrice(avg84Price)}
            </p>
          </div>
        </div>

        {/* 최근 거래 사례 */}
        {recentTrades.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              최근 거래 사례
            </h4>
            <ul className="space-y-2">
              {recentTrades.map((trade, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 truncate block">
                      {trade.aptName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {trade.area}㎡ · {trade.floor}층 · {trade.yearMonth}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 shrink-0 ml-3">
                    {formatPrice(trade.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
