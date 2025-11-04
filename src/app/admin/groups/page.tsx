// src/app/admin/groups/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusTabs from '@/components/admin/tables/AdminStatusTabs';
import AdminPagination from '@/components/admin/tables/AdminPagination';
import AdminNotification from '@/components/admin/AdminNotification';
import SearchFilterBar from '@/components/admin/tables/SearchFilterBar';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useAdminState } from '@/hooks/useAdminState';

// Import the EditGroupForm and its types
import EditGroupForm, { InitialGroupData, EditGroupFormInput } from '@/components/forms/groups/EditGroupForm'; // Adjust path
import GroupSettingsDialog from '@/components/admin/groups/GroupSettingsDialog';

import {
  Box, Typography, Paper, IconButton, Container, Button, CircularProgress, Grid, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Accordion, AccordionSummary, AccordionDetails, Avatar, List, ListItem, ListItemText,
  Divider, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import SettingsIcon from '@mui/icons-material/Settings';

import { Group, GroupStatus, ResponsiblePerson } from '@prisma/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { stripHtmlTags } from '@/lib/sanitization/sanitize';
import SafeHtml from '@/components/ui/SafeHtml';

interface AdminGroupResponsibleUser {
  id: string;
  userId: string;
  groupId: string;
  assignedAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface AdminGroup extends Group {
  responsiblePersons: ResponsiblePerson[];
  responsibleUsers?: AdminGroupResponsibleUser[];
  _count?: { statusReports?: number; };
}

export default function AdminGroupsPage() {
  const adminState = useAdminState<AdminGroup>();

  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  interface NewGroupSimpleData {
    name: string;
    slug: string;
    description: string;
    status: GroupStatus; // Explicitly type status with the enum
  }

  const [newGroupSimpleData, setNewGroupSimpleData] = useState<NewGroupSimpleData>({ 
    name: '', 
    slug: '', 
    description: '', 
    status: GroupStatus.NEW 
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDeleteId, setGroupToDeleteId] = useState<string | null>(null);

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  type ViewType = GroupStatus | 'ALL';
  const views: ViewType[] = [GroupStatus.NEW, GroupStatus.ACTIVE, GroupStatus.ARCHIVED, 'ALL'];
  const currentView = views[adminState.tabValue];

  const statusOptions: ReadonlyArray<{ value: GroupStatus, label: string, color: 'info' | 'success' | 'default' }> = [
    { value: GroupStatus.NEW, label: 'Neu', color: 'info' },
    { value: GroupStatus.ACTIVE, label: 'Aktiv', color: 'success' },
    { value: GroupStatus.ARCHIVED, label: 'Archiviert', color: 'default' },
  ] as const;

  const fetchGroups = useCallback(async () => {
    try {
      adminState.setLoading(true);
      const statusFilter = currentView !== 'ALL' ? `&status=${currentView}` : '';
      const searchFilter = adminState.searchTerm ? `&search=${encodeURIComponent(adminState.searchTerm)}` : '';
      const response = await fetch(
        `/api/admin/groups?page=${adminState.page}&pageSize=${adminState.pageSize}${statusFilter}${searchFilter}&orderBy=name&orderDirection=asc&t=${adminState.timestamp}`
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to fetch groups and parse error' }));
        throw new Error(errData.error || errData.message || 'Failed to fetch groups');
      }
      const data = await response.json();
      
      if (data && Array.isArray(data.groups)) {
        adminState.setItems(data.groups);
        adminState.setPaginationData({
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 1,
        });
      } else {
        adminState.setItems([]);
        adminState.setPaginationData({ totalItems: 0, totalPages: 1 });
      }
      adminState.setError(null);
    } catch (err) {
      console.error('Error fetching groups:', err);
      adminState.setError(err instanceof Error ? err.message : 'Failed to load groups.');
    } finally {
      adminState.setLoading(false);
    }
  // We intentionally use individual adminState properties instead of the entire adminState object
  // to prevent infinite re-renders. The adminState object changes on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, adminState.page, adminState.pageSize, adminState.searchTerm, adminState.timestamp, adminState.setLoading, adminState.setItems, adminState.setPaginationData, adminState.setError]);

  useEffect(() => {
    fetchGroups();
  }, [adminState.tabValue, adminState.page, adminState.pageSize, adminState.searchTerm, adminState.timestamp, fetchGroups, currentView]);

  const handleOpenCreateGroupDialog = () => {
    setNewGroupSimpleData({ name: '', slug: '', description: '', status: GroupStatus.NEW });
    setCreateGroupDialogOpen(true);
  };

  const handleCreateSimpleGroup = async () => {
    // This should ideally also use FormData if logo/RPs are to be added on creation via EditGroupForm
    // For now, it's a simple JSON create.
    if (!newGroupSimpleData.name || !newGroupSimpleData.slug) {
      adminState.showNotification('Name und Slug sind erforderlich.', 'error');
      return;
    }
    try {
      // Ensure you have a POST handler at /api/admin/groups/route.ts that calls createGroup
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroupSimpleData), 
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.message || 'Failed to create group');
      }
      adminState.showNotification('Gruppe erfolgreich erstellt.', 'success');
      setCreateGroupDialogOpen(false);
      adminState.refreshTimestamp();
    } catch (err) {
      adminState.showNotification(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, 'error');
    }
  };

  const handleEditGroupFormSubmit = async (
    groupId: string,
    formData: EditGroupFormInput,
    newLogoFile: File | Blob | null
  ) => {
    const apiFormData = new FormData();

    // Always append all fields - let Zod validation handle what's valid
    apiFormData.append('name', formData.name);
    apiFormData.append('description', formData.description);
    apiFormData.append('status', formData.status);

    // Meeting fields - always send, even if empty
    apiFormData.append('regularMeeting', formData.regularMeeting || '');

    // Recurring meeting patterns - send as JSON string
    if (formData.recurringMeeting) {
      apiFormData.append('recurringMeeting', JSON.stringify(formData.recurringMeeting));
    }

    apiFormData.append('meetingStreet', formData.meetingStreet || '');
    apiFormData.append('meetingCity', formData.meetingCity || '');
    apiFormData.append('meetingPostalCode', formData.meetingPostalCode || '');
    apiFormData.append('meetingLocationDetails', formData.meetingLocationDetails || '');

    if (newLogoFile) {
      apiFormData.append('logo', newLogoFile);
    }

    // Responsible persons - always send count and data
    const responsiblePersons = formData.responsiblePersons || [];
    apiFormData.append('responsiblePersonsCount', responsiblePersons.length.toString());

    responsiblePersons.forEach((person: { firstName: string; lastName: string; email: string }, index: number) => {
      apiFormData.append(`responsiblePerson[${index}].firstName`, person.firstName);
      apiFormData.append(`responsiblePerson[${index}].lastName`, person.lastName);
      apiFormData.append(`responsiblePerson[${index}].email`, person.email);
    });

    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: 'PUT',
        body: apiFormData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update group');
      }
      adminState.showNotification('Gruppe erfolgreich aktualisiert.', 'success');
      setEditingGroupId(null);
      adminState.refreshTimestamp();
    } catch (err) {
      adminState.showNotification(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler.'}`, 'error');
      throw err; // Re-throw for form's internal error handling
    }
  };

  const handleEditGroupFormCancel = () => {
    setEditingGroupId(null);
  };
  
  const handleUpdateGroupStatus = async (groupId: string, newStatus: GroupStatus) => {
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.message || 'Status-Update fehlgeschlagen');
      }
      adminState.showNotification('Gruppenstatus erfolgreich aktualisiert.', 'success');
      adminState.refreshTimestamp();
    } catch (err) {
      adminState.showNotification(`Fehler beim Aktualisieren des Gruppenstatus: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, 'error');
    }
  };

  const openDeleteGroupConfirm = (id: string) => { setGroupToDeleteId(id); setDeleteDialogOpen(true); };
  const handleDeleteGroup = async () => {
    if (!groupToDeleteId) return;
    try {
      const response = await fetch(`/api/admin/groups/${groupToDeleteId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.message || 'Löschen fehlgeschlagen');
      }
      adminState.showNotification('Gruppe gelöscht.', 'success');
      setDeleteDialogOpen(false);
      adminState.refreshTimestamp();
    } catch (err) {
      adminState.showNotification(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, 'error');
    }
  };
  
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); adminState.setPage(1); fetchGroups(); };

  const getGroupStatusInfo = (statusValue: GroupStatus) => {
    return statusOptions.find(s => s.value === statusValue) || { value: statusValue, label: String(statusValue), color: 'default' };
  };
  const getGroupTabLabel = (view: ViewType): string => {
    if (view === 'ALL') return 'Alle Gruppen';
    return getGroupStatusInfo(view).label || String(view);
  };
  const getGroupEmptyStateMessage = (view: ViewType): string => {
    if (view === 'ALL') return 'Keine Gruppen gefunden.';
    const statusLabel = getGroupStatusInfo(view).label.toLowerCase();
    const pluralizedStatus = statusLabel.endsWith('e') ? statusLabel + 'n' : statusLabel + (statusLabel.endsWith('s') ? '' : 'e');
    return `Keine ${pluralizedStatus} Gruppen gefunden.`;
  };

  return (
    <MainLayout breadcrumbs={[ { label: 'Start', href: '/' }, { label: 'Administration', href: '/admin'}, { label: 'Gruppen', href: '/admin/groups', active: true } ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          <AdminNavigation />
          <AdminPageHeader title="Gruppen verwalten" icon={<GroupsIcon />} />
          <SearchFilterBar searchTerm={adminState.searchTerm} onSearchChange={(e) => adminState.setSearchTerm(e.target.value)} onClearSearch={() => adminState.setSearchTerm('')} onSearch={handleSearch}>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              color="primary"
              size="medium"
              onClick={() => setSettingsDialogOpen(true)}
              title="Gruppeneinstellungen"
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>
            <Button disabled={true} variant="contained" startIcon={<GroupsIcon />} onClick={handleOpenCreateGroupDialog}>Neue Gruppe</Button>
          </SearchFilterBar>
          <AdminStatusTabs 
            value={adminState.tabValue}
            onChange={(_, newValue) => { adminState.setTabValue(newValue); setEditingGroupId(null); setExpandedAccordionId(null); }}
            tabs={views.map(view => getGroupTabLabel(view))}
          />

          {adminState.loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          : adminState.error ? <Paper sx={{ p: 3, textAlign: 'center' }}><Typography color="error">{adminState.error}</Typography></Paper>
          : adminState.items.length === 0 ? (
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">{getGroupEmptyStateMessage(currentView)}</Typography>
              <Button variant="outlined" sx={{ mt: 2 }} startIcon={<GroupsIcon />} onClick={handleOpenCreateGroupDialog}>Gruppe erstellen</Button>
            </Paper>
          ) : (
            <Grid container spacing={2} sx={{mt: 0}}>
              {adminState.items.map((group) => {
                const groupStatusInfo = getGroupStatusInfo(group.status);
                const isEditingThisGroup = editingGroupId === group.id;

                // Prepare data for EditGroupForm, ensuring responsiblePersons is an array
                const initialFormDataForGroupEdit: InitialGroupData | null = isEditingThisGroup ? {
                  id: group.id, name: group.name, slug: group.slug, description: group.description || '',
                  logoUrl: group.logoUrl, metadata: group.metadata, status: group.status,
                  responsiblePersons: group.responsiblePersons || [], // Ensure it's an array
                  responsibleUsers: (group.responsibleUsers || []).map((ru) => ({
                    id: ru.id,
                    userId: ru.userId,
                    groupId: ru.groupId,
                    assignedAt: ru.assignedAt.toISOString ? ru.assignedAt.toISOString() : ru.assignedAt.toString(),
                    user: {
                      id: ru.user.id,
                      firstName: ru.user.firstName,
                      lastName: ru.user.lastName,
                      email: ru.user.email
                    }
                  })),
                  recurringPatterns: group.recurringPatterns,
                  meetingTime: group.meetingTime,
                  meetingStreet: group.meetingStreet,
                  meetingCity: group.meetingCity,
                  meetingPostalCode: group.meetingPostalCode,
                  meetingLocationDetails: group.meetingLocationDetails
                } : null;

                return (
                  <Grid size={{ xs: 12 }} key={group.id}>
                    <Accordion
                      expanded={expandedAccordionId === group.id}
                      onChange={(_, isExpanded) => {
                        setExpandedAccordionId(isExpanded ? group.id : null);
                        if (!isExpanded && editingGroupId === group.id) setEditingGroupId(null);
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`group-${group.id}-content`}
                        id={`group-${group.id}-header`}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, pr: 2, overflow: 'hidden' }}>
                            <Avatar src={group.logoUrl || undefined} sx={{ mr: 2, width: 40, height: 40, bgcolor: 'primary.light' }}>
                              {group.name ? group.name.charAt(0).toUpperCase() : <GroupsIcon />}
                            </Avatar>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>{group.name}</Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {group.description ? stripHtmlTags(group.description).substring(0, 80) + (group.description.length > 80 ? '...' : '') : 'Keine Beschreibung'}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                            {group.status === GroupStatus.NEW && currentView === GroupStatus.NEW && (
                              <>
                                <IconButton component="span" color="success" size="small" title="Gruppe aktivieren"
                                  sx={{ borderRadius: 1, bgcolor: 'rgba(46, 125, 50, 0.08)', '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.12)'}, px:1}}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateGroupStatus(group.id, GroupStatus.ACTIVE); }}>
                                  <CheckCircleIcon fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="button">Aktivieren</Typography>
                                </IconButton>
                                <IconButton component="span" color="warning" size="small" title="Gruppe archivieren"
                                  sx={{ borderRadius: 1, bgcolor: 'rgba(237, 108, 0, 0.08)', '&:hover': { bgcolor: 'rgba(237, 108, 0, 0.12)'}, px:1}}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateGroupStatus(group.id, GroupStatus.ARCHIVED); }}>
                                  <ArchiveIcon fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="button">Archivieren</Typography>
                                </IconButton>
                              </>
                            )}
                            {!(group.status === GroupStatus.NEW && currentView === GroupStatus.NEW) && (
                               <Chip label={groupStatusInfo.label} color={groupStatusInfo.color} size="small" variant="outlined" sx={{ mr: 0.5 }}/>
                            )}
                           
                            <IconButton component="span" color="primary" size="small" 
                              sx={{ borderRadius: 1, bgcolor: 'rgba(25, 118, 210, 0.08)', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.12)'}, px:1}}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEditingThisGroup) setEditingGroupId(null);
                                else { setEditingGroupId(group.id); setExpandedAccordionId(group.id); }
                              }}
                            >
                              <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
                              <Typography variant="button">{isEditingThisGroup ? "Abbrechen" : "Bearbeiten"}</Typography>
                            </IconButton>
                          </Box>
                        </Box>
                      </AccordionSummary>
                        
                        <AccordionDetails>
                          <Divider sx={{ mb: 2 }} />
                        {isEditingThisGroup && initialFormDataForGroupEdit ? (
                          <EditGroupForm
                            group={initialFormDataForGroupEdit}
                            onSubmit={(data, logo) => handleEditGroupFormSubmit(group.id, data, logo)}
                            onCancel={handleEditGroupFormCancel}
                            onResponsibleUserChange={fetchGroups}
                          />
                        ) : (
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 8 }}>
                              <Typography variant="h6" gutterBottom>Beschreibung</Typography>
                              <SafeHtml html={group.description || "<em>Keine Beschreibung vorhanden.</em>"} />
                              
                              {/* Responsible Persons Section - View Only */}
                              <Box sx={{mt: 3}}>
                                <Typography variant="h6" gutterBottom>Verantwortliche Personen</Typography>

                                {/* Email-based Responsible Persons */}
                                {group.responsiblePersons && group.responsiblePersons.length > 0 && (
                                  <Box sx={{mb: 2}}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                      E-Mail-basiert
                                    </Typography>
                                    <List dense>
                                      {group.responsiblePersons.map(rp => (
                                        <ListItem
                                          key={rp.id}
                                          disableGutters
                                          sx={{
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                            mb: 0.5,
                                            pl: 1
                                          }}
                                        >
                                          <Chip
                                            label="E-Mail"
                                            size="small"
                                            color="default"
                                            sx={{ mr: 1 }}
                                          />
                                          <ListItemText
                                            primary={`${rp.firstName} ${rp.lastName}`}
                                            secondary={rp.email}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}

                                {/* User-based Responsible Persons - Display Only */}
                                {group.responsibleUsers && group.responsibleUsers.length > 0 && (
                                  <Box sx={{mt: 2}}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                      Benutzer-basiert
                                    </Typography>
                                    <List dense>
                                      {group.responsibleUsers.map(ru => (
                                        <ListItem
                                          key={ru.id}
                                          disableGutters
                                          sx={{
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                            mb: 0.5,
                                            pl: 1
                                          }}
                                        >
                                          <Chip
                                            label="Benutzer"
                                            size="small"
                                            color="primary"
                                            sx={{ mr: 1 }}
                                          />
                                          <ListItemText
                                            primary={`${ru.user.firstName || ''} ${ru.user.lastName || ''}`.trim() || ru.user.email}
                                            secondary={ru.user.email}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  </Box>
                                )}

                                {/* No responsible persons at all */}
                                {(!group.responsiblePersons || group.responsiblePersons.length === 0) &&
                                 (!group.responsibleUsers || group.responsibleUsers.length === 0) && (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    Noch keine verantwortlichen Personen zugewiesen.
                                  </Typography>
                                )}
                              </Box>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="h6" gutterBottom>Details</Typography>
                              <Box sx={{ mb: 1 }}><Typography variant="body2"><strong>ID:</strong> {group.id}</Typography></Box>
                              <Box sx={{ mb: 1 }}><Typography variant="body2"><strong>Slug:</strong> {group.slug}</Typography></Box>
                              <Box sx={{ mb: 1 }}><Typography variant="body2"><strong>Status:</strong> <Chip component="span" label={groupStatusInfo.label} color={groupStatusInfo.color} size="small"/></Typography></Box>
                              <Box sx={{ mb: 1 }}><Typography variant="body2"><strong>Erstellt:</strong> {format(new Date(group.createdAt), 'PPpp', {locale: de})}</Typography></Box>
                              <Box sx={{ mb: 1 }}><Typography variant="body2"><strong>Aktualisiert:</strong> {format(new Date(group.updatedAt), 'PPpp', {locale: de})}</Typography></Box>
                              {group.logoUrl && (
                                <Box sx={{mt:2}}>
                                  <Typography variant="subtitle2" gutterBottom>Logo:</Typography>
                                  <Box component="img" src={group.logoUrl} alt={`${group.name} Logo`} sx={{maxWidth: '100px', maxHeight: '100px', borderRadius: '4px', border: '1px solid #ddd'}}/>
                                </Box>
                              )}
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                                {currentView === GroupStatus.NEW && group.status === GroupStatus.NEW && (
                                  <>
                                    <Button variant="contained" color="success" startIcon={<CheckCircleIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ACTIVE)}>Aktivieren</Button>
                                    <Button variant="outlined" color="warning" startIcon={<ArchiveIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ARCHIVED)}>Archivieren</Button>
                                  </>
                                )}
                                {currentView === GroupStatus.ACTIVE && group.status === GroupStatus.ACTIVE && (
                                  <Button variant="outlined" color="warning" startIcon={<ArchiveIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ARCHIVED)}>Archivieren</Button>
                                )}
                                {currentView === GroupStatus.ARCHIVED && group.status === GroupStatus.ARCHIVED && (
                                  <>
                                    <Button variant="outlined" color="success" startIcon={<UnarchiveIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ACTIVE)}>Reaktivieren</Button>
                                    <Button variant="outlined" color="error" startIcon={<DeleteIcon/>} onClick={() => openDeleteGroupConfirm(group.id)}>Löschen</Button>
                                  </>
                                )}
                                {currentView === 'ALL' && (
                                  <>
                                    {group.status === GroupStatus.NEW && (
                                      <>
                                        <Button variant="contained" color="success" startIcon={<CheckCircleIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ACTIVE)}>Aktivieren</Button>
                                        <Button variant="outlined" color="warning" startIcon={<ArchiveIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ARCHIVED)}>Archivieren</Button>
                                      </>
                                    )}
                                    {group.status === GroupStatus.ACTIVE && (
                                      <Button variant="outlined" color="warning" startIcon={<ArchiveIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ARCHIVED)}>Archivieren</Button>
                                    )}
                                    {group.status === GroupStatus.ARCHIVED && (
                                      <Button variant="outlined" color="success" startIcon={<UnarchiveIcon/>} onClick={() => handleUpdateGroupStatus(group.id, GroupStatus.ACTIVE)}>Reaktivieren</Button>
                                    )}
                                    <Button variant="outlined" color="error" startIcon={<DeleteIcon/>} onClick={() => openDeleteGroupConfirm(group.id)}>Löschen</Button>
                                  </>
                                )}
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
          <AdminPagination page={adminState.page} totalPages={adminState.totalPages} pageSize={adminState.pageSize} onPageChange={(p) => adminState.setPage(p)} onPageSizeChange={(s) => adminState.setPageSize(s)} pageSizeOptions={[5,10,25,50]}/>
        </Container>
      </Box>
      <AdminNotification notification={adminState.notification} onClose={adminState.closeNotification} />
      <Dialog open={createGroupDialogOpen} onClose={() => setCreateGroupDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Neue Gruppe erstellen</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Gruppenname" fullWidth variant="outlined" value={newGroupSimpleData.name} onChange={e => setNewGroupSimpleData(s => ({...s, name: e.target.value}))} />
          <TextField margin="dense" label="Slug" fullWidth variant="outlined" value={newGroupSimpleData.slug} onChange={e => setNewGroupSimpleData(s => ({...s, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}))} helperText="Wird für die URL verwendet (z.B. meine-tolle-gruppe)"/>
          <TextField margin="dense" label="Beschreibung (Kurz)" fullWidth multiline rows={3} variant="outlined" value={newGroupSimpleData.description} onChange={e => setNewGroupSimpleData(s => ({...s, description: e.target.value}))} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Initialer Status</InputLabel>
            <Select value={newGroupSimpleData.status} label="Initialer Status" onChange={e => setNewGroupSimpleData(s => ({...s, status: e.target.value as GroupStatus}))}>
                {statusOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGroupDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleCreateSimpleGroup} variant="contained">Erstellen</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog open={deleteDialogOpen} title="Gruppe löschen" message="Diese Gruppe wirklich löschen? Alle zugehörigen Daten (Statusberichte, etc.) gehen dabei verloren." confirmText="Löschen" cancelText="Abbrechen" confirmColor="error" confirmIcon={<DeleteIcon />} onConfirm={handleDeleteGroup} onCancel={() => setDeleteDialogOpen(false)} />
      <GroupSettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        onSave={() => {
          adminState.showNotification('Gruppeneinstellungen erfolgreich gespeichert.', 'success');
        }}
      />
    </MainLayout>
  );
}