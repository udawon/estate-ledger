'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RentalListing, RentalListingInput } from '@/types/listings';

const schema = z.object({
  recv_date: z.string().min(1, '접수일을 입력하세요'),
  category: z.string(),
  building: z.string(),
  addr: z.string().min(1, '주소를 입력하세요'),
  unit_no: z.string(),
  door_pw: z.string(),
  contract_date: z.string(),
  move_in_date: z.string(),
  confirm_date: z.string(),
  deposit: z.string(),
  monthly: z.string(),
  mng_fee: z.string(),
  lessor: z.string(),
  lessee: z.string(),
  move_in: z.string(),
  client_name: z.string(),
  client_phone: z.string(),
  carrier: z.string(),
  memo: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toIntOrNull(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

const EMPTY: FormValues = {
  recv_date: '', category: '', building: '', addr: '', unit_no: '', door_pw: '',
  contract_date: '', move_in_date: '', confirm_date: '',
  deposit: '', monthly: '', mng_fee: '',
  lessor: '', lessee: '', move_in: '',
  client_name: '', client_phone: '', carrier: '', memo: '',
};

function listingToForm(s: RentalListing): FormValues {
  return {
    recv_date: s.recv_date ?? '',
    category: s.category ?? '',
    building: s.building ?? '',
    addr: s.addr ?? '',
    unit_no: s.unit_no ?? '',
    door_pw: s.door_pw ?? '',
    contract_date: s.contract_date ?? '',
    move_in_date: s.move_in_date ?? '',
    confirm_date: s.confirm_date ?? '',
    deposit: s.deposit != null ? String(s.deposit) : '',
    monthly: s.monthly != null ? String(s.monthly) : '',
    mng_fee: s.mng_fee != null ? String(s.mng_fee) : '',
    lessor: s.lessor ?? '',
    lessee: s.lessee ?? '',
    move_in: s.move_in ?? '',
    client_name: s.client_name ?? '',
    client_phone: s.client_phone ?? '',
    carrier: s.carrier ?? '',
    memo: s.memo ?? '',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: RentalListing | null;
  onSaved: () => void;
}

export function RentalFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const isEdit = !!initial;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (initial) reset(listingToForm(initial));
    else reset({ ...EMPTY, recv_date: new Date().toISOString().slice(0, 10) });
  }, [open, initial, reset]);

  async function onSubmit(values: FormValues) {
    const payload: RentalListingInput = {
      recv_date: values.recv_date,
      category: values.category,
      building: values.building,
      addr: values.addr,
      unit_no: values.unit_no,
      door_pw: values.door_pw,
      contract_date: values.contract_date,
      move_in_date: values.move_in_date,
      confirm_date: values.confirm_date,
      deposit: toIntOrNull(values.deposit),
      monthly: toIntOrNull(values.monthly),
      mng_fee: toIntOrNull(values.mng_fee),
      lessor: values.lessor,
      lessee: values.lessee,
      move_in: values.move_in,
      client_name: values.client_name,
      client_phone: values.client_phone,
      carrier: values.carrier,
      memo: values.memo,
    };

    const url = isEdit ? `/api/listings/rentals/${initial!.id}` : '/api/listings/rentals';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json() as { success: boolean; error?: string };
    if (json.success) onSaved();
    else alert(json.error ?? '저장 실패');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '전월세 매물 수정' : '전월세 매물 등록'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>접수일 *</Label>
              <Input type="date" {...register('recv_date')} />
              {errors.recv_date && <p className="text-xs text-destructive">{errors.recv_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>구분 (월세/전세)</Label>
              <Input {...register('category')} placeholder="월세" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>건물구분</Label>
              <Input {...register('building')} placeholder="아파트/오피스텔..." />
            </div>
            <div className="space-y-1">
              <Label>호수</Label>
              <Input {...register('unit_no')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>주소 *</Label>
            <Input {...register('addr')} />
            {errors.addr && <p className="text-xs text-destructive">{errors.addr.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>계약일자</Label>
              <Input type="date" {...register('contract_date')} />
            </div>
            <div className="space-y-1">
              <Label>전입일자</Label>
              <Input type="date" {...register('move_in_date')} />
            </div>
            <div className="space-y-1">
              <Label>확정일자</Label>
              <Input type="date" {...register('confirm_date')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>보증금 (만원)</Label>
              <Input type="number" {...register('deposit')} />
            </div>
            <div className="space-y-1">
              <Label>월세 (만원)</Label>
              <Input type="number" {...register('monthly')} />
            </div>
            <div className="space-y-1">
              <Label>관리비 (만원)</Label>
              <Input type="number" {...register('mng_fee')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>임대인</Label>
              <Input {...register('lessor')} />
            </div>
            <div className="space-y-1">
              <Label>임차인</Label>
              <Input {...register('lessee')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>성명</Label>
              <Input {...register('client_name')} />
            </div>
            <div className="space-y-1">
              <Label>연락처</Label>
              <Input {...register('client_phone')} />
            </div>
            <div className="space-y-1">
              <Label>통신사</Label>
              <Input {...register('carrier')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>비고</Label>
            <Textarea {...register('memo')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : isEdit ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
