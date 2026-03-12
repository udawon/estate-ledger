import type { NextConfig } from "next";

const securityHeaders = [
  // XSS 공격 방지
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 클릭재킹 방지
  { key: "X-Frame-Options", value: "DENY" },
  // HTTPS 강제 (1년)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Referrer 정보 최소화
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 브라우저 기능 제한
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  // XSS 필터 활성화 (레거시 브라우저용)
  { key: "X-XSS-Protection", value: "1; mode=block" },
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
