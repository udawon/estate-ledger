'use client';

// ─── 비밀번호 변경 다이얼로그 ────────────────────────────
// Sidebar 하단 버튼으로 열리는 모달 폼

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Zod 스키마: 현재 비밀번호 + 새 비밀번호 + 확인 */
const schema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다.'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface ChangePasswordDialogProps {
  /** Trigger로 사용할 버튼 (기본 제공) */
  trigger?: React.ReactNode;
}

export function ChangePasswordDialog({ trigger }: ChangePasswordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setServerError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };

      if (json.success) {
        setSuccess(true);
        reset();
        // 2초 후 로그아웃 → 메인 페이지 이동
        setTimeout(async () => {
          await fetch('/api/auth/logout', { method: 'POST' });
          router.push('/');
        }, 2000);
      } else {
        setServerError(json.error ?? '변경에 실패했습니다.');
      }
    } catch {
      setServerError('서버 오류가 발생했습니다.');
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      reset();
      setServerError('');
      setSuccess(false);
    }
  }

  const defaultTrigger = (
    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all">
      <KeyRound className="w-4 h-4 shrink-0" />
      비밀번호 변경
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-500" />
            관리자 비밀번호 변경
          </DialogTitle>
        </DialogHeader>

        {/* 성공 상태 */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">비밀번호가 변경되었습니다!</p>
            <p className="text-xs text-slate-400">보안을 위해 자동으로 로그아웃됩니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* 현재 비밀번호 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="현재 비밀번호 입력"
                  className={`pr-10 h-10 ${errors.currentPassword ? 'border-red-400' : ''}`}
                  disabled={isSubmitting}
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            {/* 새 비밀번호 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">새 비밀번호</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  placeholder="새 비밀번호 (6자 이상)"
                  className={`pr-10 h-10 ${errors.newPassword ? 'border-red-400' : ''}`}
                  disabled={isSubmitting}
                  {...register('newPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            {/* 새 비밀번호 확인 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">새 비밀번호 확인</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="새 비밀번호 다시 입력"
                  className={`pr-10 h-10 ${errors.confirmPassword ? 'border-red-400' : ''}`}
                  disabled={isSubmitting}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* 서버 오류 */}
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* 버튼 그룹 */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-500 hover:bg-indigo-400 text-white border-0 gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  '비밀번호 변경'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
