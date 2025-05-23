// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import AuthProvider from '@/components/auth/AuthProvider';
import { Dosis } from 'next/font/google';
import ThemeRegistry from '@/theme/ThemeRegistry'; // Ensure this path is correct

export const metadata: Metadata = {
  title: 'Termin-Anmeldung | DIE LINKE Frankfurt',
  description: 'Online-Formular zur Anmeldung von Veranstaltungen bei DIE LINKE Frankfurt',
  icons: {
    icon: '/images/favicon.ico', // This should be sufficient for favicons
    // shortcut: '/images/favicon.ico', // Often redundant if icon is set
    // apple: '/images/favicon.ico',    // Often redundant if icon is set
  },
};

const dosis = Dosis({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-dosis', // Expose as CSS variable
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
      </head>
      <body>
        <AuthProvider>
          <ThemeRegistry>
            {children}
          </ThemeRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}