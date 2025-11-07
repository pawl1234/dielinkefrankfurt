'use client';

import { useState } from 'react';
import {
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { GroupMemberResponse } from '@/types/api-types';

interface GroupMembersTableProps {
  members: GroupMemberResponse[];
  groupId: string;
  canManageMembers: boolean;
  currentUserId: string;
  onMemberRemoved: () => void;
}

type SortOrder = 'asc' | 'desc';
type SortField = 'name' | 'email' | 'joinedAt';

/**
 * Table component for displaying and managing group members.
 * Supports:
 * - Role indicators (Verantwortliche Person badge)
 * - Member removal with confirmation (for responsible persons only)
 * - Pagination and sorting via Material UI Table
 */
export default function GroupMembersTable({
  members,
  groupId,
  canManageMembers,
  currentUserId,
  onMemberRemoved
}: GroupMembersTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>('joinedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({
    open: false,
    userId: '',
    userName: ''
  });
  const [removing, setRemoving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  /**
   * Handle sorting
   */
  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  /**
   * Sort members array
   */
  const sortedMembers = [...members].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    if (sortField === 'name') {
      aValue = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
      bValue = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
    } else if (sortField === 'email') {
      aValue = a.user.email.toLowerCase();
      bValue = b.user.email.toLowerCase();
    } else {
      aValue = new Date(a.joinedAt);
      bValue = new Date(b.joinedAt);
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  /**
   * Paginate members
   */
  const paginatedMembers = sortedMembers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  /**
   * Handle page change
   */
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Open confirmation dialog for member removal
   */
  const handleRemoveClick = (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      userId,
      userName
    });
  };

  /**
   * Close confirmation dialog
   */
  const handleDialogClose = () => {
    setConfirmDialog({
      open: false,
      userId: '',
      userName: ''
    });
  };

  /**
   * Confirm and execute member removal
   */
  const handleConfirmRemove = async () => {
    setRemoving(true);
    try {
      const response = await fetch(`/api/portal/groups/${groupId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: confirmDialog.userId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Entfernen des Mitglieds');
      }

      setSnackbar({
        open: true,
        message: 'Mitglied erfolgreich entfernt',
        severity: 'success'
      });

      handleDialogClose();
      onMemberRemoved();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Fehler beim Entfernen des Mitglieds',
        severity: 'error'
      });
    } finally {
      setRemoving(false);
    }
  };

  /**
   * Close snackbar notification
   */
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'email'}
                  direction={sortField === 'email' ? sortOrder : 'asc'}
                  onClick={() => handleSort('email')}
                >
                  E-Mail
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'joinedAt'}
                  direction={sortField === 'joinedAt' ? sortOrder : 'asc'}
                  onClick={() => handleSort('joinedAt')}
                >
                  Beigetreten
                </TableSortLabel>
              </TableCell>
              <TableCell>Rolle</TableCell>
              {canManageMembers && <TableCell align="right">Aktionen</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedMembers.map((member) => {
              const isResponsible = member.isResponsiblePerson;
              const isSelf = member.userId === currentUserId;
              const userName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim();

              return (
                <TableRow
                  key={member.id}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <TableCell>{userName || 'Unbekannt'}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    {new Date(member.joinedAt).toLocaleDateString('de-DE')}
                  </TableCell>
                  <TableCell>
                    {isResponsible && (
                      <Chip
                        label="Verantwortliche Person"
                        color="primary"
                        size="small"
                      />
                    )}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell align="right">
                      {!isResponsible && !isSelf && (
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleRemoveClick(member.userId, userName)}
                          aria-label="Mitglied entfernen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={members.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Zeilen pro Seite:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} von ${count}`}
        />
      </TableContainer>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleDialogClose}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          Mitglied entfernen
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            Möchten Sie {confirmDialog.userName} wirklich aus der Gruppe entfernen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={removing}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirmRemove}
            color="error"
            variant="contained"
            disabled={removing}
          >
            {removing ? 'Entfernt...' : 'Entfernen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
