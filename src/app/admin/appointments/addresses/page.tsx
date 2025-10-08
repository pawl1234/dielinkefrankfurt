'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Paper,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, AddressInput } from '@/lib/validation/address-schema';

/**
 * Address type from API response.
 */
interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  locationDetails: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin page for managing reusable addresses.
 *
 * @returns Address management page component
 */
export default function AddressManagementPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  // Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: '',
      street: '',
      city: '',
      postalCode: '',
      locationDetails: '',
    },
  });

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  // Fetch addresses on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses();
    }
  }, [status]);

  /**
   * Fetch all addresses from API.
   */
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/addresses?pageSize=100&orderBy=name&orderDirection=asc');

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Adressen');
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Adressen');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open dialog for creating new address.
   */
  const handleOpenCreateDialog = () => {
    setEditingAddress(null);
    reset({
      name: '',
      street: '',
      city: '',
      postalCode: '',
      locationDetails: '',
    });
    setDialogOpen(true);
  };

  /**
   * Open dialog for editing existing address.
   *
   * @param address - Address to edit
   */
  const handleOpenEditDialog = (address: Address) => {
    setEditingAddress(address);
    reset({
      name: address.name,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      locationDetails: address.locationDetails || '',
    });
    setDialogOpen(true);
  };

  /**
   * Handle form submission for create/update.
   *
   * @param data - Form data
   */
  const onSubmit = async (data: AddressInput) => {
    try {
      setError('');
      setSuccess('');

      const url = '/api/admin/addresses';
      const method = editingAddress ? 'PATCH' : 'POST';
      const body = editingAddress
        ? JSON.stringify({ ...data, id: editingAddress.id })
        : JSON.stringify(data);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      setSuccess(
        editingAddress
          ? 'Adresse erfolgreich aktualisiert'
          : 'Adresse erfolgreich erstellt'
      );
      setDialogOpen(false);
      fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  /**
   * Open delete confirmation dialog.
   *
   * @param address - Address to delete
   */
  const handleOpenDeleteDialog = (address: Address) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  /**
   * Delete address after confirmation.
   */
  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch(`/api/admin/addresses?id=${addressToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen');
      }

      setSuccess('Adresse erfolgreich gelöscht');
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
      fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  if (status === 'loading' || loading) {
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
        { label: 'Termine', href: '/admin/appointments', active: true },
        { label: 'Adressen', href: '/admin/appointments', active: true },
      ]}>
      <Container maxWidth="lg">
        <AdminNavigation />
        <AdminPageHeader
          title="Adressen verwalten"
          icon={<LocationOnIcon />}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Gespeicherte Adressen</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Neue Adresse
            </Button>
          </Box>

          {addresses.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Keine Adressen vorhanden. Erstellen Sie eine neue Adresse.
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Straße</strong></TableCell>
                    <TableCell><strong>Stadt</strong></TableCell>
                    <TableCell><strong>PLZ</strong></TableCell>
                    <TableCell><strong>Aktionen</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {addresses.map((address) => (
                    <TableRow key={address.id}>
                      <TableCell>{address.name}</TableCell>
                      <TableCell>{address.street}</TableCell>
                      <TableCell>{address.city}</TableCell>
                      <TableCell>{address.postalCode}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditDialog(address)}
                          title="Bearbeiten"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteDialog(address)}
                          title="Löschen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingAddress ? 'Adresse bearbeiten' : 'Neue Adresse erstellen'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ mt: 2 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    fullWidth
                    margin="normal"
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              <Controller
                name="street"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Straße"
                    fullWidth
                    margin="normal"
                    required
                    error={!!errors.street}
                    helperText={errors.street?.message}
                  />
                )}
              />
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Stadt"
                    fullWidth
                    margin="normal"
                    required
                    error={!!errors.city}
                    helperText={errors.city?.message}
                  />
                )}
              />
              <Controller
                name="postalCode"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Postleitzahl"
                    fullWidth
                    margin="normal"
                    required
                    error={!!errors.postalCode}
                    helperText={errors.postalCode?.message}
                  />
                )}
              />
              <Controller
                name="locationDetails"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Ortsdetails (optional)"
                    fullWidth
                    margin="normal"
                    multiline
                    rows={3}
                    error={!!errors.locationDetails}
                    helperText={errors.locationDetails?.message}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button
              variant="contained"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Adresse löschen?</DialogTitle>
          <DialogContent>
            <Typography>
              Möchten Sie die Adresse &quot;{addressToDelete?.name}&quot; wirklich löschen?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bestehende Termine behalten ihre Adressdaten.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
            <Button variant="contained" color="error" onClick={handleConfirmDelete}>
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </MainLayout>
  );
}
