import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termin-Anmeldung | DIE LINKE Frankfurt',
  description: 'Online-Formular zur Anmeldung von Veranstaltungen bei DIE LINKE Frankfurt',
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
      </head>
      <body className="bg-light-gray min-h-screen antialiased">{children}</body>
    </html>
  );
}
