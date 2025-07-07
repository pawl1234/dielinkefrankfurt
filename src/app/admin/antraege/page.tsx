'use client';

import { useEffect, useCallback, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPagination from '@/components/admin/tables/AdminPagination';
import AdminNotification from '@/components/admin/AdminNotification';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';
import AntraegeFilters from '@/components/admin/antraege/AntraegeFilters';
import ConfigurationDialog from '@/components/admin/antraege/ConfigurationDialog';
import {
  Box,
  Typography,
  Paper,
  Container,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAdminState } from '@/hooks/useAdminState';
// Removed unused import

// Define the Antrag type based on our Prisma schema
interface Antrag {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: string; // JSON string from API
  fileUrls: string | null; // JSON string from API
  status: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  createdAt: string;
  updatedAt: string;
  decisionComment?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

function AdminAntraegePageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Use our custom hook for admin state management
  const adminState = useAdminState<Antrag>();
  
  // State for filters
  const [searchFilter, setSearchFilter] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  
  // State for configuration dialog
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  
  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // Update URL with current filters
  const updateUrlParams = useCallback((search: string, status: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status && status !== 'all') params.set('status', status);
    if (adminState.page > 1) params.set('page', adminState.page.toString());
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [adminState.page]);

  const fetchAntraege = useCallback(async (search: string, status: string) => {
    try {
      console.log('🔄 fetchAntraege called with search:', search, 'status:', status);
      adminState.setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Handle status filter
      if (status && status !== 'all') {
        params.set('status', status);
      }
      
      if (search) params.set('search', search);
      params.set('page', adminState.page.toString());
      params.set('pageSize', adminState.pageSize.toString());
      params.set('t', adminState.timestamp.toString());
      
      const response = await fetch(`/api/admin/antraege?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch anträge');
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (data && data.items && Array.isArray(data.items)) {
        adminState.setItems(data.items);
        adminState.setPaginationData({
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 1
        });
      } else {
        console.warn('Unexpected API response format:', data);
        adminState.setItems([]);
      }
      
      adminState.setError(null);
    } catch (err) {
      adminState.setError('Failed to load anträge. Please try again.');
      console.error(err);
    } finally {
      adminState.setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps    
  }, [adminState.page, adminState.pageSize, adminState.timestamp, adminState.setLoading, adminState.setItems, adminState.setPaginationData, adminState.setError]);
  
  useEffect(() => {
    // Fetch anträge when authenticated
    if (status === 'authenticated') {
      fetchAntraege(searchFilter, statusFilter);
    }
  }, [status, adminState.page, adminState.pageSize, adminState.timestamp, fetchAntraege, searchFilter, statusFilter]);


  // Method for archiving
  const handleArchiveAntrag = async () => {
    // Since there's no ARCHIVED status, we might need to handle this differently
    // For now, we'll just refresh the list
    adminState.refreshTimestamp();
  };

  // Filter handlers
  const handleSearchChange = useCallback((search: string) => {
    setSearchFilter(search);
    adminState.setPage(1); // Reset to first page on search
    updateUrlParams(search, statusFilter);
  }, [statusFilter, adminState, updateUrlParams]);

  const handleStatusChange = useCallback((status: string) => {
    setStatusFilter(status);
    adminState.setPage(1); // Reset to first page on status change
    updateUrlParams(searchFilter, status);
  }, [searchFilter, adminState, updateUrlParams]);

  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('all');
    adminState.setPage(1);
    updateUrlParams('', 'all');
  }, [adminState, updateUrlParams]);

  // Configuration handlers
  const handleOpenConfigDialog = useCallback(() => {
    setConfigDialogOpen(true);
  }, []);

  const handleCloseConfigDialog = useCallback(() => {
    setConfigDialogOpen(false);
  }, []);

  const handleSaveConfiguration = useCallback(async (emails: string) => {
    try {
      const response = await fetch('/api/admin/antraege/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientEmails: emails }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      // Configuration saved successfully
      return;
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }, []);


  // Get empty state message
  const getEmptyStateMessage = () => {
    const hasFilters = searchFilter || (statusFilter && statusFilter !== 'all');
    
    if (hasFilters) {
      return 'Keine Anträge gefunden, die Ihren Filterkriterien entsprechen.';
    }
    
    return 'Keine Anträge vorhanden.';
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
      
        <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          {/* Admin Navigation */}
          <AdminNavigation />
          
          {/* Page Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <AdminPageHeader 
              title="Anträge verwalten"
              icon={<GavelIcon />}
            />
            <Tooltip title="E-Mail-Empfänger konfigurieren">
              <IconButton
                onClick={handleOpenConfigDialog}
                color="primary"
                sx={{
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.12)',
                  },
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
          

          {/* Filters */}
          <Box sx={{ mt: 3 }}>
            <AntraegeFilters
              onSearchChange={handleSearchChange}
              onStatusChange={handleStatusChange}
              onClearFilters={handleClearFilters}
              currentSearch={searchFilter}
              currentStatus={statusFilter}
              isLoading={adminState.loading}
            />
          </Box>

          {adminState.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : adminState.error ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{adminState.error}</Typography>
            </Paper>
          ) : adminState.items.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {getEmptyStateMessage()}
              </Typography>
            </Paper>
          ) : (
            <AntraegeTable
              antraege={adminState.items}
              currentView="all"
              onArchive={handleArchiveAntrag}
              onRefresh={() => fetchAntraege(searchFilter, statusFilter)}
              onShowNotification={adminState.showNotification}
              timestamp={adminState.timestamp}
            />
          )}
          
          {/* Pagination */}
          <AdminPagination 
            page={adminState.page}
            totalPages={adminState.totalPages}
            pageSize={adminState.pageSize}
            onPageChange={(page) => adminState.setPage(page)}
            onPageSizeChange={(size) => adminState.setPageSize(size)}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </Container>
      </Box>

      {/* Notification */}
      <AdminNotification 
        notification={adminState.notification}
        onClose={adminState.closeNotification}
      />

      {/* Configuration Dialog */}
      <ConfigurationDialog
        open={configDialogOpen}
        onClose={handleCloseConfigDialog}
        onSave={handleSaveConfiguration}
        onShowNotification={adminState.showNotification}
      />
    </MainLayout>
  );
}

export default function AdminAntraegePage() {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <AdminAntraegePageContent />
    </Suspense>
  );
}