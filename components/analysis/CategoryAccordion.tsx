// ─── 카테고리 아코디언 ─────────────────────────────────────────
// 7카테고리 + 종합평가를 점수바 + 접을 수 있는 행으로 표시

'use client';

import { useState } from 'react';
import { ChevronRight, CheckCircle2, AlertCircle, Users2 } from 'lucide-react';
import type { AnalysisResult } from '@/types';

interface Props {
  result: AnalysisResult;
}

/** 카테고리 아이콘 */
const CAT_ICONS: Record<string, string> = {
  transport:   '🚇',
  jobDemand:   '💼',
  living:      '🏪',
  education:   '📚',
  envRisk:     '🛡️',
  futureValue: '📈',
  supply:      '🏠',
};

/** 카테고리 표시 순서 */
const CATEGORY_ORDER = [
  'transport', 'jobDemand', 'living', 'education', 'envRisk', 'futureValue', 'supply',
] as const;

/** 점수별 진행바 색상 */
function barColor(score: number): string {
  if (score >= 75) return 'bg-emerald-400';
  if (score >= 60) return 'bg-indigo-400';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-red-400';
}

/** 등급 배지 스타일 */
function gradeStyle(grade: string): string {
  const map: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    B: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    C: 'bg-amber-100 text-amber-700 border-amber-200',
    D: 'bg-orange-100 text-orange-700 border-orange-200',
    F: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[grade] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

/** 종합평가 — 추천 대상 도출 */
function getRecommendedTypes(result: AnalysisResult): { label: string; reason: string }[] {
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

export default function CategoryAccordion({ result }: Props) {
  // 기본으로 열려있을 항목: 없음 (null)
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenKey((prev) => (prev === key ? null : key));

  // 종합평가 데이터
  const strengths = Object.entries(result.categories)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3)
    .filter(([, c]) => c.score >= 55);

  const weaknesses = Object.entries(result.categories)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 2)
    .filter(([, c]) => c.score < 60);

  const recommendedTypes = getRecommendedTypes(result);
  const hasWarnings = weaknesses.length > 0 || result.penaltyReasons.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">카테고리별 상세 분석</h2>
        <p className="text-xs text-slate-400 mt-0.5">항목을 클릭하면 세부 내용을 확인할 수 있습니다.</p>
      </div>

      {/* 7카테고리 아코디언 행 */}
      {CATEGORY_ORDER.map((key, idx) => {
        const cat = result.categories[key];
        const isOpen = openKey === key;
        const isLast = idx === CATEGORY_ORDER.length - 1;

        return (
          <div key={key} className={!isLast ? 'border-b border-slate-100' : ''}>
            {/* 접힌 헤더 행 */}
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
            >
              {/* 아이콘 */}
              <span className="text-xl shrink-0 w-7 text-center">{CAT_ICONS[key]}</span>

              {/* 이름 */}
              <span className="text-sm font-medium text-slate-700 w-24 shrink-0">
                {cat.label}
              </span>

              {/* 점수 바 */}
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(cat.score)}`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>

              {/* 점수 숫자 */}
              <span className="text-sm font-bold text-slate-800 w-10 text-right shrink-0">
                {cat.score}점
              </span>

              {/* 등급 배지 */}
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded border w-8 text-center shrink-0 ${gradeStyle(cat.grade)}`}
              >
                {cat.grade}
              </span>

              {/* 화살표 */}
              <ChevronRight
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {/* 펼쳐진 세부 내용 */}
            {isOpen && (
              <div className="px-5 pb-4 pt-1 bg-slate-50/60">
                <ul className="space-y-2 pl-10">
                  {cat.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      {/* 종합평가 행 — 구분선 + 특별 스타일 */}
      <div className="border-t-2 border-indigo-100">
        <button
          onClick={() => toggle('overall')}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-indigo-50/40 transition-colors text-left bg-indigo-50/20"
        >
          <span className="text-xl shrink-0 w-7 text-center">⭐</span>

          <span className="text-sm font-semibold text-indigo-700 w-24 shrink-0">
            종합평가
          </span>

          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(result.finalScore)}`}
              style={{ width: `${result.finalScore}%` }}
            />
          </div>

          <span className="text-sm font-bold text-indigo-700 w-10 text-right shrink-0">
            {result.finalScore}점
          </span>

          <span className={`text-xs font-bold px-2 py-0.5 rounded border w-8 text-center shrink-0 ${gradeStyle(result.grade)}`}>
            {result.grade}
          </span>

          <ChevronRight
            className={`w-4 h-4 text-indigo-400 shrink-0 transition-transform duration-200 ${openKey === 'overall' ? 'rotate-90' : ''}`}
          />
        </button>

        {/* 종합평가 펼쳐진 내용 */}
        {openKey === 'overall' && (
          <div className="px-5 pb-5 pt-2 bg-indigo-50/30 space-y-4">
            {/* 추천 대상 */}
            {recommendedTypes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                  <Users2 className="w-3.5 h-3.5" />
                  추천 대상
                </p>
                <div className="flex flex-wrap gap-1.5 pl-1">
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
                <ul className="space-y-1.5 pl-1">
                  {strengths.map(([key, cat]) => (
                    <li key={key} className="flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span>{CAT_ICONS[key]}</span>
                        {cat.label}
                      </span>
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
                <ul className="space-y-1.5 pl-1">
                  {weaknesses.map(([key, cat]) => (
                    <li key={key} className="flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span>{CAT_ICONS[key]}</span>
                        {cat.label}
                      </span>
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
              <p className="text-sm text-emerald-600 flex items-center gap-1.5 pl-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                모든 항목에서 양호한 수준을 유지합니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
