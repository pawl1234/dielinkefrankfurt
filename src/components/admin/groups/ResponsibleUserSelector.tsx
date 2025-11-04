/**
 * ResponsibleUserSelector component
 *
 * Allows admins to search for users and assign them as responsible persons for a group.
 * Displays current responsible users with ability to remove them.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Typography,
  Alert,
  Autocomplete,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface ResponsibleUser {
  id: string;
  userId: string;
  groupId: string;
  assignedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface ResponsibleUserSelectorProps {
  groupId: string;
  responsibleUsers: ResponsibleUser[];
  onAssign: () => void;
  onRemove: () => void;
}

/**
 * ResponsibleUserSelector component for managing user-based responsible persons
 */
export default function ResponsibleUserSelector({
  groupId,
  responsibleUsers,
  onAssign,
  onRemove
}: ResponsibleUserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch users when search term changes
  useEffect(() => {
    if (searchTerm.length < 2) {
      setUsers([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(searchTerm)}&pageSize=10`);

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Benutzer');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/admin/groups/${groupId}/responsible`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler beim Zuweisen der verantwortlichen Person');
      }

      setSuccessMessage('Verantwortliche Person erfolgreich zugewiesen');
      setSelectedUser(null);
      setSearchTerm('');
      onAssign(); // Trigger refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Zuweisen');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/admin/groups/${groupId}/responsible`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler beim Entfernen der verantwortlichen Person');
      }

      setSuccessMessage('Verantwortliche Person erfolgreich entfernt');
      onRemove(); // Trigger refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Entfernen');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: { firstName: string | null; lastName: string | null; email: string }) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Benutzer-basierte Verantwortliche
      </Typography>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* User Search and Assign */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Autocomplete
          sx={{ flexGrow: 1 }}
          options={users}
          value={selectedUser}
          onChange={(_event, newValue) => setSelectedUser(newValue)}
          inputValue={searchTerm}
          onInputChange={(_event, newInputValue) => setSearchTerm(newInputValue)}
          getOptionLabel={(option) => getUserDisplayName(option)}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                <Typography variant="body2">{getUserDisplayName(option)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.email} (@{option.username})
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Benutzer suchen"
              placeholder="Name, E-Mail oder Benutzername eingeben..."
              size="small"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          noOptionsText={searchTerm.length < 2 ? "Mindestens 2 Zeichen eingeben" : "Keine Benutzer gefunden"}
          loading={loading}
        />
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAssign}
          disabled={!selectedUser || loading}
        >
          Zuweisen
        </Button>
      </Box>

      {/* Current Responsible Users */}
      {responsibleUsers.length > 0 ? (
        <List dense>
          {responsibleUsers.map((ru) => (
            <ListItem
              key={ru.id}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 1,
                mb: 0.5,
              }}
            >
              <Chip
                label="Benutzer"
                size="small"
                color="primary"
                sx={{ mr: 1 }}
              />
              <ListItemText
                primary={getUserDisplayName(ru.user)}
                secondary={ru.user.email}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="entfernen"
                  onClick={() => handleRemove(ru.userId)}
                  disabled={loading}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Noch keine Benutzer-basierten verantwortlichen Personen zugewiesen.
        </Typography>
      )}
    </Box>
  );
}
