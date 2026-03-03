// ─── API 사용량 현황 배너 컴포넌트 ───────────────────────────
// 분석 결과에 사용된 외부 API의 무료 한도와 실측/추정 여부를 표시

import { Info, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisResult } from '@/types';

// ─── API 한도 상수 ────────────────────────────────────────────
// 업무지구 접근: 자체 알고리즘 (외부 API 불필요)
// 서울시 침수흔적도: 일 1,000회 (실질 무제한, 7일 캐시)
// 에어코리아: 1,000회/일 (실질 무제한)
// 건축물대장: 1,000회/일 (실질 무제한)
const API_SPECS = [
  {
    id:           'transit',
    name:         '업무지구 접근 시간',
    provider:     '자체 알고리즘',
    dailyLimit:   null,          // API 한도 없음
    limitLabel:   '무제한',
    isLow:        false,
    // 업무지구 접근 시간은 항상 추정값 (외부 API 미사용)
    detectActual: (_r: AnalysisResult) => false,
    actualLabel:   '',
    fallbackLabel: '서울 지하철 통계 기반 추정',
    note: '직선거리 + 서울 지하철 평균 속도 계수 적용 (고정비용 7분 + 3.0~3.5분/km)',
  },
  {
    id:           'flood',
    name:         '서울시 침수흔적도',
    provider:     '서울 열린데이터광장',
    dailyLimit:   1000,
    limitLabel:   '1,000회 / 일',
    isLow:        false,
    detectActual: (r: AnalysisResult) =>
      r.categories.envRisk.details.some(d => d.includes('서울시 실측')),
    actualLabel:   '침수흔적도 실측 (7일 캐시)',
    fallbackLabel: 'district 추정 (API 미사용)',
    note:          '7일 캐시 적용 — 실질 무제한',
  },
  {
    id:           'airkorea',
    name:         '에어코리아 PM2.5',
    provider:     '공공데이터포털',
    dailyLimit:   1000,
    limitLabel:   '1,000회 / 일',
    isLow:        false,
    detectActual: (r: AnalysisResult) =>
      r.categories.envRisk.details.some(d => d.includes('에어코리아') && d.includes('실측')),
    actualLabel:   '에어코리아 실측 (6시간 캐시)',
    fallbackLabel: 'district 기본값 (API 미사용)',
    note:          '6시간 캐시 적용 — 실질 무제한',
  },
  {
    id:           'building',
    name:         '건축물대장',
    provider:     '공공데이터포털',
    dailyLimit:   1000,
    limitLabel:   '1,000회 / 일',
    isLow:        false,
    detectActual: (r: AnalysisResult) =>
      r.categories.supply.details.some(d => d.includes('건축물대장 실측')),
    actualLabel:   '건축물대장 실측 (30일 캐시)',
    fallbackLabel: 'district 추정 (API 미사용)',
    note:          '30일 캐시 적용 — 실질 무제한',
  },
  {
    id:           'kosis',
    name:         'KOSIS 지역소득통계',
    provider:     '통계청',
    dailyLimit:   1000,
    limitLabel:   '1,000회 / 일',
    isLow:        false,
    detectActual: (r: AnalysisResult) =>
      r.categories.jobDemand.details.some(d => d.includes('KOSIS GRDP')),
    actualLabel:   'KOSIS GRDP 실측 (90일 캐시)',
    fallbackLabel: 'district 추정 (API 미사용)',
    note:          '90일 캐시 적용 — 연간 업데이트 데이터',
  },
] as const;

interface Props {
  result: AnalysisResult;
}

export default function ApiUsageBanner({ result }: Props) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          데이터 소스 및 API 사용량
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          이 분석에서 사용된 외부 API 현황입니다. 무료 한도 초과 시 district 기반 추정값으로 자동 전환됩니다.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {API_SPECS.map((api) => {
          const isActual = api.detectActual(result);

          return (
            <div
              key={api.id}
              className={`rounded-lg p-3 border ${
                api.isLow
                  ? isActual
                    ? 'bg-amber-50 border-amber-200'   // TMAP 실측 — 주의 (한도 낮음)
                    : 'bg-slate-50 border-slate-200'    // TMAP fallback
                  : isActual
                    ? 'bg-green-50 border-green-200'    // 실측 성공
                    : 'bg-slate-50 border-slate-200'    // fallback
              }`}
            >
              {/* API 이름 + 실측 상태 배지 */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {isActual ? (
                    <CheckCircle2 className={`w-4 h-4 ${api.isLow ? 'text-amber-500' : 'text-green-500'}`} />
                  ) : (
                    <MinusCircle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm font-medium text-slate-800">{api.name}</span>
                  <span className="text-xs text-slate-400">({api.provider})</span>
                </div>

                {/* 무료 한도 배지 */}
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    api.isLow
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  무료 {api.limitLabel}
                </span>
              </div>

              {/* 현재 사용 상태 */}
              <p className="text-xs text-slate-600 pl-5.5 ml-0.5">
                <span className={`font-medium ${isActual ? 'text-green-700' : 'text-slate-500'}`}>
                  {isActual ? '✓ ' + api.actualLabel : '— ' + api.fallbackLabel}
                </span>
              </p>

              {/* TMAP 한도 경고 */}
              {api.isLow && (
                <div className="flex items-start gap-1 mt-1.5 pl-0.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">{api.note}</p>
                </div>
              )}
              {/* 에어코리아/건축물대장 캐시 안내 */}
              {!api.isLow && isActual && (
                <p className="text-xs text-slate-400 mt-1 pl-5">{api.note}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
