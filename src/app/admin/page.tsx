'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react'; // Import useSession
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress, // Import CircularProgress for a consistent loading indicator
} from '@mui/material';
import NewsletterGenerator from '@/components/newsletter/NewsletterGenerator';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession(); // Get status from useSession

  useEffect(() => {
    // Redirect if not authenticated and status is not 'loading'
    // (to avoid redirecting before session status is determined)
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  if (status === 'loading') { // Check for loading state first
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress /> 
      </Box>
    );
  }

  // If unauthenticated and not loading, the useEffect will handle the redirect.
  // This check can be an additional safeguard or removed if useEffect is sufficient.
  if (status === 'unauthenticated') {
    // You could return null or a minimal component here as useEffect handles redirect
    // Or let the useEffect handle the redirect and this part might not be reached
    // if the redirect happens quickly.
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Typography>Redirecting to login...</Typography>
        </Box>
    ); 
  }


  // Only render the main content if authenticated
  if (status === 'authenticated') {
    return (
      <MainLayout
        breadcrumbs={[
          { label: 'Start', href: '/' },
          { label: 'Administration', href: '/admin', active: true }, // Changed breadcrumb for admin root
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

  // Fallback or if status is somehow neither loading, unauthenticated, nor authenticated (should not happen)
  return null; 
}