'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExcelButtonsProps {
  // 내보내기: 현재 테이블 데이터
  data: Record<string, unknown>[];
  filename: string;
  // 가져오기: 파싱된 행 배열 콜백
  onImport?: (rows: Record<string, unknown>[]) => Promise<void>;
  // 템플릿 내려받기: 컬럼 헤더 배열
  templateHeaders?: string[];
}

export function ExcelButtons({ data, filename, onImport, templateHeaders }: ExcelButtonsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // ─── 내보내기 ──────────────────────────────────────────
  function handleExport() {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '매물');
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ─── 템플릿 내려받기 (헤더 행만 있는 빈 시트) ──────────
  function handleTemplate() {
    if (!templateHeaders) return;
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '매물');
    XLSX.writeFile(wb, `${filename}_템플릿.xlsx`);
  }

  // ─── 가져오기 (xlsx/csv 모두 지원) ────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;

    setImporting(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(arrayBuf), { type: 'array', codepage: 65001 });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      await onImport(rows);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* 내보내기 — 모바일: 아이콘만 / sm 이상: 텍스트 포함 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        title="엑셀 내보내기"
        className="gap-1.5 px-2 sm:px-3"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">내보내기</span>
      </Button>

      {/* 템플릿 내려받기 */}
      {templateHeaders && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleTemplate}
          title="템플릿 내려받기"
          className="gap-1.5 px-2 sm:px-3"
        >
          <FileDown className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">템플릿</span>
        </Button>
      )}

      {/* 가져오기 */}
      {onImport && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
            title="엑셀/CSV 가져오기"
            className="gap-1.5 px-2 sm:px-3"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {importing ? '가져오는 중...' : '가져오기'}
            </span>
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
