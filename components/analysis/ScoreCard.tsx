// ─── 점수 표시 카드 컴포넌트 ─────────────────────────────────
// 종합 점수 + 7카테고리별 Progress bar 표시

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisResult } from '@/types';
import { GRADE_CONFIG } from '@/types';

/** Props 타입 */
interface ScoreCardProps {
  result: AnalysisResult;
}

/** 카테고리 표시 순서 (7카테고리 v4) */
const categoryOrder = [
  'transport', 'jobDemand', 'living', 'education', 'envRisk', 'futureValue', 'supply',
] as const;

/**
 * ScoreCard 컴포넌트
 * - 종합 점수와 등급을 크게 표시
 * - 4개 카테고리를 Progress bar로 시각화
 * - GRADE_CONFIG 색상 사용
 */
export default function ScoreCard({ result }: ScoreCardProps) {
  const gradeConfig = GRADE_CONFIG[result.grade];

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-slate-900 text-lg font-semibold">
          종합 입지 점수
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 종합 점수 영역 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl">
          {/* 점수 숫자 */}
          <div className="text-center sm:text-left">
            <div
              className="text-5xl font-bold leading-none"
              style={{ color: gradeConfig.color }}
            >
              {result.finalScore}
            </div>
            <div className="text-slate-400 text-sm mt-1">/ 100점</div>
          </div>

          {/* 등급 뱃지 + 주소 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                className="text-sm font-bold px-3 py-1"
                style={{
                  backgroundColor: gradeConfig.color,
                  color: '#fff',
                }}
              >
                {result.grade}등급
              </Badge>
              <span className="text-slate-600 text-sm font-medium">
                {gradeConfig.label}
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>

        {/* 카테고리별 점수 Progress */}
        <div className="space-y-4">
          {categoryOrder.map((key) => {
            const category = result.categories[key];
            const catGradeConfig = GRADE_CONFIG[category.grade];

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {category.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-0.5 font-semibold"
                      style={{
                        borderColor: catGradeConfig.color,
                        color: catGradeConfig.color,
                      }}
                    >
                      {category.grade}
                    </Badge>
                    <span
                      className="font-bold"
                      style={{ color: catGradeConfig.color }}
                    >
                      {category.score}점
                    </span>
                  </div>
                </div>
                <Progress
                  value={category.score}
                  className="h-2 bg-slate-100"
                />
              </div>
            );
          })}
        </div>

        {/* 분석 시각 */}
        <p className="text-xs text-slate-400 text-right">
          분석일시: {new Date(result.analyzedAt).toLocaleString('ko-KR')}
        </p>
      </CardContent>
    </Card>
  );
}
