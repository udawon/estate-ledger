// ─── 입지 분석 입력 폼 ───────────────────────────────────────
// React Hook Form + Zod validation 기반 주소 입력 폼

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Zod 스키마: 주소 유효성 검사 */
const analysisSchema = z.object({
  address: z
    .string()
    .min(1, '주소를 입력해주세요.')
    .min(5, '주소는 5자 이상 입력해주세요.')
    .max(200, '주소는 200자 이하로 입력해주세요.'),
});

/** 폼 필드 타입 */
type AnalysisFormValues = z.infer<typeof analysisSchema>;

/** Props 타입 */
interface AnalysisFormProps {
  /** 분석 시작 콜백 */
  onSubmit: (address: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 초기 주소값 (URL 쿼리 파라미터에서 전달) */
  defaultAddress?: string;
}

/**
 * AnalysisForm 컴포넌트
 * - React Hook Form + Zod로 유효성 검사
 * - 로딩 중 버튼 비활성화 + 스피너 표시
 */
export default function AnalysisForm({
  onSubmit,
  isLoading = false,
  defaultAddress = '',
}: AnalysisFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisSchema),
    defaultValues: { address: defaultAddress },
  });

  const onFormSubmit = (data: AnalysisFormValues) => {
    onSubmit(data.address);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="w-full">
      <div className="space-y-3">
        {/* 레이블 */}
        <label
          htmlFor="address"
          className="block text-sm font-medium text-white"
        >
          분석할 주소 입력
        </label>

        {/* 입력 + 버튼 그룹 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              id="address"
              type="text"
              placeholder="예: 서울특별시 강남구 테헤란로 123"
              disabled={isLoading}
              className={`h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white/15 focus:border-indigo-400 ${errors.address ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              {...register('address')}
            />
            {/* 에러 메시지 */}
            {errors.address && (
              <p className="mt-1.5 text-sm text-red-500" role="alert">
                {errors.address.message}
              </p>
            )}
          </div>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="h-11 px-6 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold shrink-0 border-0 shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Search className="mr-2 w-4 h-4" />
                분석하기
              </>
            )}
          </Button>
        </div>

        {/* 도움말 텍스트 */}
        <p className="text-xs text-slate-400">
          도로명 주소를 입력하면 더 정확한 분석 결과를 제공합니다.
        </p>
      </div>
    </form>
  );
}
