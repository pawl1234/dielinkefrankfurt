// src/app/admin/faq/page.tsx
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
import RichTextEditor from '@/components/editor/RichTextEditor';
import SafeHtml from '@/components/ui/SafeHtml';
import { FAQ_TITLE_MAX_LENGTH, FAQ_CONTENT_MAX_LENGTH } from '@/lib/validation/faq-schema';

import {
  Box, Typography, Paper, IconButton, Container, Button, CircularProgress, Chip,
  Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

import { FaqStatus } from '@prisma/client';
import type { FaqEntryWithUsers } from '@/types/api-types';
import { FAQ_STATUS_OPTIONS } from '@/types/component-types';

export default function AdminFaqPage() {
  const adminState = useAdminState<FaqEntryWithUsers>();

  // Destructure to stabilize dependencies
  const { page, pageSize, searchTerm, timestamp, tabValue, setLoading, setItems, setPaginationData, setError } = adminState;

  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDeleteId, setFaqToDeleteId] = useState<string | null>(null);

  type ViewType = FaqStatus | 'ALL';
  const views: ViewType[] = [FaqStatus.ACTIVE, FaqStatus.ARCHIVED, 'ALL'];
  const currentView = views[tabValue];

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const statusFilter = currentView !== 'ALL' ? `&status=${currentView}` : '';
      const searchFilter = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const response = await fetch(
        `/api/admin/faq?page=${page}&pageSize=${pageSize}${statusFilter}${searchFilter}&t=${timestamp}`
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to fetch FAQs and parse error' }));
        throw new Error(errData.error || errData.message || 'Failed to fetch FAQs');
      }
      const data = await response.json();

      if (data && Array.isArray(data.faqs)) {
        setItems(data.faqs);
        setPaginationData({
          totalItems: data.totalItems || 0,
          totalPages: data.totalPages || 1,
        });
      } else {
        setItems([]);
      }

      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, page, pageSize, searchTerm, timestamp, setLoading, setItems, setPaginationData, setError]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleCreateFaq = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      adminState.setError('Titel und Inhalt sind erforderlich');
      return;
    }

    try {
      adminState.setLoading(true);
      const response = await fetch('/api/admin/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, status: 'ACTIVE' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create FAQ');
      }

      setCreateDialogOpen(false);
      setNewTitle('');
      setNewContent('');
      adminState.refreshTimestamp();
      adminState.showNotification('FAQ erfolgreich erstellt', 'success');
    } catch (error) {
      adminState.setError(error instanceof Error ? error.message : 'FAQ konnte nicht erstellt werden');
    } finally {
      adminState.setLoading(false);
    }
  };

  const handleStartEdit = (faq: FaqEntryWithUsers) => {
    setEditingFaqId(faq.id);
    setEditTitle(faq.title);
    setEditContent(faq.content);
    setExpandedAccordionId(faq.id);
  };

  const handleCancelEdit = () => {
    setEditingFaqId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) {
      adminState.setError('Titel und Inhalt sind erforderlich');
      return;
    }

    try {
      adminState.setLoading(true);
      const response = await fetch(`/api/admin/faq/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update FAQ');
      }

      setEditingFaqId(null);
      adminState.refreshTimestamp();
      adminState.showNotification('FAQ erfolgreich aktualisiert', 'success');
    } catch (error) {
      adminState.setError(error instanceof Error ? error.message : 'FAQ konnte nicht aktualisiert werden');
    } finally {
      adminState.setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      adminState.setLoading(true);
      const response = await fetch(`/api/admin/faq/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to archive FAQ');
      }

      adminState.refreshTimestamp();
      adminState.showNotification('FAQ erfolgreich archiviert', 'success');
    } catch (error) {
      adminState.setError(error instanceof Error ? error.message : 'FAQ konnte nicht archiviert werden');
    } finally {
      adminState.setLoading(false);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      adminState.setLoading(true);
      const response = await fetch(`/api/admin/faq/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to reactivate FAQ');
      }

      adminState.refreshTimestamp();
      adminState.showNotification('FAQ erfolgreich reaktiviert', 'success');
    } catch (error) {
      adminState.setError(error instanceof Error ? error.message : 'FAQ konnte nicht reaktiviert werden');
    } finally {
      adminState.setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setFaqToDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!faqToDeleteId) return;

    try {
      adminState.setLoading(true);
      const response = await fetch(`/api/admin/faq/${faqToDeleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete FAQ');
      }

      setDeleteDialogOpen(false);
      setFaqToDeleteId(null);
      adminState.refreshTimestamp();
      adminState.showNotification('FAQ erfolgreich gelöscht', 'success');
    } catch (error) {
      adminState.setError(error instanceof Error ? error.message : 'FAQ konnte nicht gelöscht werden');
    } finally {
      adminState.setLoading(false);
    }
  };

  const getStatusOption = (status: FaqStatus) => {
    return FAQ_STATUS_OPTIONS.find(opt => opt.value === status);
  };

  return (
    <MainLayout>
      <AdminNavigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <AdminPageHeader
          title="FAQ Verwaltung"
          icon={<HelpCenterIcon />}
        />

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <AdminStatusTabs
              tabs={['Aktiv', 'Archiviert', 'Alle']}
              value={adminState.tabValue}
              onChange={(_, newValue) => adminState.setTabValue(newValue)}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              Neue FAQ erstellen
            </Button>
          </Box>

          <SearchFilterBar
            searchTerm={adminState.searchTerm}
            onSearchChange={(e) => adminState.setSearchTerm(e.target.value)}
            onClearSearch={() => adminState.setSearchTerm('')}
            onSearch={(e) => { e.preventDefault(); adminState.refreshTimestamp(); }}
          />
        </Paper>

        <AdminNotification
          notification={adminState.notification}
          onClose={adminState.closeNotification}
        />

        {adminState.error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light' }}>
            <Typography color="error">{adminState.error}</Typography>
          </Paper>
        )}

        {adminState.loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : adminState.items.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Keine FAQ-Einträge gefunden</Typography>
          </Paper>
        ) : (
          <>
            {adminState.items.map((faq) => (
              <Accordion
                key={faq.id}
                expanded={expandedAccordionId === faq.id}
                onChange={() => setExpandedAccordionId(expandedAccordionId === faq.id ? null : faq.id)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>{faq.title}</Typography>
                    <Chip
                      label={getStatusOption(faq.status)?.label}
                      color={getStatusOption(faq.status)?.color}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {editingFaqId === faq.id ? (
                    <Box>
                      <TextField
                        fullWidth
                        label="Titel"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        sx={{ mb: 2 }}
                        inputProps={{ maxLength: FAQ_TITLE_MAX_LENGTH }}
                      />
                      <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        maxLength={FAQ_CONTENT_MAX_LENGTH}
                        placeholder="FAQ-Antwort eingeben..."
                        minHeight={200}
                      />
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSaveEdit(faq.id)}
                        >
                          Speichern
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={handleCancelEdit}
                        >
                          Abbrechen
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <SafeHtml html={faq.content} />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        Erstellt von: {faq.creator.username} | Aktualisiert von: {faq.updater.username}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <IconButton
                          color="primary"
                          onClick={() => handleStartEdit(faq)}
                          title="Bearbeiten"
                        >
                          <EditIcon />
                        </IconButton>
                        {faq.status === 'ACTIVE' ? (
                          <IconButton
                            color="warning"
                            onClick={() => handleArchive(faq.id)}
                            title="Archivieren"
                          >
                            <ArchiveIcon />
                          </IconButton>
                        ) : (
                          <>
                            <IconButton
                              color="success"
                              onClick={() => handleReactivate(faq.id)}
                              title="Reaktivieren"
                            >
                              <UnarchiveIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteClick(faq.id)}
                              title="Löschen"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}

            <AdminPagination
              page={adminState.page}
              totalPages={adminState.totalPages}
              pageSize={adminState.pageSize}
              onPageChange={(newPage) => adminState.setPage(newPage)}
              onPageSizeChange={(newPageSize) => adminState.setPageSize(newPageSize)}
            />
          </>
        )}

        {/* Create FAQ Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Neue FAQ erstellen</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Titel"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              sx={{ mt: 2, mb: 2 }}
              inputProps={{ maxLength: FAQ_TITLE_MAX_LENGTH }}
            />
            <RichTextEditor
              value={newContent}
              onChange={setNewContent}
              maxLength={FAQ_CONTENT_MAX_LENGTH}
              placeholder="FAQ-Antwort eingeben..."
              minHeight={200}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateFaq} variant="contained" color="primary">
              Erstellen
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onCancel={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="FAQ löschen"
          message="Sind Sie sicher, dass Sie diese FAQ dauerhaft löschen möchten?"
        />
      </Container>
    </MainLayout>
  );
}
