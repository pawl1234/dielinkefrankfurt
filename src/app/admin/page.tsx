'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import AdminNavigation from '@/components/AdminNavigation';
import {
  Box,
  Container,
} from '@mui/material';
import NewsletterGenerator from '@/components/newsletter/NewsletterGenerator';

export default function AdminPage() {
  const router = useRouter();


  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        {/* Simple static loading indicator that doesn't cause hydration mismatches */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
          }}
        />
      </Box>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Newsletter', href: '/admin', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <AdminNavigation />
          {/* Newsletter Generator */}
          <NewsletterGenerator />          
        </Container>                           
      </Box>


    </MainLayout>
  );
}