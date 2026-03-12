import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "frame-src https://www.openstreetmap.org",
  "connect-src 'self' https://dapi.kakao.com https://apis.data.go.kr https://kosis.kr http://openapi.seoul.go.kr:8088 http://apis.data.go.kr https://nominatim.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // XSS 공격 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 클릭재킹 방지
  { key: "X-Frame-Options", value: "DENY" },
  // HTTPS 강제 (1년, preload 포함)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Referrer 정보 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 브라우저 기능 제한
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  // XSS 필터 활성화 (레거시 브라우저용)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // DNS 프리페치 제어
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // CSP — XSS·데이터 주입 방지
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
