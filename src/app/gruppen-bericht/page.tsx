'use client';

import { Container } from '@mui/material';
import StatusReportForm from '@/components/StatusReportForm';
import { MainLayout } from '@/components/MainLayout';
import HomePageHeader from '@/components/HomePageHeader';

export default function GruppenBerichtPage() {
  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Neuer Gruppenbericht', href: '/gruppen-bericht', active: true },
      ]}    
    >
      <Container maxWidth="lg">
        <HomePageHeader 
          mainTitle="Neuen Gruppenbericht" 
          subtitle="Online-Formular zur Einreichung von Arbeitsgruppenberichten."
          introText="Hier finden Sie alle Termine und wichtige Informationen für Mitglieder der Linken in Frankfurt."
        />
        <StatusReportForm />
      </Container>
    </MainLayout>
  );
}