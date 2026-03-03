// ─── 지도 표시 컴포넌트 ─────────────────────────────────────
// OpenStreetMap iframe으로 분석 주소 위치 표시

'use client';

import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MapViewProps {
  lat: number;
  lng: number;
  address: string;
  district: string;
}

/**
 * OpenStreetMap iframe 지도 컴포넌트
 * - API 키 불필요 (공개 타일 서버 사용)
 * - 분석 주소에 마커 표시
 * - 약 500m 반경 뷰포트
 */
export default function MapView({ lat, lng, address, district }: MapViewProps) {
  // 뷰포트 범위 (약 500m 반경)
  const delta = 0.008;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  // OpenStreetMap에서 직접 보기 링크
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          위치 지도
          <span className="ml-auto text-sm font-normal text-slate-500">{district}</span>
        </CardTitle>
        <p className="text-xs text-slate-400 truncate">{address}</p>
      </CardHeader>
      <CardContent className="p-0 pb-4 px-4">
        <div className="relative rounded-lg overflow-hidden border border-slate-100">
          <iframe
            title={`${address} 위치 지도`}
            src={mapUrl}
            width="100%"
            height="320"
            style={{ border: 'none' }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* 지도 출처 표기 + 외부 링크 */}
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-slate-400">
            © <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              OpenStreetMap
            </a> 기여자
          </span>
          <a
            href={osmLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            지도에서 크게 보기 →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
