'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Grid,
  Link as MuiLink,
  Card,
  CardMedia,
  CardContent
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Archive as ArchiveIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { StatusReport, Group } from '@prisma/client';
import SafeHtml from '@/components/ui/SafeHtml';

export default function StatusReportDetail({ params }: { params: Promise<{ id: string }> }) {
  // State for status report data
  const [statusReport, setStatusReport] = useState<StatusReport & { group: Group } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fileUrls, setFileUrls] = useState<string[]>([]);

  // Extract params
  const [paramsId, setParamsId] = useState<string | null>(null);
  
  useEffect(() => {
    params.then(p => setParamsId(p.id));
  }, [params]);
  
  // Function to fetch status report details
  const fetchStatusReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const res = await fetch(`/api/admin/status-reports/${paramsId}?t=${timestamp}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch status report');
      }
      
      const data = await res.json();
      setStatusReport(data);
      
      // Parse file URLs if they exist
      if (data.fileUrls) {
        try {
          const urls = JSON.parse(data.fileUrls);
          setFileUrls(Array.isArray(urls) ? urls : []);
        } catch (e) {
          console.error('Error parsing file URLs:', e);
          setFileUrls([]);
        }
      }
    } catch (err) {
      setError('Error loading status report. Please try again.');
      console.error('Error fetching status report:', err);
    } finally {
      setLoading(false);
    }
  }, [paramsId]);

  // Fetch status report when page loads
  useEffect(() => {
    if (paramsId) {
      fetchStatusReport();
    }
  }, [paramsId, fetchStatusReport]);

  // Format date for display
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get file type and determine if it's an image
  const getFileInfo = (url: string) => {
    const filename = url.split('/').pop() || '';
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
    return { filename, extension, isImage };
  };

  return (
    <MainLayout title={statusReport?.title || 'Status Report Details'} breadcrumbs={[
      { label: 'Admin', href: '/admin' },
      { label: 'Status Reports', href: '/admin/status-reports' },
      { label: statusReport?.title || 'Details', href: `/admin/status-reports/${paramsId}` }
    ]}>
      <Container maxWidth="lg">
        {/* Admin Navigation */}
        <AdminNavigation />
        
        <Paper sx={{ p: 3, mb: 4 }}>
          {/* Back button */}
          <Button
            component={Link}
            href="/admin/status-reports"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            Back to Status Reports
          </Button>
          
          {/* Loading indicator */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          ) : statusReport ? (
            <Box>
              {/* Header with title and status */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h4" component="h1" sx={{ mr: 2 }}>
                  {statusReport.title}
                </Typography>
                <Chip 
                  label={statusReport.status} 
                  color={
                    statusReport.status === 'NEW' ? 'warning' : 
                    statusReport.status === 'ACTIVE' ? 'success' : 
                   // statusReport.status === 'REJECTED' ? 'error' : 
                    'default'
                  }
                />
              </Box>
              
              {/* Action buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {statusReport.status === 'NEW' && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => {
                        // Implement status change to ACTIVE
                        // Similar to the dashboard implementation
                      }}
                    >
                      Accept
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<BlockIcon />}
                      onClick={() => {
                        // Implement status change to REJECTED
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
                
                {statusReport.status === 'ACTIVE' && (
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<ArchiveIcon />}
                    onClick={() => {
                      // Implement status change to ARCHIVED
                    }}
                  >
                    Archive
                  </Button>
                )}
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EditIcon />}
                  component={Link}
                  href={`/admin/status-reports/${paramsId}/edit`}
                >
                  Edit
                </Button>
                
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    // Implement delete confirmation and action
                  }}
                >
                  Delete
                </Button>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* Report metadata */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Submitted By:</strong> {statusReport.reporterFirstName} {statusReport.reporterLastName}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Group:</strong> {statusReport.group.name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Submitted On:</strong> {formatDate(statusReport.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Last Updated:</strong> {formatDate(statusReport.updatedAt)}
                  </Typography>
                  {statusReport.status !== 'NEW' && (
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Status Changed:</strong> {statusReport.updatedAt ? formatDate(statusReport.updatedAt) : 'N/A'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
              
              {/* Report content */}
              <Typography variant="h5" gutterBottom>
                Report Content
              </Typography>
              
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}
              >
                <SafeHtml html={statusReport.content} />
              </Paper>
              
              {/* File attachments */}
              {fileUrls.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    <AttachFileIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Attachments ({fileUrls.length})
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {fileUrls.map((url, index) => {
                      const { filename, isImage } = getFileInfo(url);
                      
                      return (
                        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                          <Card variant="outlined">
                            {isImage ? (
                              <CardMedia
                                component="img"
                                height="140"
                                image={url}
                                alt={filename}
                                sx={{ objectFit: 'contain', bgcolor: 'grey.100' }}
                              />
                            ) : (
                              <Box 
                                sx={{ 
                                  height: 140, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  bgcolor: 'grey.100'
                                }}
                              >
                                <AttachFileIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                              </Box>
                            )}
                            
                            <CardContent sx={{ py: 1 }}>
                              <Typography variant="body2" noWrap title={filename}>
                                {filename}
                              </Typography>
                              
                              <Button
                                size="small"
                                startIcon={<DownloadIcon />}
                                component={MuiLink}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ mt: 1 }}
                              >
                                Download
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="warning">
              Status report not found.
            </Alert>
          )}
        </Paper>
      </Container>
    </MainLayout>
  );
}