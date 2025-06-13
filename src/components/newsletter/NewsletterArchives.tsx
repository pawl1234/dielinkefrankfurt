'use client';

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Link as MuiLink,
  Chip,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import Link from 'next/link';
import SearchFilterBar from '@/components/admin/tables/SearchFilterBar';
import AdminPagination from '@/components/admin/tables/AdminPagination';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import PreviewIcon from '@mui/icons-material/Preview';
import ReplayIcon from '@mui/icons-material/Replay';
import { useDebounce } from '@/lib/hooks/useDebounce';
import NewsletterDetail from './NewsletterDetail';

// Interface for newsletter item
interface NewsletterItem {
  id: string;
  sentAt?: string;
  createdAt?: string;
  subject: string;
  recipientCount?: number;
  status: string;
  type: 'draft' | 'sent';
  introductionText?: string;
}

// Interface for paginated response
interface PaginatedResponse {
  items: NewsletterItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NewsletterArchivesProps {
  onSendNewsletter?: (newsletter: NewsletterItem) => void;
  onEditDraft?: (newsletter: NewsletterItem) => void;
  onTestEmail?: (newsletter: NewsletterItem) => void;
  onPreview?: (newsletter: NewsletterItem) => void;
  onResendNewsletter?: (newsletter: NewsletterItem) => void;
}

export interface NewsletterArchivesRef {
  refresh: () => void;
}

/**
 * Component for displaying newsletter archives and details
 */
const NewsletterArchives = forwardRef<NewsletterArchivesRef, NewsletterArchivesProps>(({ 
  onSendNewsletter,
  onEditDraft,
  onTestEmail,
  onPreview,
  onResendNewsletter
}, ref) => {
  // State for newsletters data
  const [newsletters, setNewsletters] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // View state (list or detail)
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  
  // Auto-refresh state for newsletters in 'sending' status
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Check for newsletterId in URL on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newsletterId = urlParams.get('newsletterId');
    
    if (newsletterId) {
      setSelectedNewsletterId(newsletterId);
    }
  }, []);

  // Expose refresh function to parent component via ref
  useImperativeHandle(ref, () => ({
    refresh: fetchNewsletters
  }), [fetchNewsletters]);

  /**
   * Fetch newsletters from the API
   */
  const fetchNewsletters = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      
      if (debouncedSearchTerm) {
        queryParams.append('search', debouncedSearchTerm);
      }
      
