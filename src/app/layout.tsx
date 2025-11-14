import type { Metadata } from 'next';
import './globals.css';
import { Tajawal } from 'next/font/google';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'منصة التحليل الذكي للأسواق',
  description: 'حل شامل لتحليل الأسهم والفوركس والذهب والعملات الرقمية باستخدام الذكاء الاصطناعي والبيانات المباشرة.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={tajawal.className}>{children}</body>
    </html>
  );
}
