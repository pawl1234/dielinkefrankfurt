'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { useDebounce } from '@/lib/hooks/useDebounce';
import NewsletterDetail from './NewsletterDetail';

// Interface for newsletter item
interface NewsletterItem {
  id: string;
  sentAt: string;
  subject: string;
  recipientCount: number;
  status: string;
}

// Interface for paginated response
interface PaginatedResponse {
  items: NewsletterItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Component for displaying newsletter archives and details
 */
export default function NewsletterArchives() {
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
  
  // Check for newsletterId in URL on initial load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newsletterId = urlParams.get('newsletterId');
    
    if (newsletterId) {
      setSelectedNewsletterId(newsletterId);
    }
  }, []);

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
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip label="Abgeschlossen" color="success" size="small" />;
      case 'processing':
        return <Chip label="In Bearbeitung" color="primary" size="small" />;
      case 'failed':
        return <Chip label="Fehlgeschlagen" color="error" size="small" />;
      case 'completed_with_errors':
        return <Chip label="Teilweise Fehlgeschlagen" color="warning" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  /**
   * Format date string
   */
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch (error) {
      return 'Ungültiges Datum';
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
                  <TableCell align="right">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {newsletters.map((newsletter) => (
                  <TableRow key={newsletter.id}>
                    <TableCell>
                      {formatDate(newsletter.sentAt)}
                    </TableCell>
                    <TableCell>
                      <Typography noWrap sx={{ maxWidth: { xs: 150, sm: 250, md: 400 } }}>
                        {newsletter.subject}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {newsletter.recipientCount}
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(newsletter.status)}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        onClick={() => handleViewNewsletter(newsletter.id)}
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                      >
                        Anzeigen
                      </Button>
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
}