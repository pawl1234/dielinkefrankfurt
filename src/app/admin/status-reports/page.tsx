'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  FormGroup,
  FormControlLabel,
  Switch,
  Snackbar,
  Tooltip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Archive as ArchiveIcon,
  FilterAlt as FilterAltIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  SwapVert as SwapVertIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import AdminNavigation from '@/components/AdminNavigation';
import { StatusReport, Group } from '@prisma/client';

// Status tab types
type StatusTabValue = 'NEW' | 'ACTIVE' | 'ARCHIVED' | 'ALL';

export default function StatusReportsDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // State for status reports and filtering
  const [statusReports, setStatusReports] = useState<(StatusReport & { group: Group })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTabValue>('NEW');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderBy, setOrderBy] = useState<'createdAt' | 'title'>('createdAt');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // State for confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    action: async () => {}
  });

  // State for notifications
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // State for selected report for actions
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [sessionStatus, router]);

  // Fetch status reports when filters change
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchStatusReports();
      fetchGroups();
    }
  }, [statusTab, selectedGroupId, orderBy, orderDirection, page, pageSize, sessionStatus]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusTab, selectedGroupId, orderBy, orderDirection, searchQuery]);

  // Function to fetch status reports with current filters
  const fetchStatusReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('status', statusTab);
      if (selectedGroupId) params.append('groupId', selectedGroupId);
      if (searchQuery) params.append('search', searchQuery);
      params.append('orderBy', orderBy);
      params.append('orderDirection', orderDirection);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      // Add timestamp to prevent caching
      params.append('t', Date.now().toString());
      
      const res = await fetch(`/api/admin/status-reports?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch status reports');
      }
      
      const data = await res.json();
      setStatusReports(data.statusReports);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      
      // Adjust page if current page is higher than total pages
      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (err) {
      setError('Error loading status reports. Please try again.');
      console.error('Error fetching status reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch active groups for the filter
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/groups?status=ACTIVE');
      
      if (!res.ok) {
        throw new Error('Failed to fetch groups');
      }
      
      const data = await res.json();
      // Extract groups array from the response
      if (data && data.groups && Array.isArray(data.groups)) {
        setGroups(data.groups);
      } else {
        console.error('Unexpected groups data format:', data);
        setGroups([]);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    }
  };

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: StatusTabValue) => {
    setStatusTab(newValue);
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatusReports();
  };

  // Handle search clear
  const handleClearSearch = () => {
    setSearchQuery('');
    // Wait for state update and then fetch
    setTimeout(() => {
      fetchStatusReports();
    }, 0);
  };

  // Handle status change
  const handleStatusChange = async (reportId: string, newStatus: 'ACTIVE' | 'REJECTED' | 'ARCHIVED') => {
    try {
      const res = await fetch(`/api/admin/status-reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      
      // Update local state optimistically
      setStatusReports(prev => 
        prev.map(report => 
          report.id === reportId 
            ? { ...report, status: newStatus } 
            : report
        )
      );
      
      // Show success notification
      setNotification({
        open: true,
        message: `Status report ${newStatus === 'ACTIVE' ? 'activated' : newStatus === 'REJECTED' ? 'rejected' : 'archived'} successfully!`,
        severity: 'success'
      });
      
      // Refresh the list after a short delay
      setTimeout(() => {
        fetchStatusReports();
      }, 1500);
      
    } catch (err) {
      console.error('Error updating status:', err);
      setNotification({
        open: true,
        message: 'Failed to update status report status',
        severity: 'error'
      });
    }
  };

  // Handle report deletion
  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/status-reports/${reportId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete status report');
      }
      
      // Remove from local state
      setStatusReports(prev => prev.filter(report => report.id !== reportId));
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Status report deleted successfully!',
        severity: 'success'
      });
      
    } catch (err) {
      console.error('Error deleting status report:', err);
      setNotification({
        open: true,
        message: 'Failed to delete status report',
        severity: 'error'
      });
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action
    });
  };

  // Handle confirm dialog close
  const handleConfirmDialogClose = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // Handle confirm dialog confirm
  const handleConfirmDialogConfirm = async () => {
    await confirmDialog.action();
    handleConfirmDialogClose();
  };

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

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

  // If not authenticated, show loading state
  if (sessionStatus !== 'authenticated') {
    return (
      <MainLayout
      >
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Status Reports', href: '/admin/status-reports' }
      ]}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
        {/* Admin Navigation */}
        <AdminNavigation />
      
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Status Reports Dashboard
          </Typography>
          
          {/* Tabs for status filtering */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={statusTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="New" value="NEW" />
              <Tab label="Active" value="ACTIVE" />
              <Tab label="Archived" value="ARCHIVED" />
              <Tab label="All" value="ALL" />
            </Tabs>
          </Box>
          
          {/* Filter and search controls */}
          <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            {/* Group filter */}
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="group-filter-label">Filter by Group</InputLabel>
              <Select
                labelId="group-filter-label"
                id="group-filter"
                value={selectedGroupId}
                label="Filter by Group"
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                <MenuItem value="">All Groups</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Search box */}
            <form onSubmit={handleSearch} style={{ display: 'flex', flexGrow: 1 }}>
              <TextField
                label="Search Reports"
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  endAdornment: searchQuery && (
                    <IconButton 
                      size="small" 
                      onClick={handleClearSearch}
                      title="Clear search"
                    >
                      <ClearIcon />
                    </IconButton>
                  )
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={<SearchIcon />}
                sx={{ ml: 1 }}
              >
                Search
              </Button>
            </form>
            
            {/* Sort controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl size="small">
                <InputLabel id="sort-by-label">Sort By</InputLabel>
                <Select
                  labelId="sort-by-label"
                  id="sort-by"
                  value={orderBy}
                  label="Sort By"
                  onChange={(e) => setOrderBy(e.target.value as 'createdAt' | 'title')}
                  size="small"
                >
                  <MenuItem value="createdAt">Date</MenuItem>
                  <MenuItem value="title">Title</MenuItem>
                </Select>
              </FormControl>
              
              <Tooltip title={orderDirection === 'asc' ? 'Ascending' : 'Descending'}>
                <IconButton 
                  onClick={() => setOrderDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  color="primary"
                >
                  <SwapVertIcon 
                    sx={{ 
                      transform: orderDirection === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.3s'
                    }} 
                  />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Error alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          )}
          
          {/* Loading indicator */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* No results message */}
              {statusReports.length === 0 ? (
                <Alert severity="info" sx={{ my: 2 }}>
                  No status reports found with the current filters.
                </Alert>
              ) : (
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Showing {statusReports.length} of {totalItems} status report(s) found.
                </Typography>
              )}
              
              {/* Status reports grid */}
              <Grid container spacing={3}>
                {statusReports.map((report) => (
                  <Grid item xs={12} md={6} lg={4} key={report.id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                      {/* Status chip */}
                      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
                        <Chip 
                          label={report.status} 
                          color={
                            report.status === 'NEW' ? 'warning' : 
                            report.status === 'ACTIVE' ? 'success' : 
                            report.status === 'REJECTED' ? 'error' : 
                            'default'
                          }
                          size="small"
                        />
                      </Box>
                      
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="h2" gutterBottom noWrap title={report.title}>
                          {report.title}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Group:</strong> {report.group.name}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Reporter:</strong> {report.reporterFirstName} {report.reporterLastName}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Date:</strong> {formatDate(report.createdAt)}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mt: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {report.content.replace(/<[^>]*>?/gm, '')}
                        </Typography>
                        
                        {report.fileUrls && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            <strong>Attachments:</strong> {JSON.parse(report.fileUrls).length || 0} files
                          </Typography>
                        )}
                      </CardContent>
                      
                      <CardActions sx={{ pt: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {/* View button */}
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          component={Link}
                          href={`/admin/status-reports/${report.id}`}
                        >
                          View
                        </Button>
                        
                        {/* Status-specific action buttons */}
                        {report.status === 'NEW' && (
                          <>
                            <Button
                              size="small"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => openConfirmDialog(
                                'Aktivierung bestätigen',
                                `Sind Sie sicher, dass sie "${report.title}" aktivieren wollen? Der Eintrag wird damit öffentlich sichtbar.`,
                                async () => handleStatusChange(report.id, 'ACTIVE')
                              )}
                            >
                              Annehmen
                            </Button>
                            
                            <Button
                              size="small"
                              color="error"
                              startIcon={<BlockIcon />}
                              onClick={() => openConfirmDialog(
                                'Confirm Rejection',
                                `Are you sure you want to reject "${report.title}"? This will notify the reporter.`,
                                async () => handleStatusChange(report.id, 'REJECTED')
                              )}
                            >
                              Ablehnen
                            </Button>
                          </>
                        )}
                        
                        {report.status === 'ACTIVE' && (
                          <Button
                            size="small"
                            color="secondary"
                            startIcon={<ArchiveIcon />}
                            onClick={() => openConfirmDialog(
                              'Confirm Archiving',
                              `Are you sure you want to archive "${report.title}"? This will remove it from public view.`,
                              async () => handleStatusChange(report.id, 'ARCHIVED')
                            )}
                          >
                            Archivieren
                          </Button>
                        )}
                        
                        {/* Edit button - available for all statuses */}
                        <Button
                          size="small"
                          color="primary"
                          startIcon={<EditIcon />}
                          component={Link}
                          href={`/admin/status-reports/${report.id}/edit`}
                        >
                          Bearbeiten
                        </Button>
                        
                        {/* Delete button - available for all statuses */}
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => openConfirmDialog(
                            'Confirm Deletion',
                            `Are you sure you want to permanently delete "${report.title}"? This action cannot be undone.`,
                            async () => handleDeleteReport(report.id)
                          )}
                        >
                          Löschen
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                      disabled={page <= 1}
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      variant="outlined"
                    >
                      Previous
                    </Button>
                    
                    <Typography variant="body1">
                      Page {page} of {totalPages}
                    </Typography>
                    
                    <Button
                      disabled={page >= totalPages}
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      variant="outlined"
                    >
                      Next
                    </Button>
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel id="page-size-label">Items per page</InputLabel>
                      <Select
                        labelId="page-size-label"
                        value={pageSize}
                        label="Items per page"
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1); // Reset to first page when changing page size
                        }}
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Container>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDialogConfirm} color="error" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleNotificationClose} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}