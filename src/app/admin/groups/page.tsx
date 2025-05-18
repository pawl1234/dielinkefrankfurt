'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  TextField,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Divider,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SortIcon from '@mui/icons-material/Sort';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import ArchiveIcon from '@mui/icons-material/Archive';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EventIcon from '@mui/icons-material/Event';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { Group as GroupType, GroupStatus } from '@prisma/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';

// Define response types
interface GroupsResponse {
  groups: GroupType[];
  totalItems?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

interface GroupStatusUpdateResponse {
  success: boolean;
  error?: string;
}

export default function AdminGroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [groupToChangeStatus, setGroupToChangeStatus] = useState<{ id: string, status: GroupStatus } | null>(null);
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9); // 9 items per page for 3x3 grid
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Define status types
  const statusValues: GroupStatus[] = ['NEW', 'ACTIVE', 'ARCHIVED'];
  const statusLabels: Record<GroupStatus, string> = {
    'NEW': 'Neue Anfragen',
    'ACTIVE': 'Aktive Gruppen',
    'ARCHIVED': 'Archiv'
  };

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // Add a timestamp state for cache busting
  const [timestamp, setTimestamp] = useState(() => Date.now());
  
  useEffect(() => {
    // Fetch groups when authenticated
    if (status === 'authenticated') {
      fetchGroups();
    }
  }, [status, tabValue, searchTerm, sortField, sortDirection, page, pageSize, timestamp]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [tabValue, searchTerm, sortField, sortDirection]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      // Build the query for groups based on filter criteria
      const selectedStatus = statusValues[tabValue];
      const params = new URLSearchParams();
      
      params.append('status', selectedStatus);
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      params.append('orderBy', sortField);
      params.append('orderDirection', sortDirection);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      params.append('t', Date.now().toString()); // Cache busting
      
      const response = await fetch(`/api/admin/groups?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data: GroupsResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setGroups(data.groups);
      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 1);
      setError(null);
      
      // Adjust page if current page is higher than total pages
      if (data.totalPages && data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (err) {
      setError('Failed to load groups. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleSortChange = (field: 'name' | 'createdAt') => {
    // Toggle direction if same field, otherwise set to asc
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleGroupAction = (action: 'view' | 'edit' | 'delete' | 'activate' | 'archive', group: GroupType) => {
    switch (action) {
      case 'view':
        router.push(`/admin/groups/${group.id}`);
        break;
      case 'edit':
        router.push(`/admin/groups/${group.id}/edit`);
        break;
      case 'delete':
        setGroupToDelete(group.id);
        setDeleteDialogOpen(true);
        break;
      case 'activate':
        setGroupToChangeStatus({ id: group.id, status: 'ACTIVE' });
        setStatusDialogOpen(true);
        break;
      case 'archive':
        setGroupToChangeStatus({ id: group.id, status: 'ARCHIVED' });
        setStatusDialogOpen(true);
        break;
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/groups/${groupToDelete}`, {
        method: 'DELETE',
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError);
        throw new Error('Failed to parse server response');
      }
      
      if (!response.ok || (data && !data.success)) {
        const errorMessage = (data && data.error) ? data.error : 'Failed to delete group';
        throw new Error(errorMessage);
      }
      
      // Success - refresh groups and show message
      setTimestamp(Date.now());
      setStatusUpdateMessage({
        type: 'success',
        message: 'Gruppe wurde erfolgreich gelöscht.'
      });
      
      setTimeout(() => {
        setStatusUpdateMessage(null);
      }, 5000);
      
    } catch (err) {
      setStatusUpdateMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Fehler beim Löschen der Gruppe.'
      });
      console.error('Error deleting group:', err);
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      setLoading(false);
    }
  };

  const handleUpdateGroupStatus = async () => {
    if (!groupToChangeStatus) return;
    
    try {
      setLoading(true);
      console.log(`Updating group ${groupToChangeStatus.id} status to ${groupToChangeStatus.status}`);
      
      // Debug the request
      const requestBody = JSON.stringify({ status: groupToChangeStatus.status });
      console.log("Request body:", requestBody);
      
      try {
        const response = await fetch(`/api/admin/groups/${groupToChangeStatus.id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });
  
        // Log all response headers for debugging
        console.log("Response headers:");
        response.headers.forEach((value, key) => {
          console.log(`${key}: ${value}`);
        });
  
        // Log the HTTP status
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        // Regardless of content type or response status, handle the response
        let responseText = "";
        try {
          responseText = await response.text();
          console.log("Raw response:", responseText);
        } catch (textError) {
          console.error("Failed to read response text:", textError);
        }
        
        // Try to parse as JSON if there's content
        let data: GroupStatusUpdateResponse | null = null;
        
        if (responseText && responseText.trim()) {
          try {
            data = JSON.parse(responseText) as GroupStatusUpdateResponse;
            console.log("Parsed JSON data:", data);
          } catch (jsonError) {
            console.warn("Not valid JSON response:", jsonError);
            // Not throwing error here, we'll handle it below
          }
        }
        
        // Response handling decision tree
        if (response.ok) {
          // Even if we couldn't parse JSON, treat 2xx status as success
          console.log("Response OK, treating as success");
          
          // If we do have parsed data and it explicitly says not success, log warning
          if (data && data.success === false) {
            console.warn("API returned OK status but success=false in body");
          }
          
          // Always continue with success flow for 2xx responses
          // This is a workaround for API inconsistencies
        } else {
          // For non-2xx responses
          let errorMessage = "Unknown server error";
          
          if (data && data.error) {
            errorMessage = data.error;
          } else if (responseText) {
            // Try to extract error message from HTML response
            const errorMatch = responseText.match(/<pre>(.*?)<\/pre>/s) || 
                              responseText.match(/Error: (.*?)(?:<br|$)/);
            if (errorMatch && errorMatch[1]) {
              errorMessage = errorMatch[1].trim();
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          }
          
          console.error("Error updating group status:", errorMessage);
          throw new Error(errorMessage);
        }
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          console.error("Fetch operation failed:", fetchError.message);
          throw fetchError; // Re-throw to be caught by the outer catch
        } else {
          console.error("Unknown fetch error:", fetchError);
          throw new Error("Network error occurred");
        }
      }
      
      // Success - refresh groups and show message
      setTimestamp(Date.now());
      
      const statusAction = groupToChangeStatus.status === 'ACTIVE' 
        ? 'aktiviert' 
        : groupToChangeStatus.status === 'ARCHIVED' 
        ? 'archiviert'
        : 'abgelehnt';
      
      setStatusUpdateMessage({
        type: 'success',
        message: `Gruppe wurde erfolgreich ${statusAction}.`
      });
      
      setTimeout(() => {
        setStatusUpdateMessage(null);
      }, 5000);
      
    } catch (err) {
      setStatusUpdateMessage({
        type: 'error',
        message: err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Gruppenstatus.'
      });
      console.error('Error updating group status:', err);
    } finally {
      setStatusDialogOpen(false);
      setGroupToChangeStatus(null);
      setLoading(false);
    }
  };

  // Get the status name for the dialog
  const getStatusAction = (status?: GroupStatus) => {
    if (!status) return '';
    
    switch (status) {
      case 'ACTIVE': return 'aktivieren';
      case 'ARCHIVED': return 'archivieren';
      default: return '';
    }
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
        { label: 'Administration', href: '/admin' },
        { label: 'Gruppen', href: '/admin/groups', active: true },
      ]}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          {/* Admin Navigation */}
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Admin Dashboard
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<EventIcon />}
                component={Link}
                href="/admin"
              >
                Termine
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<GroupIcon />}
                component={Link}
                href="/admin/groups"
                sx={{ fontWeight: 'bold' }}
              >
                Gruppen
              </Button>
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<MailOutlineIcon />}
                component={Link}
                href="/admin/status-reports"
              >
                Status Reports
              </Button>
            </Box>
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Gruppen verwalten
            </Typography>
          </Box>
          
          {statusUpdateMessage && (
            <Alert 
              severity={statusUpdateMessage.type} 
              sx={{ mb: 3 }}
              onClose={() => setStatusUpdateMessage(null)}
            >
              {statusUpdateMessage.message}
            </Alert>
          )}

          <Paper sx={{ p: 0, mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              {statusValues.map((status, index) => (
                <Tab key={status} label={statusLabels[status]} />
              ))}
            </Tabs>
          </Paper>

          <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Gruppen durchsuchen"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: '50%' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Nach Name sortieren">
                <Button
                  variant={sortField === 'name' ? 'contained' : 'outlined'}
                  color="primary"
                  size="small"
                  startIcon={<SortIcon />}
                  onClick={() => handleSortChange('name')}
                  endIcon={sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                >
                  Name
                </Button>
              </Tooltip>
              
              <Tooltip title="Nach Erstellungsdatum sortieren">
                <Button
                  variant={sortField === 'createdAt' ? 'contained' : 'outlined'}
                  color="primary"
                  size="small"
                  startIcon={<SortIcon />}
                  onClick={() => handleSortChange('createdAt')}
                  endIcon={sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                >
                  Datum
                </Button>
              </Tooltip>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="error">{error}</Typography>
            </Paper>
          ) : groups.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Keine {statusLabels[statusValues[tabValue]].toLowerCase()} gefunden.
              </Typography>
            </Paper>
          ): (
            <Grid container spacing={3}>
              {groups.map((group) => (
                <Grid key={group.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card variant="outlined" sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderLeft: 3,
                    borderLeftColor: () => {
                      switch (group.status) {
                        case 'NEW': return 'info.main';
                        case 'ACTIVE': return 'success.main';
                        case 'ARCHIVED': return 'text.disabled';
                        default: return 'grey.500';
                      }
                    }
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip 
                          label={(() => {
                            switch (group.status) {
                              case 'NEW': return 'Neu';
                              case 'ACTIVE': return 'Aktiv';
                              case 'ARCHIVED': return 'Archiviert';
                              default: return group.status;
                            }
                          })()} 
                          size="small"
                          color={(() => {
                            switch (group.status) {
                              case 'NEW': return 'info';
                              case 'ACTIVE': return 'success';
                              case 'ARCHIVED': return 'default';
                              default: return 'default';
                            }
                          })()}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(group.createdAt), 'dd.MM.yyyy', { locale: de })}
                        </Typography>
                      </Box>
                      
                      <Typography variant="h6" component="h2" gutterBottom noWrap>
                        {group.name}
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        mb: 1, 
                        height: 100, 
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        {group.logoUrl ? (
                          <Box 
                            component="img" 
                            src={group.logoUrl} 
                            alt={group.name}
                            sx={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'contain',
                              borderRadius: 1
                            }}
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: '100%', 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'grey.100',
                              borderRadius: 1
                            }}
                          >
                            <GroupIcon sx={{ fontSize: 40, color: 'grey.400' }} />
                          </Box>
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.5
                      }}>
                        {group.description.length > 150 
                          ? `${group.description.substring(0, 150)}...` 
                          : group.description}
                      </Typography>
                    </CardContent>
                    
                    <Divider />
                    
                    <CardActions sx={{ p: 1.5, gap: 0.5, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleGroupAction('view', group)}
                      >
                        Details
                      </Button>
                      
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleGroupAction('edit', group)}
                      >
                        Bearbeiten
                      </Button>
                      
        
                      {group.status === 'NEW' && (
                        <Button
                          size="small"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleGroupAction('activate', group)}
                        >
                          Aktivieren
                        </Button>
                      )}
                      
                      
                      {group.status === 'ACTIVE' && (
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<ArchiveIcon />}
                          onClick={() => handleGroupAction('archive', group)}
                        >
                          Archivieren
                        </Button>
                      )}
                      
                      {group.status === 'ARCHIVED' && (
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleGroupAction('delete', group)}
                        >
                          Löschen
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
          
            )}{totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    disabled={page <= 1}
                    onClick={ () => setPage(prev => Math.max(prev - 1, 1))}
                    variant="outlined"
                  >
                    Vorherige
                  </Button>
                  
                  <Typography variant="body1">
                    Seite {page} von {totalPages}
                  </Typography>
                  
                  <Button
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    variant="outlined"
                  >
                    Nächste
                  </Button>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="page-size-label">Elemente pro Seite</InputLabel>
                    <Select
                      labelId="page-size-label"
                      value={pageSize}
                      label="Elemente pro Seite"
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1); // Reset to first page when changing page size
                      }}
                    >
                      <MenuItem value={6}>6</MenuItem>
                      <MenuItem value={9}>9</MenuItem>
                      <MenuItem value={12}>12</MenuItem>
                      <MenuItem value={24}>24</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            )}
          {'}'}
        </Container>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Gruppe löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie diese Gruppe löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleDeleteGroup} 
            color="error" 
            variant="contained" 
            startIcon={<DeleteIcon />}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status change confirmation dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
      >
        <DialogTitle>Gruppenstatus ändern</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie diese Gruppe {getStatusAction(groupToChangeStatus?.status)} möchten?
          </DialogContentText>
          {groupToChangeStatus?.status === 'ACTIVE' && (
            <Typography component="div" sx={{ mt: 2, fontWeight: 'bold' }}>
              Bei Aktivierung wird eine Benachrichtigungs-E-Mail an die verantwortlichen Personen gesendet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Abbrechen</Button>
          <Button 
            onClick={handleUpdateGroupStatus} 
            color={
              groupToChangeStatus?.status === 'ACTIVE' ? 'success' : 
              'warning'
            } 
            variant="contained"
            startIcon={
              groupToChangeStatus?.status === 'ACTIVE' ? <CheckCircleIcon /> : 
              <ArchiveIcon />
            }
          >
            {groupToChangeStatus?.status === 'ACTIVE'
              ? 'Aktivieren'
              : 'Archivieren'
            }
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}