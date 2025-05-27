import React from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminNavigation from '@/components/admin/AdminNavigation';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import { Button } from '@mui/material';
import Link from 'next/link';
import NewsletterArchivesContent from './NewsletterArchivesContent';

export const metadata = {
  title: 'Newsletter Archives - Admin Dashboard',
  description: 'View and manage sent newsletters'
};

/**
 * Admin page for viewing sent newsletter archives
 */
export default function AdminNewsletterArchivesPage() {
  return (
    <>
      <AdminPageHeader 
        title="Newsletter-Archiv" 
        icon={<ArchiveOutlinedIcon />} 
      />
      
      <AdminNavigation title="Newsletter-Verwaltung" />
      
      <Button
        component={Link}
        href="/admin"
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Zurück zur Newsletter-Übersicht
      </Button>
      
      <NewsletterArchivesContent />
    </>
  );
}