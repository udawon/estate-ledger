// ─── 사용 방법 4단계 섹션 ────────────────────────────────────
// 주소 입력 → AI 분석 → 점수 확인 → 보고서 단계 인디케이터

import { MapPin, Cpu, BarChart3, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/** 단계 데이터 타입 */
interface Step {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

/** 4단계 데이터 */
const steps: Step[] = [
  {
    step: 1,
    icon: <MapPin className="w-5 h-5" />,
    title: '주소 입력',
    description: '분석하고 싶은 부동산 주소를 입력하세요.',
  },
  {
    step: 2,
    icon: <Cpu className="w-5 h-5" />,
    title: 'AI 분석',
    description: '7개 카테고리를 공공 API 5종 실측 데이터로 AI가 자동 분석합니다.',
  },
  {
    step: 3,
    icon: <BarChart3 className="w-5 h-5" />,
    title: '점수 확인',
    description: '카테고리별 점수와 종합 등급을 시각적으로 확인합니다.',
  },
  {
    step: 4,
    icon: <FileText className="w-5 h-5" />,
    title: '상세 결과',
    description: '카테고리별 상세 결과와 AI 요약으로 입지 결정에 활용하세요.',
  },
];

/**
 * HowItWorks 컴포넌트
 * - 4단계 Step 인디케이터
 * - 모바일: 세로 스택 → 데스크탑: 가로 연결선 레이아웃
 */
export default function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* 섹션 헤더 */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            이렇게 사용하세요
          </h2>
          <p className="text-slate-500 text-lg">
            단 4단계로 완벽한 입지 분석 결과를 받아보세요
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-0 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={item.step} className="relative flex md:flex-col items-start md:items-center flex-1 gap-4 md:gap-0">
              {/* 연결선 (데스크탑 전용) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-300 to-indigo-300 translate-x-6" />
              )}

              {/* 스텝 원 + 아이콘 */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  {item.icon}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hidden md:flex"
                >
                  STEP {item.step}
                </Badge>
              </div>

              {/* 텍스트 영역 */}
              <div className="md:text-center md:mt-4 md:px-2">
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold mb-2 md:hidden"
                >
                  STEP {item.step}
                </Badge>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
