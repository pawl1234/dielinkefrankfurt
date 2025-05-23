'use client';

import { ReactNode } from 'react';
import { Container } from '@mui/material';
import { MainLayout } from '@/components/layout/MainLayout';
import HomePageHeader from '@/components/layout/HomePageHeader';

interface FormPageLayoutProps {
  title: string;
  subtitle: string;
  introText?: string;
  breadcrumbs: Array<{
    label: string;
    href: string;
    active?: boolean;
  }>;
  children: ReactNode;
}

/**
 * Reusable layout component for form pages
 * Provides consistent structure for all form pages including:
 * - MainLayout with breadcrumbs
 * - Page header with title, subtitle, and intro text
 * - Container for form content
 */
export default function FormPageLayout({
  title,
  subtitle,
  introText,
  breadcrumbs,
  children
}: FormPageLayoutProps) {
  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <Container maxWidth="lg">
        <HomePageHeader 
          mainTitle={title} 
          subtitle={subtitle}
          introText={introText}
        />
        {children}
      </Container>
    </MainLayout>
  );
}