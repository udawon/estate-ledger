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
import type { SaleListing, SaleListingInput } from '@/types/listings';

// ─── 폼 스키마: 모든 필드를 문자열로 처리 (Zod v4 + RHF 호환) ───
const schema = z.object({
  recv_date: z.string().min(1, '접수일을 입력하세요'),
  category: z.string(),
  road_addr: z.string().min(1, '도로명 주소를 입력하세요'),
  lot_addr: z.string(),
  source: z.string(),
  zoning: z.string(),
  floor_this: z.string(),
  floor_b: z.string(),
  floor_g: z.string(),
  built_year: z.string(),
  built_date: z.string(),
  park_self: z.string(),
  park_mech: z.string(),
  elevator: z.string(),
  land_m2: z.string(),
  land_py: z.string(),
  bldg_area: z.string(),
  price: z.string(),
  price_per_py: z.string(),
  net_invest: z.string(),
  deposit: z.string(),
  subtotal: z.string(),
  monthly: z.string(),
  mng_fee: z.string(),
  yield_cur: z.string(),
  client_name: z.string(),
  client_phone: z.string(),
  carrier: z.string(),
  memo: z.string(),
});

type FormValues = z.infer<typeof schema>;

// ─── 문자열 → 숫자 변환 헬퍼 ──────────────────────────
function toIntOrNull(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}
function toFloatOrNull(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

// ─── 빈 폼 기본값 ─────────────────────────────────────
const EMPTY: FormValues = {
  recv_date: '', category: '', road_addr: '', lot_addr: '', source: '',
  zoning: '', floor_this: '', floor_b: '', floor_g: '', built_year: '', built_date: '',
  park_self: '', park_mech: '', elevator: '', land_m2: '', land_py: '', bldg_area: '',
  price: '', price_per_py: '', net_invest: '', deposit: '', subtotal: '',
  monthly: '', mng_fee: '', yield_cur: '',
  client_name: '', client_phone: '', carrier: '', memo: '',
};

// ─── SaleListing → FormValues 변환 ───────────────────
function listingToForm(s: SaleListing): FormValues {
  return {
    recv_date: s.recv_date ?? '',
    category: s.category ?? '',
    road_addr: s.road_addr ?? '',
    lot_addr: s.lot_addr ?? '',
    source: s.source ?? '',
    zoning: s.zoning ?? '',
    floor_this: s.floor_this ?? '',
    floor_b: s.floor_b ?? '',
    floor_g: s.floor_g ?? '',
    built_year: s.built_year != null ? String(s.built_year) : '',
    built_date: s.built_date ?? '',
    park_self: s.park_self != null ? String(s.park_self) : '',
    park_mech: s.park_mech != null ? String(s.park_mech) : '',
    elevator: s.elevator ?? '',
    land_m2: s.land_m2 != null ? String(s.land_m2) : '',
    land_py: s.land_py != null ? String(s.land_py) : '',
    bldg_area: s.bldg_area != null ? String(s.bldg_area) : '',
    price: s.price != null ? String(s.price) : '',
    price_per_py: s.price_per_py != null ? String(s.price_per_py) : '',
    net_invest: s.net_invest != null ? String(s.net_invest) : '',
    deposit: s.deposit != null ? String(s.deposit) : '',
    subtotal: s.subtotal != null ? String(s.subtotal) : '',
    monthly: s.monthly != null ? String(s.monthly) : '',
    mng_fee: s.mng_fee != null ? String(s.mng_fee) : '',
    yield_cur: s.yield_cur != null ? String(s.yield_cur) : '',
    client_name: s.client_name ?? '',
    client_phone: s.client_phone ?? '',
    carrier: s.carrier ?? '',
    memo: s.memo ?? '',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: SaleListing | null;
  onSaved: () => void;
}

export function SalesFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
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
    const payload: SaleListingInput = {
      recv_date: values.recv_date,
      category: values.category,
      road_addr: values.road_addr,
      lot_addr: values.lot_addr,
      source: values.source,
      zoning: values.zoning,
      floor_this: values.floor_this,
      floor_b: values.floor_b,
      floor_g: values.floor_g,
      built_year: toIntOrNull(values.built_year),
      built_date: values.built_date,
      park_self: toIntOrNull(values.park_self),
      park_mech: toIntOrNull(values.park_mech),
      elevator: values.elevator,
      land_m2: toFloatOrNull(values.land_m2),
      land_py: toFloatOrNull(values.land_py),
      bldg_area: toFloatOrNull(values.bldg_area),
      price: toIntOrNull(values.price),
      price_per_py: toIntOrNull(values.price_per_py),
      net_invest: toIntOrNull(values.net_invest),
      deposit: toIntOrNull(values.deposit),
      subtotal: toIntOrNull(values.subtotal),
      monthly: toIntOrNull(values.monthly),
      mng_fee: toIntOrNull(values.mng_fee),
      yield_cur: toFloatOrNull(values.yield_cur),
      client_name: values.client_name,
      client_phone: values.client_phone,
      carrier: values.carrier,
      memo: values.memo,
    };

    const url = isEdit ? `/api/listings/sales/${initial!.id}` : '/api/listings/sales';
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
          <DialogTitle>{isEdit ? '매매 매물 수정' : '매매 매물 등록'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>접수일 *</Label>
              <Input type="date" {...register('recv_date')} />
              {errors.recv_date && <p className="text-xs text-destructive">{errors.recv_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>구분</Label>
              <Input {...register('category')} placeholder="매매" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>도로명 주소 *</Label>
            <Input {...register('road_addr')} placeholder="서울시 강남구..." />
            {errors.road_addr && <p className="text-xs text-destructive">{errors.road_addr.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>주소지</Label>
            <Input {...register('lot_addr')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>해당층</Label>
              <Input {...register('floor_this')} />
            </div>
            <div className="space-y-1">
              <Label>용도지역</Label>
              <Input {...register('zoning')} />
            </div>
            <div className="space-y-1">
              <Label>건축년도</Label>
              <Input type="number" {...register('built_year')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>토지(㎡)</Label>
              <Input type="number" step="0.01" {...register('land_m2')} />
            </div>
            <div className="space-y-1">
              <Label>토지(평)</Label>
              <Input type="number" step="0.01" {...register('land_py')} />
            </div>
            <div className="space-y-1">
              <Label>건평</Label>
              <Input type="number" step="0.01" {...register('bldg_area')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>매가 (만원)</Label>
              <Input type="number" {...register('price')} />
            </div>
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
