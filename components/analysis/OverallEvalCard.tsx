// ─── 종합평가 카드 ────────────────────────────────────────────
// 7카테고리 점수 프로파일 기반 강점·주의사항·추천 대상 도출

'use client';

import { CheckCircle2, AlertCircle, Users2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisResult } from '@/types';

interface Props {
  result: AnalysisResult;
}

/** 카테고리 키 → 표시명 */
const CAT_LABEL: Record<string, string> = {
  transport:   '교통 접근성',
  jobDemand:   '일자리·수요',
  living:      '생활인프라',
  education:   '교육',
  envRisk:     '환경위험',
  futureValue: '미래가치',
  supply:      '상품·공급',
};

/** 점수 프로파일 기반 추천 대상 도출 */
function getRecommendedTypes(
  result: AnalysisResult,
): { label: string; reason: string }[] {
  const c = result.categories;
  const types: { label: string; reason: string }[] = [];

  if (c.transport.score >= 70 && c.jobDemand.score >= 60)
    types.push({ label: '직장인·1인 가구', reason: '교통·업무 접근성 우수' });

  if (c.education.score >= 65 && c.living.score >= 60)
    types.push({ label: '신혼부부·자녀가구', reason: '교육·생활인프라 양호' });

  if (c.futureValue.score >= 65 && result.finalScore >= 65)
    types.push({ label: '투자 목적', reason: '미래가치 상승 가능성' });

  if (c.envRisk.score >= 70 && c.living.score >= 65)
    types.push({ label: '실거주 안정형', reason: '환경·안전·생활 균형' });

  return types;
}

export default function OverallEvalCard({ result }: Props) {
  // 강점: 점수 내림차순 top 3, 55점 이상만
  const strengths = Object.entries(result.categories)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3)
    .filter(([, c]) => c.score >= 55);

  // 주의사항: 점수 오름차순 top 2, 60점 미만만
  const weaknesses = Object.entries(result.categories)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 2)
    .filter(([, c]) => c.score < 60);

  const recommendedTypes = getRecommendedTypes(result);
  const hasWarnings = weaknesses.length > 0 || result.penaltyReasons.length > 0;

  return (
    <Card className="border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
          <span>종합평가</span>
          <span className="text-sm font-bold text-indigo-600">{result.finalScore}점</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* 추천 대상 */}
        {recommendedTypes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <Users2 className="w-3.5 h-3.5" />
              추천 대상
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommendedTypes.map((t) => (
                <span
                  key={t.label}
                  title={t.reason}
                  className="text-xs font-medium text-indigo-700 bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-full"
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 강점 */}
        {strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              강점
            </p>
            <ul className="space-y-1.5">
              {strengths.map(([key, cat]) => (
                <li key={key} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{CAT_LABEL[key] ?? cat.label}</span>
                  <span className="text-xs font-bold text-emerald-600">{cat.score}점</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 주의사항 */}
        {hasWarnings ? (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              주의사항
            </p>
            <ul className="space-y-1.5">
              {weaknesses.map(([key, cat]) => (
                <li key={key} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{CAT_LABEL[key] ?? cat.label}</span>
                  <span className="text-xs font-bold text-orange-500">{cat.score}점</span>
                </li>
              ))}
              {result.penaltyReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-sm text-orange-600">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          /* 패널티·약점 없으면 긍정 메시지 */
          <p className="text-sm text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            모든 항목에서 양호한 수준을 유지합니다.
          </p>
        )}

      </CardContent>
    </Card>
  );
}
