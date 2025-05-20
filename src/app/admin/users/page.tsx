// src/app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import AdminNavigation from '@/components/AdminNavigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box, Container, Typography, CircularProgress, Paper, Button,
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

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'admin',
  });
  const [resetPassword, setResetPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status]);
  
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateUser = async () => {
    if (!validateForm()) return;
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create user');
      }
      
      setOpenCreateDialog(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    }
  };
  
  const handleEditUser = async () => {
    if (!validateForm(true) || !selectedUser) return;
    
    try {
      const { password, ...dataToSend } = formData;
      
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      
      setOpenEditDialog(false);
      fetchUsers();
    } catch (err: any) {
      setFormErrors({ general: err.message });
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
        throw new Error(errorData.message || 'Failed to delete user');
      }
      
      setOpenDeleteDialog(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword || resetPassword.length < 6) {
      setFormErrors({ resetPassword: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
      
      setOpenResetDialog(false);
      setResetPassword('');
    } catch (err: any) {
      setFormErrors({ resetPassword: err.message });
    }
  };
  
  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, isActive: !user.isActive })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message);
      }
      
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const validateForm = (isEdit = false) => {
    const errors: Record<string, string> = {};
    
    if (!formData.username && !isEdit) errors.username = 'Username is required';
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password && !isEdit) errors.password = 'Password is required';
    if (formData.password && formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'admin',
    });
    setFormErrors({});
  };
  
  const openEditUserDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',  // Don't set password on edit
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
    });
    setOpenEditDialog(true);
  };

  if (status === 'loading' || loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin' },
        { label: 'User Management', href: '/admin/users', active: true },
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
                resetForm();
                setOpenCreateDialog(true);
              }}
            >
              Create User
            </Button>
          </Box>
          
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        <Paper sx={{ p: 3, mb: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Actions</TableCell>
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
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEditUserDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton onClick={() => {
                          setSelectedUser(user);
                          setResetPassword('');
                          setFormErrors({});
                          setOpenResetDialog(true);
                        }}>
                          <LockResetIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
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
                      No users found
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
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          {formErrors.general && <Alert severity="error" sx={{ mb: 2 }}>{formErrors.general}</Alert>}
          <TextField
            label="Username"
            fullWidth
            margin="dense"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            error={!!formErrors.username}
            helperText={formErrors.username}
            required
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="dense"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            error={!!formErrors.email}
            helperText={formErrors.email}
            required
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="dense"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            error={!!formErrors.password}
            helperText={formErrors.password}
            required
          />
          <TextField
            label="First Name"
            fullWidth
            margin="dense"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
          <TextField
            label="Last Name"
            fullWidth
            margin="dense"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <MenuItem value="admin">Admin</MenuItem>
              {/* Add more roles in the future */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" color="primary">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {formErrors.general && <Alert severity="error" sx={{ mb: 2 }}>{formErrors.general}</Alert>}
          <TextField
            label="Username"
            fullWidth
            margin="dense"
            value={formData.username}
            disabled // Username cannot be changed
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="dense"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            error={!!formErrors.email}
            helperText={formErrors.email}
            required
          />
          <TextField
            label="First Name"
            fullWidth
            margin="dense"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
          <TextField
            label="Last Name"
            fullWidth
            margin="dense"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <MenuItem value="admin">Admin</MenuItem>
              {/* Add more roles in the future */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditUser} variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Set new password for user: {selectedUser?.username}
          </DialogContentText>
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="dense"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            error={!!formErrors.resetPassword}
            helperText={formErrors.resetPassword}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenResetDialog(false)}>Cancel</Button>
          <Button onClick={handleResetPassword} variant="contained" color="primary">Reset</Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user "{selectedUser?.username}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}