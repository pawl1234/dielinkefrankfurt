'use client';

import { MainLayout } from '@/components/MainLayout';
import { Container, CircularProgress, Box } from '@mui/material';
import { Suspense } from 'react'; // Import Suspense
import HomePageContent from '@/components/HomePageContent';
import HomePageHeader from '@/components/HomePageHeader';

export default function Home() {
  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/', active: true }
      ]}
    >
      <Container maxWidth="lg">
        <HomePageHeader 
          mainTitle="Die Linke Frankfurt" 
          subtitle="Willkommen auf userem Mitgliederportal."
          introText="Hier finden Sie alle Termine und wichtige Informationen für Mitglieder der Linken in Frankfurt."
        />              
        <Suspense fallback={ 
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