      const response = await fetch(`/api/admin/newsletter/archives?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching newsletters: ${response.status}`);
      }
      
      const data: PaginatedResponse = await response.json();
      
      setNewsletters(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
    } catch (err) {
      console.error('Failed to fetch newsletters:', err);
      setError('Beim Laden der Newsletter ist ein Fehler aufgetreten.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearchTerm]);

  // Fetch newsletters when dependencies change
  useEffect(() => {
    if (!selectedNewsletterId) {
      fetchNewsletters();
    }
  }, [fetchNewsletters, selectedNewsletterId]);
  
  // Auto-refresh effect for newsletters with 'sending' status
  useEffect(() => {
    const hasSendingNewsletters = newsletters.some(newsletter => newsletter.status === 'sending');
    
    if (hasSendingNewsletters && !autoRefreshInterval) {
      // Start auto-refresh every 5 seconds if there are sending newsletters
      const interval = setInterval(() => {
        console.log('Auto-refreshing newsletters due to sending status');
        fetchNewsletters();
      }, 5000);
      
      setAutoRefreshInterval(interval);
    } else if (!hasSendingNewsletters && autoRefreshInterval) {
      // Stop auto-refresh if no newsletters are sending
      clearInterval(autoRefreshInterval);
      setAutoRefreshInterval(null);
    }
    
    // Cleanup on unmount
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [newsletters, autoRefreshInterval, fetchNewsletters]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
  };

  // Handle view newsletter detail
  const handleViewNewsletter = (id: string) => {
    setSelectedNewsletterId(id);
  };

  // Handle return to list
  const handleBackToList = () => {
    setSelectedNewsletterId(null);
  };

  /**
   * Get status chip based on newsletter status
   */
  const getStatusChip = (status: string, type: 'draft' | 'sent', sentAt?: string) => {
    switch (status) {
      case 'draft':
        return <Chip label="Entwurf" color="default" size="small" />;
      case 'sending':
        return <Chip label="Wird versendet" color="primary" size="small" />;
      case 'sent':
        return <Chip label="Versendet" color="success" size="small" />;
      case 'failed':
        return <Chip label="Fehlgeschlagen" color="error" size="small" />;
      case 'partially_failed':
        return <Chip label="Teilweise fehlgeschlagen" color="warning" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  /**
   * Format date string
   */
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };
  
  const handleDelete = async (newsletter: NewsletterItem) => {
    if (!confirm('Möchten Sie diesen Newsletter wirklich löschen?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/newsletter/archives/${newsletter.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete newsletter');
      }
      
      // Refresh the list
      fetchNewsletters();
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      setError('Beim Löschen des Newsletters ist ein Fehler aufgetreten.');
    }
  };

  // Handle successful newsletter deletion
  const handleNewsletterDeleted = (id: string) => {
    // Return to list view and refresh the list
    handleBackToList();
    fetchNewsletters();
  };

  // Show newsletter detail view
  if (selectedNewsletterId) {
    return <NewsletterDetail 
      id={selectedNewsletterId} 
      onBack={handleBackToList}
      onDelete={handleNewsletterDeleted}
      onResendNewsletter={onResendNewsletter}
    />;
  }

  return (
    <>
      {/* Search bar */}
      <SearchFilterBar 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onSearch={handleSearch}
      />
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Empty state */}
      {!loading && newsletters.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Keine Newsletter gefunden.
          {debouncedSearchTerm && (
            <span> Bitte passen Sie Ihre Suche an.</span>
          )}
        </Alert>
      )}
      
      {/* Newsletter table */}
      {!loading && newsletters.length > 0 && (
        <>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Betreff</TableCell>
                  <TableCell align="center">Empfänger</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {newsletters.map((newsletter) => (
                  <TableRow key={newsletter.id}>
                    <TableCell>
                      {formatDate(newsletter.sentAt || newsletter.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Typography noWrap sx={{ maxWidth: { xs: 150, sm: 250, md: 400 } }}>
                        {newsletter.subject}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {newsletter.recipientCount || '-'}
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(newsletter.status, newsletter.type, newsletter.sentAt)}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 0.5, 
                        justifyContent: 'center', 
                        flexWrap: 'wrap',
                        '& .MuiButton-root': {
                          minWidth: 'auto',
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem'
                        }
                      }}>
                        {newsletter.type === 'draft' ? (
                          <>
                            <Button
                              onClick={() => onEditDraft?.(newsletter)}
                              variant="outlined"
                              size="small"
                              title="Bearbeiten"
                            >
                              <EditIcon fontSize="small" />
                            </Button>
                            <Button
                              onClick={() => onPreview?.(newsletter)}
                              variant="outlined"
                              size="small"
                              title="Anzeigen"
                            >
                              <VisibilityIcon fontSize="small" />
                            </Button>
                            <Button
                              onClick={() => onSendNewsletter?.(newsletter)}
                              variant="outlined"
                              size="small"
                              color="primary"
                              title="Senden"
                            >
                              <SendIcon fontSize="small" />
                            </Button>
                            <Button
                              onClick={() => onTestEmail?.(newsletter)}
                              variant="outlined"
                              size="small"
                              title="Test-Email"
                            >
                              <EmailIcon fontSize="small" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(newsletter)}
                              variant="outlined"
                              size="small"
                              color="error"
                              title="Löschen"
                            >
                              <DeleteIcon fontSize="small" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleViewNewsletter(newsletter.id)}
                              variant="outlined"
                              size="small"
                              title="Anzeigen"
                            >
                              <VisibilityIcon fontSize="small" />
                            </Button>
                            {(newsletter.status === 'sent' || newsletter.status === 'failed' || newsletter.status === 'partially_failed') && (
                              <Button
                                onClick={() => onResendNewsletter?.(newsletter)}
                                variant="outlined"
                                size="small"
                                color="primary"
                                title="Erneut versenden"
                              >
                                <ReplayIcon fontSize="small" />
                              </Button>
                            )}
                            <Button
                              onClick={() => handleDelete(newsletter)}
                              variant="outlined"
                              size="small"
                              color="error"
                              title="Löschen"
                            >
                              <DeleteIcon fontSize="small" />
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
              Insgesamt {totalItems} Newsletter gefunden
            </Typography>
            <AdminPagination 
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </Box>
        </>
      )}
    </>
  );
});

NewsletterArchives.displayName = 'NewsletterArchives';

export default NewsletterArchives;