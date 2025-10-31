// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import AuthProvider from '@/components/auth/AuthProvider';
import { Open_Sans } from 'next/font/google';
import ThemeRegistry from '@/theme/ThemeRegistry'; // Ensure this path is correct
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'Termin-Anmeldung | DIE LINKE Frankfurt',
  description: 'Online-Formular zur Anmeldung von Veranstaltungen bei DIE LINKE Frankfurt',
  icons: {
    icon: '/images/favicon.ico', // This should be sufficient for favicons
    // shortcut: '/images/favicon.ico', // Often redundant if icon is set
    // apple: '/images/favicon.ico',    // Often redundant if icon is set
  },
};

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-open-sans', // Expose as CSS variable
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          rel="preload"
          href="/images/header-bg.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/images/logo.webp"
          as="image"
          type="image/webp"
        />
      </head>
      <body className={openSans.className}>
        <AuthProvider>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}