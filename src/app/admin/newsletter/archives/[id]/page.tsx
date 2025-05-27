import React from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminNavigation from '@/components/admin/AdminNavigation';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { Button } from '@mui/material';
import Link from 'next/link';
import NewsletterDetailContent from './NewsletterDetailContent';

export const metadata = {
  title: 'Newsletter Details - Admin Dashboard',
  description: 'View sent newsletter details'
};

/**
 * Admin page for viewing a single sent newsletter
 */
export default function AdminNewsletterDetailPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <>
      <AdminPageHeader 
        title="Newsletter Details" 
        icon={<MailOutlineIcon />} 
      />
      
      <AdminNavigation title="Newsletter-Verwaltung" />
      
      <Button
        component={Link}
        href="/admin/newsletter/archives"
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Zurück zum Newsletter-Archiv
      </Button>
      
      <NewsletterDetailContent id={params.id} />
    </>
  );
}