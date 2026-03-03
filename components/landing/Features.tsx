// ─── 기능 소개 카드 섹션 ─────────────────────────────────────
// 7개 카테고리 (교통/일자리/생활인프라/교육/환경위험/미래가치/공급) 카드 레이아웃

import {
  Train, Briefcase, ShoppingBag, GraduationCap,
  AlertTriangle, TrendingUp, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/** 카테고리 카드 데이터 타입 */
interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  apiSource: string;  // 사용 공공 API 출처
  weight: string;     // 가중치
}

/** 7개 카테고리 데이터 — 실제 엔진과 1:1 매칭 */
const features: FeatureCard[] = [
  {
    icon: <Train className="w-6 h-6" />,
    title: '교통 접근성',
    description:
      '지하철역·버스정류장 근접도와 대중교통 접근 시간을 분석합니다. TMAP 실측 데이터로 도보·대중교통 편의성을 정량 평가합니다.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    apiSource: 'TMAP 대중교통',
    weight: '20%',
  },
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: '일자리·수요',
    description:
      '자치구 GRDP 순위와 경제 규모로 고용 수요를 측정합니다. KOSIS 통계청 실측 데이터로 투자 매력도를 평가합니다.',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    apiSource: 'KOSIS 통계청',
    weight: '15%',
  },
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: '생활인프라',
    description:
      '편의점·음식점·마트 등 생활 편의시설 밀도를 반경별로 분석합니다. Kakao 로컬 API 실측 데이터를 활용합니다.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    apiSource: 'Kakao 로컬 API',
    weight: '15%',
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: '교육 환경',
    description:
      '초·중·고 학교 접근성과 학원가 밀도를 분석합니다. 자녀 교육 환경의 질적 수준을 종합 평가합니다.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    apiSource: '학교알리미',
    weight: '15%',
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: '환경위험',
    description:
      '침수·지진 위험도와 대기질 지수를 분석합니다. 서울시 침수흔적도와 에어코리아 실측 데이터를 사용합니다.',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    apiSource: '서울시 침수흔적도',
    weight: '15%',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: '미래가치',
    description:
      '최근 실거래가 추세와 시세 방향성을 분석합니다. 국토부 실거래가 API로 최근 3개월 시장 동향을 반영합니다.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    apiSource: '국토부 실거래가',
    weight: '10%',
  },
  {
    icon: <Building2 className="w-6 h-6" />,
    title: '상품·공급',
    description:
      '인근 신규 공급량과 입주 예정 물량을 분석합니다. 건축물대장 데이터로 향후 시장 공급 압력을 측정합니다.',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    apiSource: '건축물대장',
    weight: '10%',
  },
];

/**
 * Features 컴포넌트
 * - 7개 카테고리를 그리드 카드로 표시
 * - 반응형: 모바일 1열 → sm 2열 → lg 3열 + 마지막 행 중앙 정렬
 */
export default function Features() {
  // 처음 6개, 마지막 1개 분리 (마지막 행 중앙 정렬용)
  const mainCards = features.slice(0, 6);
  const lastCard = features[6];

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        {/* 섹션 헤더 */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            7가지 핵심 입지 지표
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            공공 API 5종 실측 데이터로 교통·일자리·생활·교육·환경·미래·공급을 종합 분석합니다
          </p>
        </div>

        {/* 상위 6개 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {mainCards.map((feature) => (
            <FeatureCardItem key={feature.title} feature={feature} />
          ))}
        </div>

        {/* 마지막 카드 (중앙 정렬) */}
        <div className="flex justify-center">
          <div className="w-full sm:w-1/2 lg:w-1/3">
            <FeatureCardItem feature={lastCard} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** 카드 단일 아이템 컴포넌트 */
function FeatureCardItem({ feature }: { feature: FeatureCard }) {
  return (
    <Card className="border border-slate-200 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        {/* 아이콘 영역 */}
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bgColor} ${feature.color} mb-3`}
        >
          {feature.icon}
        </div>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-slate-900">
            {feature.title}
          </CardTitle>
          <Badge variant="outline" className="text-xs text-slate-500 shrink-0">
            {feature.weight}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-slate-500 text-sm leading-relaxed mb-3">
          {feature.description}
        </p>
        {/* API 출처 표시 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">API:</span>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {feature.apiSource}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
