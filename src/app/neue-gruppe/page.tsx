'use client';

import { Container } from '@mui/material';
import { MainLayout } from '@/components/MainLayout';
import GroupRequestForm from '@/components/GroupRequestForm';
import HomePageHeader from '@/components/HomePageHeader';

export default function NewGroupPage() {
  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Neue Gruppen Anfrage', href: '/neue-gruppe', active: true },
      ]}
    >
      <Container maxWidth="lg">
        <HomePageHeader 
          mainTitle="Neue Arbeitsgruppe" 
          subtitle="Online-Formular zur Beantragung einer Arbeitsgruppe"
          introText="Hier finden Sie alle Termine und wichtige Informationen für Mitglieder der Linken in Frankfurt."
        />      
        <GroupRequestForm />
      </Container>
    </MainLayout>
  );
}