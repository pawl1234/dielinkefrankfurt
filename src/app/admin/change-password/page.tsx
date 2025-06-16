// src/app/admin/change-password/page.tsx
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { useSession } from 'next-auth/react';
import {
  Box, Container, Typography, Paper, TextField,
  Button, Alert, CircularProgress
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

export default function ChangePasswordPage() {
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      
      setSuccess('Password changed successfully');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }
  
  const isEnvironmentUser = session?.user?.isEnvironmentUser as boolean | undefined;

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin' },
        { label: 'Passwort ändern', href: '/admin/change-password', active: true },
      ]}
    >
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <AdminNavigation />
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LockIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5">Passwort ändern</Typography>
          </Box>
          
          {isEnvironmentUser ? (
            <Alert severity="info">
              Das Passwort vom lokalen admin lässt sich nicht ändern!
            </Alert>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400 }}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
              
              <TextField
                label="Aktuelles Passwort"
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              
              <TextField
                label="Neues Passwort"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              
              <TextField
                label="Passwort bestätigen"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                fullWidth
                margin="normal"
                required
              />
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? 'Ändere Passwort...' : 'Passwort ändern'}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </MainLayout>
  );
}