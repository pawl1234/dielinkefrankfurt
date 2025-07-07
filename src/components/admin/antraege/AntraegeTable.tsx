'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArchiveIcon from '@mui/icons-material/Archive';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { AntragPurposes } from '@/types/api-types';
import ViewAntragDialog from './ViewAntragDialog';
import EditAntragDialog from './EditAntragDialog';
import DeleteAntragDialog from './DeleteAntragDialog';
import DecisionDialog from './DecisionDialog';

interface Antrag {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: AntragPurposes | string;
  fileUrls: string | null;
  status: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  createdAt: string;
  updatedAt: string;
  decisionComment?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

interface AntraegeTableProps {
  antraege: Antrag[];
  currentView: 'pending' | 'approved' | 'rejected' | 'archived' | 'all';
  onArchive: (id: string) => void;
  onRefresh?: () => void;
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
  timestamp: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NEU':
      return 'warning';
    case 'AKZEPTIERT':
      return 'success';
    case 'ABGELEHNT':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'NEU':
      return 'Neu';
    case 'AKZEPTIERT':
      return 'Angenommen';
    case 'ABGELEHNT':
      return 'Abgelehnt';
    default:
      return status;
  }
};

export default function AntraegeTable({
  antraege,
  currentView,
  onArchive,
  onRefresh,
  onShowNotification,
}: AntraegeTableProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [selectedAntragId, setSelectedAntragId] = useState<string | null>(null);
  const [selectedAntragTitle, setSelectedAntragTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [decisionMode, setDecisionMode] = useState<'accept' | 'reject'>('accept');
  const [isDeciding, setIsDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const handleViewAntrag = (id: string) => {
    setSelectedAntragId(id);
    setViewDialogOpen(true);
  };

  const handleEditAntrag = (id: string) => {
    setSelectedAntragId(id);
    setEditDialogOpen(true);
  };

  const handleDeleteAntrag = (id: string, title: string) => {
    setSelectedAntragId(id);
    setSelectedAntragTitle(title);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedAntragId(null);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAntragId(null);
  };

  const handleCloseDeleteDialog = () => {
    if (!isDeleting) {
      setDeleteDialogOpen(false);
      setSelectedAntragId(null);
      setSelectedAntragTitle('');
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAntragId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/antraege/${selectedAntragId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Antrags');
      }

      await response.json();
      
      // Show success message
      if (onShowNotification) {
        onShowNotification(
          `Antrag "${selectedAntragTitle}" wurde erfolgreich gelöscht.`,
          'success'
        );
      }

      // Close dialog and refresh list
      handleCloseDeleteDialog();
      if (onRefresh) {
        onRefresh();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten';
      setDeleteError(errorMessage);
      
      if (onShowNotification) {
        onShowNotification(errorMessage, 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleAcceptAntrag = (id: string, title: string) => {
    setSelectedAntragId(id);
    setSelectedAntragTitle(title);
    setDecisionMode('accept');
    setDecisionError(null);
    setDecisionDialogOpen(true);
  };

  const handleRejectAntrag = (id: string, title: string) => {
    setSelectedAntragId(id);
    setSelectedAntragTitle(title);
    setDecisionMode('reject');
    setDecisionError(null);
    setDecisionDialogOpen(true);
  };

  const handleCloseDecisionDialog = () => {
    if (!isDeciding) {
      setDecisionDialogOpen(false);
      setSelectedAntragId(null);
      setSelectedAntragTitle('');
      setDecisionError(null);
    }
  };

  const handleConfirmDecision = async (comment?: string) => {
    if (!selectedAntragId) return;

    setIsDeciding(true);
    setDecisionError(null);

    try {
      const endpoint = decisionMode === 'accept' ? 'accept' : 'reject';
      const response = await fetch(`/api/admin/antraege/${selectedAntragId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decisionComment: comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Fehler beim ${decisionMode === 'accept' ? 'Annehmen' : 'Ablehnen'} des Antrags`);
      }

      await response.json();
      
      // Show success message
      if (onShowNotification) {
        const actionText = decisionMode === 'accept' ? 'angenommen' : 'abgelehnt';
        onShowNotification(
          `Antrag "${selectedAntragTitle}" wurde erfolgreich ${actionText}.`,
          'success'
        );
      }

      // Close dialog and refresh list
      handleCloseDecisionDialog();
      if (onRefresh) {
        onRefresh();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten';
      setDecisionError(errorMessage);
      
      if (onShowNotification) {
        onShowNotification(errorMessage, 'error');
      }
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <>
      <TableContainer>
        <Table sx={{ minWidth: { xs: 300, sm: 600, md: 800 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Datum</TableCell>
              <TableCell>Titel</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Antragsteller</TableCell>
              <TableCell align="center">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {antraege.map((antrag) => (
              <TableRow key={antrag.id}>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                  {format(new Date(antrag.createdAt), 'dd.MM.yyyy', { locale: de })}
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'medium',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {antrag.title}
                    </Typography>
                    {/* Show date on mobile */}
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ display: { xs: 'block', sm: 'none' } }}
                    >
                      {format(new Date(antrag.createdAt), 'dd.MM.yyyy', { locale: de })}
                    </Typography>
                    {/* Show requester on mobile and tablet */}
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ display: { xs: 'block', md: 'none' } }}
                    >
                      {antrag.firstName} {antrag.lastName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={getStatusLabel(antrag.status)}
                    color={getStatusColor(antrag.status) as 'warning' | 'success' | 'error' | 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {antrag.firstName} {antrag.lastName}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 0.5, 
                    justifyContent: 'center', 
                    flexWrap: 'wrap',
                    '& .MuiButton-root': {
                      minWidth: 'auto',
                      px: { xs: 0.5, sm: 1 },
                      py: 0.5,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    },
                    '& .MuiIconButton-root': {
                      padding: { xs: '4px', sm: '8px' }
                    }
                  }}>
                    {/* View button - always visible */}
                    <IconButton
                      color="primary"
                      onClick={() => handleViewAntrag(antrag.id)}
                      size="small"
                      title="Details ansehen"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>

                    {/* Edit button - only for NEU status */}
                    {antrag.status === 'NEU' && (
                      <IconButton
                        color="secondary"
                        onClick={() => handleEditAntrag(antrag.id)}
                        size="small"
                        title="Bearbeiten"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    
                    {/* Status-specific actions */}
                    {antrag.status === 'NEU' && (
                      <>
                        {/* Mobile-only icon buttons for accept/reject */}
                        <IconButton
                          color="success"
                          onClick={() => handleAcceptAntrag(antrag.id, antrag.title)}
                          size="small"
                          title="Annehmen"
                          sx={{ display: { xs: 'inline-flex'} }}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleRejectAntrag(antrag.id, antrag.title)}
                          size="small"
                          title="Ablehnen"
                          sx={{ display: { xs: 'inline-flex'} }}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}

                    {/* Delete button - always visible */}
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteAntrag(antrag.id, antrag.title)}
                      size="small"
                      title="Löschen"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>

                    {/* Archive button for accepted/rejected items */}
                    {(antrag.status === 'AKZEPTIERT' || antrag.status === 'ABGELEHNT') && currentView !== 'all' && (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onArchive(antrag.id)}
                          startIcon={<ArchiveIcon fontSize="small" />}
                          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          Archivieren
                        </Button>
                        {/* Mobile-only icon button for archive */}
                        <IconButton
                          color="primary"
                          onClick={() => onArchive(antrag.id)}
                          size="small"
                          title="Archivieren"
                          sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Antrag Dialog */}
      <ViewAntragDialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        antragId={selectedAntragId}
      />

      {/* Edit Antrag Dialog */}
      <EditAntragDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        antragId={selectedAntragId}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Antrag Dialog */}
      <DeleteAntragDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        antragTitle={selectedAntragTitle}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Decision Dialog */}
      <DecisionDialog
        open={decisionDialogOpen}
        onClose={handleCloseDecisionDialog}
        onConfirm={handleConfirmDecision}
        antragTitle={selectedAntragTitle}
        mode={decisionMode}
        isLoading={isDeciding}
        error={decisionError}
      />
    </>
  );
}