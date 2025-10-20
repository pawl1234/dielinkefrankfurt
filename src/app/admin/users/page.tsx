// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { Controller } from 'react-hook-form';
import {
  Box, Container, CircularProgress, Paper, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  TextField, Switch, IconButton, Tooltip, Alert, FormControl, InputLabel,
  Select, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import { User } from '@/types/user';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useZodForm } from '@/hooks/useZodForm';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from '@/lib/validation/user-schema';
import { z } from 'zod';

// Type definitions for forms
type CreateUserFormData = z.infer<typeof createUserSchema>;
type UpdateUserFormData = z.infer<typeof updateUserSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);

  // Create user form
  const createForm = useZodForm<CreateUserFormData>({
    schema: createUserSchema,
    defaultValues: {
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'admin',
      isActive: true
    },
    onSubmit: async (data) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen des Benutzers');
      }

      setOpenCreateDialog(false);
      createForm.reset();
      fetchUsers();
    }
  });

  // Edit user form
  const editForm = useZodForm<UpdateUserFormData>({
    schema: updateUserSchema,
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'admin'
    },
    onSubmit: async (data) => {
      if (!selectedUser) return;

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren des Benutzers');
      }

      setOpenEditDialog(false);
      fetchUsers();
    }
  });

  // Reset password form
  const resetPasswordForm = useZodForm<ResetPasswordFormData>({
    schema: resetPasswordSchema,
    defaultValues: {
      newPassword: ''
    },
    onSubmit: async (data) => {
      if (!selectedUser) return;

      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fehler beim Zurücksetzen des Passworts');
      }

      setOpenResetDialog(false);
      resetPasswordForm.reset();
    }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Fehler beim Laden der Benutzer');
      const data = await res.json();
      setUsers(data.users || data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Fehler beim Löschen des Benutzers');
      }

      setOpenDeleteDialog(false);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message);
      }

      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    }
  };

  const openEditUserDialog = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
    });
    setOpenEditDialog(true);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin' },
        { label: 'Benutzerverwaltung', href: '/admin/users', active: true },
      ]}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <AdminNavigation />
        <AdminPageHeader title="Benutzerverwaltung" icon={<PersonIcon />} />

          <Box sx={{ display: 'flex', justifyContent: 'right', alignItems: 'right', mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                createForm.reset();
                setOpenCreateDialog(true);
              }}
            >
              Benutzer erstellen
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        <Paper sx={{ p: 3, mb: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Benutzername</TableCell>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Rolle</TableCell>
                  <TableCell>Aktiv</TableCell>
                  <TableCell>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        onChange={() => handleToggleActive(user)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Bearbeiten">
                        <IconButton onClick={() => openEditUserDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Passwort zurücksetzen">
                        <IconButton onClick={() => {
                          setSelectedUser(user);
                          resetPasswordForm.reset({ newPassword: '' });
                          setOpenResetDialog(true);
                        }}>
                          <LockResetIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Löschen">
                        <IconButton
                          color="error"
                          onClick={() => {
                            setSelectedUser(user);
                            setOpenDeleteDialog(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Keine Benutzer gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Create User Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Benutzer erstellen</DialogTitle>
        <DialogContent>
          {createForm.submissionError && <Alert severity="error" sx={{ mb: 2 }}>{createForm.submissionError}</Alert>}
          <form onSubmit={createForm.handleSubmit(createForm.onSubmit)}>
            <Controller
              control={createForm.control}
              name="username"
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Benutzername"
                  fullWidth
                  margin="dense"
                  error={!!error && createForm.formState.isSubmitted}
                  helperText={error && createForm.formState.isSubmitted ? error.message : ''}
                  required
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="email"
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="E-Mail"
                  type="email"
                  fullWidth
                  margin="dense"
                  error={!!error && createForm.formState.isSubmitted}
                  helperText={error && createForm.formState.isSubmitted ? error.message : ''}
                  required
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="password"
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Passwort"
                  type="password"
                  fullWidth
                  margin="dense"
                  error={!!error && createForm.formState.isSubmitted}
                  helperText={
                    error && createForm.formState.isSubmitted
                      ? error.message
                      : 'Mindestens 8 Zeichen erforderlich'
                  }
                  required
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="firstName"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Vorname"
                  fullWidth
                  margin="dense"
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="lastName"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nachname"
                  fullWidth
                  margin="dense"
                />
              )}
            />
            <Controller
              control={createForm.control}
              name="role"
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>Rolle</InputLabel>
                  <Select {...field} label="Rolle">
                    <MenuItem value="admin">Administrator</MenuItem>
                    <MenuItem value="mitglied">Mitglied</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Abbrechen</Button>
          <Button
            onClick={createForm.handleSubmit(createForm.onSubmit)}
            variant="contained"
            color="primary"
            disabled={createForm.isSubmitting}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Benutzer bearbeiten</DialogTitle>
        <DialogContent>
          {editForm.submissionError && <Alert severity="error" sx={{ mb: 2 }}>{editForm.submissionError}</Alert>}
          <form onSubmit={editForm.handleSubmit(editForm.onSubmit)}>
            <TextField
              label="Benutzername"
              fullWidth
              margin="dense"
              value={selectedUser?.username || ''}
              disabled
              helperText="Benutzername kann nicht geändert werden"
            />
            <Controller
              control={editForm.control}
              name="email"
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="E-Mail"
                  type="email"
                  fullWidth
                  margin="dense"
                  error={!!error && editForm.formState.isSubmitted}
                  helperText={error && editForm.formState.isSubmitted ? error.message : ''}
                />
              )}
            />
            <Controller
              control={editForm.control}
              name="firstName"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Vorname"
                  fullWidth
                  margin="dense"
                />
              )}
            />
            <Controller
              control={editForm.control}
              name="lastName"
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nachname"
                  fullWidth
                  margin="dense"
                />
              )}
            />
            <Controller
              control={editForm.control}
              name="role"
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>Rolle</InputLabel>
                  <Select {...field} label="Rolle">
                    <MenuItem value="admin">Administrator</MenuItem>
                    <MenuItem value="mitglied">Mitglied</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Abbrechen</Button>
          <Button
            onClick={editForm.handleSubmit(editForm.onSubmit)}
            variant="contained"
            color="primary"
            disabled={editForm.isSubmitting}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)}>
        <DialogTitle>Passwort zurücksetzen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Neues Passwort für Benutzer festlegen: {selectedUser?.username}
          </DialogContentText>
          {resetPasswordForm.submissionError && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {resetPasswordForm.submissionError}
            </Alert>
          )}
          <form onSubmit={resetPasswordForm.handleSubmit(resetPasswordForm.onSubmit)}>
            <Controller
              control={resetPasswordForm.control}
              name="newPassword"
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  label="Neues Passwort"
                  type="password"
                  fullWidth
                  margin="dense"
                  error={!!error && resetPasswordForm.formState.isSubmitted}
                  helperText={
                    error && resetPasswordForm.formState.isSubmitted
                      ? error.message
                      : 'Mindestens 8 Zeichen erforderlich'
                  }
                  required
                />
              )}
            />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetDialog(false)}>Abbrechen</Button>
          <Button
            onClick={resetPasswordForm.handleSubmit(resetPasswordForm.onSubmit)}
            variant="contained"
            color="primary"
            disabled={resetPasswordForm.isSubmitting}
          >
            Zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Benutzer löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie den Benutzer &quot;{selectedUser?.username}&quot; löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">Löschen</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
