'use client';

import { SessionProvider } from 'next-auth/react';
import MuiSetup from '@/components/MuiSetup';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <MuiSetup>
        {children}
      </MuiSetup>
    </SessionProvider>
  );
}