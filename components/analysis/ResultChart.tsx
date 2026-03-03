// ─── 레이더 차트 컴포넌트 ────────────────────────────────────
// recharts RadarChart로 7개 카테고리 점수 시각화

'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisResult } from '@/types';

/** Props 타입 */
interface ResultChartProps {
  result: AnalysisResult;
}

/** 차트 데이터 포인트 타입 */
interface ChartDataPoint {
  subject: string;
  score: number;
  fullMark: number;
}

/** 커스텀 툴팁 Props 타입 */
interface TooltipPayloadItem {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

/** 커스텀 툴팁 컴포넌트 */
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    return (
      <div className="bg-white border border-slate-200 shadow-md rounded-lg px-3 py-2 text-sm">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        <p className="text-blue-600 font-bold">{payload[0].value}점</p>
      </div>
    );
  }
  return null;
}

/**
 * ResultChart 컴포넌트
 * - recharts RadarChart로 7개 카테고리 점수 시각화
 * - 반응형: ResponsiveContainer 사용
 */
export default function ResultChart({ result }: ResultChartProps) {
  // 7카테고리 차트 데이터 변환
  const chartData: ChartDataPoint[] = [
    { subject: result.categories.transport.label,   score: result.categories.transport.score,   fullMark: 100 },
    { subject: result.categories.jobDemand.label,   score: result.categories.jobDemand.score,   fullMark: 100 },
    { subject: result.categories.living.label,      score: result.categories.living.score,      fullMark: 100 },
    { subject: result.categories.education.label,   score: result.categories.education.score,   fullMark: 100 },
    { subject: result.categories.envRisk.label,     score: result.categories.envRisk.score,     fullMark: 100 },
    { subject: result.categories.futureValue.label, score: result.categories.futureValue.score, fullMark: 100 },
    { subject: result.categories.supply.label,      score: result.categories.supply.score,      fullMark: 100 },
  ];

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-slate-900 text-lg font-semibold">
          카테고리별 분석 차트
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* 레이더 차트 */}
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              {/* 방사형 그리드 */}
              <PolarGrid stroke="#e2e8f0" />

              {/* 카테고리 축 레이블 */}
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              />

              {/* 반경 축 (0~100) */}
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickCount={5}
              />

              {/* 데이터 레이더 */}
              <Radar
                name="점수"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.25}
                strokeWidth={2}
              />

              {/* 툴팁 */}
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap justify-center gap-4 mt-3">
          {chartData.map((item) => (
            <div key={item.subject} className="flex items-center gap-1.5 text-sm text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>{item.subject}: {item.score}점</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
