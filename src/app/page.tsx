// src/app/page.tsx
'use client'; // Keep 'use client' if MainLayout or other top-level things need it,
              // but HomePageContent itself is also a client component.

import { MainLayout } from '@/components/MainLayout';
import { Container, CircularProgress, Box } from '@mui/material'; // Added CircularProgress, Box
import { Suspense } from 'react'; // Import Suspense
import HomePageContent from '@/components/HomePageContent'; // Import the new component

export default function Home() {
  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/', active: true }
      ]}
    >
      <Container maxWidth="lg">
        <Suspense fallback={ // Wrap the component that uses useSearchParams
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' /* Adjust height as needed */ }}>
            <CircularProgress />
          </Box>
        }>
          <HomePageContent />
        </Suspense>
      </Container>
    </MainLayout>
  );
}