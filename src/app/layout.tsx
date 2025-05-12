import './globals.css';
import type { Metadata } from 'next';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Termin-Anmeldung | DIE LINKE Frankfurt',
  description: 'Online-Formular zur Anmeldung von Veranstaltungen bei DIE LINKE Frankfurt',
  icons: {
    icon: '/images/favicon.ico',
    shortcut: '/images/favicon.ico',
    apple: '/images/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Dosis:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link 
          rel="icon" 
          href="/images/favicon.ico" 
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}