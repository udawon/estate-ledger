// ─── 로그인 페이지 (/login) ───────────────────────────────
// 관리자 로그인 + 포트폴리오 데모 체험 버튼

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Loader2, TrendingUp, Eye, EyeOff, PlayCircle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Zod 스키마 */
const loginSchema = z.object({
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  /** 관리자 로그인 */
  async function onSubmit(data: LoginForm) {
    setServerError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        router.push('/listings/sales');
      } else {
        setServerError(json.error ?? '로그인에 실패했습니다.');
      }
    } catch {
      setServerError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  /** 데모 로그인 — 비밀번호 없이 체험 계정 발급 */
  async function handleDemoLogin() {
    setServerError('');
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', { method: 'POST' });
      const json = (await res.json()) as { success: boolean };
      if (json.success) {
        router.push('/listings/sales');
      }
    } catch {
      setServerError('데모 로그인에 실패했습니다.');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/25 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-indigo-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">부동산 통합관리 시스템</h1>
          <p className="text-slate-400 text-sm mt-1">매물장 + 입지분석 원스톱 플랫폼</p>
        </div>

        {/* ── 포트폴리오 데모 섹션 ─────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-600/90 to-violet-700/90 rounded-2xl shadow-2xl p-6 mb-4 border border-indigo-400/20">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-indigo-200" />
            <span className="text-indigo-100 text-sm font-semibold">채용담당자 / 포트폴리오 검토</span>
          </div>
          <p className="text-indigo-200 text-xs leading-relaxed mb-4">
            비밀번호 없이 모든 기능을 체험해보세요.<br />
            매물 등록·수정·삭제, 입지분석, Excel 연동까지<br />
            실제 시스템과 동일하게 작동합니다.
          </p>
          <Button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full h-11 bg-white hover:bg-indigo-50 text-indigo-700 font-bold border-0 shadow-md gap-2"
          >
            {demoLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                입장 중...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                데모 계정으로 체험하기
              </>
            )}
          </Button>
          <p className="text-indigo-300/70 text-xs text-center mt-2">
            비밀번호 변경 기능만 제한됩니다
          </p>
        </div>

        {/* ── 관리자 로그인 카드 ───────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            관리자 로그인
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="관리자 비밀번호"
                  className={`pl-10 pr-10 h-10 ${errors.password ? 'border-red-400' : ''}`}
                  disabled={isSubmitting}
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500" role="alert">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white border-0 font-semibold gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />로그인 중...</>
              ) : (
                '로그인'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            입지분석은{' '}
            <a href="/analysis" className="text-indigo-500 hover:underline">로그인 없이 이용</a>
            할 수 있습니다.
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © 2026 부동산 통합관리 시스템
        </p>
      </div>
    </div>
  );
}
