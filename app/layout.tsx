import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Estate-Ledger — 부동산 통합관리 시스템',
    template: '%s | Estate-Ledger',
  },
  description:
    '매물장(매매·상가·전월세) 통합 관리 + 공공 API 7종 입지분석. 한 플랫폼에서 부동산 업무를 완성하세요.',
  keywords: ['부동산', '매물장', '입지분석', '매매', '상가', '전월세', '교통', '상권'],
  openGraph: {
    title: 'Estate-Ledger — 부동산 통합관리 시스템',
    description: '매물장 + 입지분석 원스톱 플랫폼',
    type: 'website',
    locale: 'ko_KR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
