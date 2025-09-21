// AdminStatusReportsPage.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusTabs from '@/components/admin/tables/AdminStatusTabs';
import AdminPagination from '@/components/admin/tables/AdminPagination';
import AdminNotification from '@/components/admin/AdminNotification';
import SearchFilterBar from '@/components/admin/tables/SearchFilterBar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useAdminState } from '@/hooks/useAdminState';
import EditStatusReportForm, {
  InitialStatusReportData,
  StatusReportFormInput
} from '@/components/forms/status-reports/EditStatusReportForm';
import {
  Box, Typography, Paper, IconButton, Container, Button, CircularProgress, Grid, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Select,
  FormControl, InputLabel, Divider, Accordion, AccordionSummary,
  AccordionDetails
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';


import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { FileThumbnailGrid, parseFileUrls } from '@/components/ui/FileThumbnail';

// This is the main StatusReport type for this page, aligned with Prisma
interface StatusReport {
  id: string;
  title: string;
  content: string;
  status: StatusReportStatus; // Enum
  groupId: string;
  reporterFirstName: string;
  reporterLastName: string;
  createdAt: string;
  updatedAt: string;
  fileUrls?: string | null;
}

enum StatusReportStatus {
  NEW = "NEW",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  REJECTED = "REJECTED"
}

// Helper to map page's enum status to form's literal status
const mapToFormStatus = (status: StatusReportStatus): InitialStatusReportData['status'] => {
  switch (status) {
    case StatusReportStatus.NEW: return 'draft';
    case StatusReportStatus.ACTIVE: return 'published';
    case StatusReportStatus.ARCHIVED: return 'draft'; // Form might not have 'archived', map to 'draft' or preferred default
    case StatusReportStatus.REJECTED: return 'rejected';
    default: return 'draft';
  }
};

// Helper to map form's literal status back to page's enum status for API
const mapToApiStatus = (status: InitialStatusReportData['status']): StatusReportStatus => {
  switch (status) {
    case 'draft': return StatusReportStatus.NEW; 
    case 'published': return StatusReportStatus.ACTIVE;
    case 'rejected': return StatusReportStatus.REJECTED;
    default: return StatusReportStatus.NEW; // Fallback
  }
};


export default function AdminStatusReportsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const adminState = useAdminState<StatusReport>();

  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false);
  const [newReportData, setNewReportData] = useState<Partial<StatusReport>>({ 
    title: '', content: '', status: StatusReportStatus.NEW, groupId: '', reporterFirstName: '', reporterLastName: '', fileUrls: null
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<'title' | 'createdAt'>('createdAt');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');

  type ViewType = StatusReportStatus | 'ALL';
  const views: ViewType[] = [ StatusReportStatus.NEW, StatusReportStatus.ACTIVE, StatusReportStatus.ARCHIVED, StatusReportStatus.REJECTED, 'ALL'];
  const currentView = views[adminState.tabValue];

  const statusOptions: ReadonlyArray<{ value: StatusReportStatus, label: string, color: 'warning' | 'success' | 'default' | 'error' }> = [
    { value: StatusReportStatus.NEW, label: 'Neu', color: 'warning' },
    { value: StatusReportStatus.ACTIVE, label: 'Aktiv', color: 'success' },
    { value: StatusReportStatus.ARCHIVED, label: 'Archiviert', color: 'default' },
    { value: StatusReportStatus.REJECTED, label: 'Abgelehnt', color: 'error' },
  ] as const;

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/admin/login'); }, [authStatus, router]);

  const fetchStatusReports = useCallback(async () => { 
    try {
      adminState.setLoading(true);
      const statusFilter = currentView !== 'ALL' ? `&status=${currentView}` : '';
      const search = adminState.searchTerm ? `&search=${encodeURIComponent(adminState.searchTerm)}` : '';
      const response = await fetch(
        `/api/admin/status-reports?page=${adminState.page}&pageSize=${adminState.pageSize}${statusFilter}${search}&orderBy=${orderBy}&orderDirection=${orderDirection}&t=${adminState.timestamp}`
      );
      if (!response.ok) throw new Error('Failed to fetch status reports');
      const data = await response.json();
      if (data && Array.isArray(data.statusReports)) {
        adminState.setItems(data.statusReports);
        adminState.setPaginationData({ totalItems: data.totalItems || 0, totalPages: data.totalPages || 1 });
      } else {
        adminState.setItems([]);
        adminState.setPaginationData({ totalItems: 0, totalPages: 1 });
      }
      adminState.setError(null);
    } catch (err) {
      console.error(err);
      adminState.setError(err instanceof Error ? err.message : 'Failed to load status reports. Please try again.');
    } finally {
      adminState.setLoading(false);
    }
  // We intentionally use individual adminState properties instead of the entire adminState object
  // to prevent infinite re-renders. The adminState object changes on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps    
  }, [currentView, orderBy, orderDirection, adminState.page, adminState.pageSize, adminState.searchTerm, adminState.timestamp, adminState.setLoading, adminState.setItems, adminState.setPaginationData, adminState.setError]);

  useEffect(() => { 
    if (authStatus === 'authenticated') fetchStatusReports(); 
  }, [authStatus, adminState.tabValue, adminState.page, adminState.pageSize, adminState.searchTerm, orderBy, orderDirection, adminState.timestamp, fetchStatusReports]);

  const handleOpenCreateReportDialog = () => { 
    setNewReportData({ title: '', content: '', status: StatusReportStatus.NEW, groupId: '', reporterFirstName: '', reporterLastName: '', fileUrls: null }); 
    setCreateReportDialogOpen(true);
  };

  const handleCreateNewReport = async () => { 
    if (!newReportData.title || !newReportData.groupId || !newReportData.reporterFirstName || !newReportData.reporterLastName ) {
        adminState.showNotification('Titel, Gruppe und Reporter-Name sind erforderlich.', 'error');
        return;
    }
    try {
      // For creation, if it might involve files, this should also use FormData.
      // Assuming simple JSON for now.
      const reportToSave = {
        ...newReportData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as StatusReport; 

      const response = await fetch(`/api/admin/status-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(reportToSave),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create status report');
      }
      adminState.showNotification('Statusmeldung erfolgreich erstellt.', 'success');
      setCreateReportDialogOpen(false);
      adminState.refreshTimestamp();
    } catch (err) {
      console.error(err);
      adminState.showNotification(err instanceof Error ? err.message : 'Fehler beim Erstellen der Statusmeldung.', 'error');
    }
  };

  const handleEditFormSubmit = async (
    reportId: string,
    formDataFromForm: StatusReportFormInput, // Renamed to avoid confusion
    newFiles: (File | Blob)[],
    retainedExistingFileUrls: string[]
  ) => {
    const apiFormData = new FormData();
    apiFormData.append('id', reportId);
    apiFormData.append('groupId', formDataFromForm.groupId);
    apiFormData.append('title', formDataFromForm.title);
    apiFormData.append('content', formDataFromForm.content);
    apiFormData.append('reporterFirstName', formDataFromForm.reporterFirstName);
    apiFormData.append('reporterLastName', formDataFromForm.reporterLastName);
    apiFormData.append('status', mapToApiStatus(formDataFromForm.status));
    apiFormData.append('existingFileUrls', JSON.stringify(retainedExistingFileUrls));

    // Add file count and files with correct naming format
    if (newFiles.length > 0) {
      apiFormData.append('fileCount', newFiles.length.toString());
      newFiles.forEach((file, index) => {
        apiFormData.append(`file-${index}`, file);
      });
    }
    
    try {
      const response = await fetch('/api/admin/status-reports', { 
        method: 'PATCH', 
        body: apiFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status report');
      }

      adminState.showNotification('Statusmeldung erfolgreich aktualisiert.', 'success');
      setEditingReportId(null); 
      adminState.refreshTimestamp(); 
    } catch (err) {
      console.error('Error updating status report:', err);
      adminState.showNotification(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern.'}`, 'error');
      throw err; // Re-throw so form's own error handling can catch it if it wants
    }
  };

  const handleEditFormCancel = () => {
    setEditingReportId(null);
  };

  const handleUpdateReportStatus = async (reportId: string, newStatus: StatusReportStatus) => { 
     try {
      const response = await fetch(`/api/admin/status-reports`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: newStatus, updatedAt: new Date().toISOString() }),
      });
      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Failed to update status report status');
      }
      adminState.showNotification('Statusmeldung erfolgreich aktualisiert.', 'success');
      adminState.refreshTimestamp();
    } catch (err) {
      console.error(err);
      adminState.showNotification(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Statusmeldung.', 'error');
    }
  };

  const openDeleteConfirm = (id: string) => { setReportToDelete(id); setDeleteDialogOpen(true); };
  const handleDeleteReport = async () => { 
    if (reportToDelete === null) return;
    try {
      const response = await fetch(`/api/admin/status-reports?id=${reportToDelete}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to delete status report');
      }
      adminState.showNotification('Statusmeldung wurde erfolgreich gelöscht.', 'success');
      setDeleteDialogOpen(false);
      adminState.refreshTimestamp(); 
    } catch (err) {
      console.error(err);
      adminState.showNotification(err instanceof Error ? err.message : 'Fehler beim Löschen der Statusmeldung.', 'error');
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); adminState.setPage(1); fetchStatusReports(); };
  
  const resetFilters = () => {
    adminState.setSearchTerm('');
    setOrderBy('createdAt');
    setOrderDirection('desc');
    adminState.setPage(1);
  };
  
  const getStatusInfo = (statusValue: StatusReportStatus) => { 
      const info = statusOptions.find(s => s.value === statusValue);
      return info || { value: statusValue, label: String(statusValue), color: 'default' }; 
  };

  const getTabLabel = (view: ViewType): string => { 
    switch (view) {
      case StatusReportStatus.NEW: return 'Neue Meldungen';
      case StatusReportStatus.ACTIVE: return 'Aktive Meldungen';
      case StatusReportStatus.ARCHIVED: return 'Archivierte Meldungen';
      case StatusReportStatus.REJECTED: return 'Abgelehnte Meldungen';
      case 'ALL': return 'Alle Meldungen';
      default: return String(view);
    }
  };

  const getEmptyStateMessage = (view: ViewType): string => { 
    switch (view) {
      case StatusReportStatus.NEW: return 'Keine neuen Meldungen vorhanden.';
      case StatusReportStatus.ACTIVE: return 'Keine aktiven Meldungen vorhanden.';
      case StatusReportStatus.ARCHIVED: return 'Keine archivierten Meldungen vorhanden.';
      case StatusReportStatus.REJECTED: return 'Keine abgelehnten Meldungen vorhanden.';
      case 'ALL': return 'Keine Meldungen gefunden.';
      default: return 'Keine Meldungen gefunden.';
    }
  };

  const getReporterName = (report: Pick<StatusReport, 'reporterFirstName' | 'reporterLastName'>): string => { 
    if (report.reporterFirstName && report.reporterLastName) return `${report.reporterFirstName} ${report.reporterLastName}`;
    if (report.reporterFirstName) return report.reporterFirstName; 
    if (report.reporterLastName) return report.reporterLastName; 
    return 'N/A'; 
  };


  if (authStatus === 'loading' || authStatus === 'unauthenticated') return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin' },
        { label: 'Statusberichte', href: '/admin/status-reports', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          <AdminNavigation />
          <AdminPageHeader title="Statusmeldungen verwalten" icon={<AssessmentIcon />} />
          
          <SearchFilterBar searchTerm={adminState.searchTerm} onSearchChange={(e) => adminState.setSearchTerm(e.target.value)} onClearSearch={() => adminState.setSearchTerm('')} onSearch={handleSearch}>
            <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Sortieren nach</InputLabel><Select value={orderBy} label="Sortieren nach" onChange={(e) => setOrderBy(e.target.value as 'title' | 'createdAt')}><MenuItem value="title">Titel</MenuItem><MenuItem value="createdAt">Erstellungsdatum</MenuItem></Select></FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Reihenfolge</InputLabel><Select value={orderDirection} label="Reihenfolge" onChange={(e) => setOrderDirection(e.target.value as 'asc' | 'desc')}><MenuItem value="asc">Aufsteigend</MenuItem><MenuItem value="desc">Absteigend</MenuItem></Select></FormControl>
            <Button variant="outlined" onClick={resetFilters} sx={{ height: 40 }}>Filter zurücksetzen</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button disabled={true} variant="contained" startIcon={<AssessmentIcon />} onClick={handleOpenCreateReportDialog}>Neue Meldung</Button>
          </SearchFilterBar>
          
          <AdminStatusTabs 
            value={adminState.tabValue}
            onChange={(_, newValue) => {
              adminState.setTabValue(newValue);
              setEditingReportId(null); 
              setExpandedAccordionId(null); 
            }}
            tabs={views.map(view => getTabLabel(view))}
          />

          {adminState.loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          : adminState.error ? <Paper sx={{ p: 3, textAlign: 'center' }}><Typography color="error">{adminState.error}</Typography></Paper>
          : adminState.items.length === 0 ? ( 
             <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">{getEmptyStateMessage(currentView)}</Typography>
              <Button variant="outlined" sx={{ mt: 2 }} startIcon={<AssessmentIcon />} onClick={handleOpenCreateReportDialog}>Neue Meldung erstellen</Button>
            </Paper>
           )
          : (
            <Grid container spacing={2} sx={{mt: 0}}> 
              {adminState.items.map((report) => {
                const statusInfo = getStatusInfo(report.status);
                const isEditingThisReport = editingReportId === report.id;

                const initialFormDataForEdit: InitialStatusReportData | null = isEditingThisReport ? {
                  id: report.id,
                  groupId: report.groupId,
                  title: report.title,
                  content: report.content,
                  reporterFirstName: report.reporterFirstName,
                  reporterLastName: report.reporterLastName,
                  status: mapToFormStatus(report.status),
                  createdAt: report.createdAt,
                  updatedAt: report.updatedAt,
                  fileUrls: report.fileUrls || null,
                } : null;

                return (
                  <Grid size={{ xs: 12 }} key={report.id}> 
                    <Accordion 
                        expanded={expandedAccordionId === report.id}
                        onChange={(_event, isExpanded) => {
                            setExpandedAccordionId(isExpanded ? report.id : null);
                            if (!isExpanded && editingReportId === report.id) { 
                                setEditingReportId(null);
                            }
                        }}
                        sx={{}}
                    >
                      <AccordionSummary
                         expandIcon={<ExpandMoreIcon />}
                        aria-controls={`report-${report.id}-content`}
                        id={`report-${report.id}-header`}
                        sx={{
                          '& .MuiAccordionSummary-content': {
                            minWidth: 0,
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            flex: '1 1 0',
                            width: '100%'
                          }
                        }}
                      >
                         <Grid container spacing={1} alignItems="center" sx={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                          <Grid size={{ xs: 12, sm: 7, md: 8, lg: 9 }} sx={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                            <Box sx={{ 
                              minWidth: 0,
                              width: '100%',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                              flex: '1 1 0',
                              display: 'block',
                              '& > *': {
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                                display: 'block'
                              }
                            }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {report.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {getReporterName(report)} • {format(new Date(report.createdAt), 'PPP', { locale: de })}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 5, md: 4, lg: 3 }} sx={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 0.5, 
                              alignItems: 'center',
                              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                              minWidth: 0,
                              maxWidth: '100%',
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                              flexShrink: 0
                            }}>
                             {currentView === StatusReportStatus.NEW && report.status === StatusReportStatus.NEW && (
                              <>
                                <IconButton component="span" color="success" size="small" sx={{ minWidth: 40, minHeight: 40 }} onClick={(e) => { e.stopPropagation(); handleUpdateReportStatus(report.id, StatusReportStatus.ACTIVE); }}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                                <IconButton component="span" color="error" size="small" sx={{ minWidth: 40, minHeight: 40 }} onClick={(e) => { e.stopPropagation(); handleUpdateReportStatus(report.id, StatusReportStatus.REJECTED); }}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </>
                            )}
                            {((currentView === StatusReportStatus.ACTIVE && report.status === StatusReportStatus.ACTIVE) ||
                              (currentView === StatusReportStatus.ARCHIVED && report.status === StatusReportStatus.ARCHIVED) ||
                              (currentView === StatusReportStatus.REJECTED && report.status === StatusReportStatus.REJECTED) ||
                               currentView === 'ALL') 
                              && <Chip label={statusInfo.label} color={statusInfo.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} variant="outlined" size="small" sx={{mr:0.5}}/>}
                            
                            <IconButton component="span" color="primary" size="small" sx={{ minWidth: 40, minHeight: 40 }}
                              onClick={(e) => {
                                e.stopPropagation(); 
                                if (isEditingThisReport) {
                                    setEditingReportId(null);
                                } else {
                                    setEditingReportId(report.id);
                                    setExpandedAccordionId(report.id); 
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            </Box>
                          </Grid>
                        </Grid>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Divider sx={{ mb: 2 }} />
                        {isEditingThisReport && initialFormDataForEdit ? (
                          <EditStatusReportForm
                            statusReport={initialFormDataForEdit}
                            onSubmit={(data, newFiles, retainedUrls) => 
                              handleEditFormSubmit(report.id, data, newFiles, retainedUrls)
                            }
                            onCancel={handleEditFormCancel}
                          />
                        ) : (
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 8 }}>
                              <Typography variant="h6" gutterBottom>Details zur Meldung</Typography>
                              <Typography variant="body1" sx={{ mb: 1 }}
                                dangerouslySetInnerHTML={{ __html: report.content || "<p><em>Keine Beschreibung vorhanden.</em></p>" }} />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                               <Typography variant="h6" gutterBottom>Informationen</Typography>
                              <Box sx={{ mb: 2 }}><Typography variant="subtitle1">Gruppe ID:</Typography><Typography variant="body1">{report.groupId}</Typography></Box>
                              <Box sx={{ mb: 2 }}><Typography variant="subtitle1">Gemeldet von:</Typography><Typography variant="body1">{getReporterName(report)}</Typography></Box>
                              <Box sx={{ mb: 2 }}><Typography variant="subtitle1">Erstellt am:</Typography><Typography variant="body1">{format(new Date(report.createdAt), 'PPPp', { locale: de })}</Typography></Box>
                              {report.updatedAt && new Date(report.updatedAt).getTime() !== new Date(report.createdAt).getTime() && (
                                <Box sx={{ mb: 2 }}><Typography variant="subtitle1">Zuletzt aktualisiert:</Typography><Typography variant="body1">{format(new Date(report.updatedAt), 'PPPp', { locale: de })}</Typography></Box>
                              )}
                              <Box sx={{ mb: 2 }}><Typography variant="subtitle1">Status:</Typography><Chip label={getStatusInfo(report.status).label} color={getStatusInfo(report.status).color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} size="small"/></Box>
                            </Grid>
                            {report.fileUrls && parseFileUrls(report.fileUrls).length > 0 && (
                              <Grid size={{ xs: 12 }}>
                                <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>Anhänge</Typography>
                                <FileThumbnailGrid
                                  files={parseFileUrls(report.fileUrls)}
                                  gridSize={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                  height={140}
                                />
                              </Grid>
                            )}
                            <Grid size={{ xs: 12 }}>
                               <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                                    {report.status === StatusReportStatus.NEW && (
                                        <>
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleUpdateReportStatus(report.id, StatusReportStatus.ACTIVE)}>Aktivieren</Button>
                                            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleUpdateReportStatus(report.id, StatusReportStatus.REJECTED)}>Ablehnen</Button>
                                        </>
                                    )}
                                    {report.status === StatusReportStatus.ACTIVE && (
                                        <Button variant="outlined" onClick={() => handleUpdateReportStatus(report.id, StatusReportStatus.ARCHIVED)}>Archivieren</Button>
                                    )}
                                    {report.status === StatusReportStatus.ARCHIVED && (
                                        <Button variant="outlined" color="success" onClick={() => handleUpdateReportStatus(report.id, StatusReportStatus.ACTIVE)}>Wieder Aktivieren</Button>
                                    )}
                                    {report.status === StatusReportStatus.REJECTED && (
                                        <Button variant="outlined" color="primary" onClick={() => handleUpdateReportStatus(report.id, StatusReportStatus.NEW)}>Als &apos;Neu&apos; wiederherstellen</Button>
                                    )}
                                    <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => openDeleteConfirm(report.id)}>Löschen</Button>
                                </Box>
                            </Grid>
                          </Grid>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                );
              })}
            </Grid>
          )}
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
      <AdminNotification 
        notification={adminState.notification} 
        onClose={adminState.closeNotification} 
      />
      <Dialog open={createReportDialogOpen} onClose={() => setCreateReportDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Neue Statusmeldung erstellen</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField margin="normal" required fullWidth label="Titel" value={newReportData.title || ''} onChange={(e) => setNewReportData(prev => ({...prev, title: e.target.value}))} />
            <TextField margin="normal" required fullWidth label="Beschreibung" multiline rows={4} value={newReportData.content || ''} onChange={(e) => setNewReportData(prev => ({...prev, content: e.target.value}))} />
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField margin="normal" required fullWidth label="Gruppe ID" value={newReportData.groupId || ''} onChange={(e) => setNewReportData(prev => ({...prev, groupId: e.target.value}))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Status</InputLabel>
                        <Select value={newReportData.status || StatusReportStatus.NEW} label="Status" onChange={(e) => setNewReportData(prev => ({...prev, status: e.target.value as StatusReportStatus}))}>
                        {statusOptions.map((opt) => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField margin="normal" required fullWidth label="Vorname Reporter" value={newReportData.reporterFirstName || ''} onChange={(e) => setNewReportData(prev => ({...prev, reporterFirstName: e.target.value}))} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField margin="normal" required fullWidth label="Nachname Reporter" value={newReportData.reporterLastName || ''} onChange={(e) => setNewReportData(prev => ({...prev, reporterLastName: e.target.value}))} />
                </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateReportDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateNewReport} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog 
        open={deleteDialogOpen} 
        title="Statusmeldung löschen" 
        message="Möchten Sie diese Statusmeldung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden." 
        confirmText="Löschen" 
        cancelText="Abbrechen" 
        confirmColor="error" 
        confirmIcon={<DeleteIcon />} 
        onConfirm={handleDeleteReport} 
        onCancel={() => setDeleteDialogOpen(false)} 
      />
    </MainLayout>
  );
}