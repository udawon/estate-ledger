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
import type { ShopListing, ShopListingInput } from '@/types/listings';

const schema = z.object({
  recv_date: z.string().min(1, '접수일을 입력하세요'),
  type: z.string(),
  brand: z.string(),
  zoning: z.string(),
  addr: z.string().min(1, '주소를 입력하세요'),
  built_year: z.string(),
  floor_this: z.string(),
  floors_total: z.string(),
  area_lease_m2: z.string(),
  area_lease_py: z.string(),
  area_net_m2: z.string(),
  area_net_py: z.string(),
  fuel: z.string(),
  subtotal: z.string(),
  deposit: z.string(),
  premium: z.string(),
  subtotal2: z.string(),
  monthly: z.string(),
  vat: z.string(),
  mng_fee: z.string(),
  rent_per_py: z.string(),
  mng_per_py: z.string(),
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
function toFloatOrNull(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

const EMPTY: FormValues = {
  recv_date: '', type: '', brand: '', zoning: '', addr: '', built_year: '',
  floor_this: '', floors_total: '', area_lease_m2: '', area_lease_py: '',
  area_net_m2: '', area_net_py: '', fuel: '', subtotal: '', deposit: '',
  premium: '', subtotal2: '', monthly: '', vat: '', mng_fee: '',
  rent_per_py: '', mng_per_py: '', client_name: '', client_phone: '', carrier: '', memo: '',
};

function listingToForm(s: ShopListing): FormValues {
  return {
    recv_date: s.recv_date ?? '',
    type: s.type ?? '',
    brand: s.brand ?? '',
    zoning: s.zoning ?? '',
    addr: s.addr ?? '',
    built_year: s.built_year != null ? String(s.built_year) : '',
    floor_this: s.floor_this ?? '',
    floors_total: s.floors_total ?? '',
    area_lease_m2: s.area_lease_m2 != null ? String(s.area_lease_m2) : '',
    area_lease_py: s.area_lease_py != null ? String(s.area_lease_py) : '',
    area_net_m2: s.area_net_m2 != null ? String(s.area_net_m2) : '',
    area_net_py: s.area_net_py != null ? String(s.area_net_py) : '',
    fuel: s.fuel ?? '',
    subtotal: s.subtotal != null ? String(s.subtotal) : '',
    deposit: s.deposit != null ? String(s.deposit) : '',
    premium: s.premium != null ? String(s.premium) : '',
    subtotal2: s.subtotal2 != null ? String(s.subtotal2) : '',
    monthly: s.monthly != null ? String(s.monthly) : '',
    vat: s.vat != null ? String(s.vat) : '',
    mng_fee: s.mng_fee != null ? String(s.mng_fee) : '',
    rent_per_py: s.rent_per_py != null ? String(s.rent_per_py) : '',
    mng_per_py: s.mng_per_py != null ? String(s.mng_per_py) : '',
    client_name: s.client_name ?? '',
    client_phone: s.client_phone ?? '',
    carrier: s.carrier ?? '',
    memo: s.memo ?? '',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: ShopListing | null;
  onSaved: () => void;
}

export function ShopFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
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
    const payload: ShopListingInput = {
      recv_date: values.recv_date,
      type: values.type,
      brand: values.brand,
      zoning: values.zoning,
      addr: values.addr,
      built_year: toIntOrNull(values.built_year),
      floor_this: values.floor_this,
      floors_total: values.floors_total,
      area_lease_m2: toFloatOrNull(values.area_lease_m2),
      area_lease_py: toFloatOrNull(values.area_lease_py),
      area_net_m2: toFloatOrNull(values.area_net_m2),
      area_net_py: toFloatOrNull(values.area_net_py),
      fuel: values.fuel,
      subtotal: toIntOrNull(values.subtotal),
      deposit: toIntOrNull(values.deposit),
      premium: toIntOrNull(values.premium),
      subtotal2: toIntOrNull(values.subtotal2),
      monthly: toIntOrNull(values.monthly),
      vat: toIntOrNull(values.vat),
      mng_fee: toIntOrNull(values.mng_fee),
      rent_per_py: toIntOrNull(values.rent_per_py),
      mng_per_py: toIntOrNull(values.mng_per_py),
      client_name: values.client_name,
      client_phone: values.client_phone,
      carrier: values.carrier,
      memo: values.memo,
    };

    const url = isEdit ? `/api/listings/shops/${initial!.id}` : '/api/listings/shops';
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
          <DialogTitle>{isEdit ? '상가 매물 수정' : '상가 매물 등록'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>접수일 *</Label>
              <Input type="date" {...register('recv_date')} />
              {errors.recv_date && <p className="text-xs text-destructive">{errors.recv_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>종류</Label>
              <Input {...register('type')} placeholder="일반상가" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>상호</Label>
              <Input {...register('brand')} />
            </div>
            <div className="space-y-1">
              <Label>용도지역</Label>
              <Input {...register('zoning')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>주소 *</Label>
            <Input {...register('addr')} />
            {errors.addr && <p className="text-xs text-destructive">{errors.addr.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>해당층</Label>
              <Input {...register('floor_this')} />
            </div>
            <div className="space-y-1">
              <Label>전체층</Label>
              <Input {...register('floors_total')} />
            </div>
            <div className="space-y-1">
              <Label>건축년도</Label>
              <Input type="number" {...register('built_year')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>계약면적(㎡)</Label>
              <Input type="number" step="0.01" {...register('area_lease_m2')} />
            </div>
            <div className="space-y-1">
              <Label>계약면적(평)</Label>
              <Input type="number" step="0.01" {...register('area_lease_py')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>보증금 (만원)</Label>
              <Input type="number" {...register('deposit')} />
            </div>
            <div className="space-y-1">
              <Label>권리금 (만원)</Label>
              <Input type="number" {...register('premium')} />
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
