'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
  Chip,
  Stack,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useDebounce } from '@/hooks/useDebounce';

export interface AntraegeFiltersProps {
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
  currentSearch?: string;
  currentStatus?: string;
  isLoading?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'Alle Status' },
  { value: 'NEU', label: 'Neu' },
  { value: 'AKZEPTIERT', label: 'Akzeptiert' },
  { value: 'ABGELEHNT', label: 'Abgelehnt' }
];

export default function AntraegeFilters({
  onSearchChange,
  onStatusChange,
  onClearFilters,
  currentSearch = '',
  currentStatus = 'all',
  isLoading = false
}: AntraegeFiltersProps) {
  const [searchValue, setSearchValue] = useState(currentSearch);
  const debouncedSearch = useDebounce(searchValue, 300);

  // Call onSearchChange when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, currentSearch, onSearchChange]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    onStatusChange(event.target.value);
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onClearFilters();
  };

  const hasActiveFilters = searchValue !== '' || currentStatus !== 'all';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Suche nach Titel, Zusammenfassung, Name oder E-Mail..."
          value={searchValue}
          onChange={handleSearchChange}
          disabled={isLoading}
          sx={{ maxWidth: { sm: 400 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={currentStatus}
            label="Status"
            onChange={handleStatusChange}
            disabled={isLoading}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {hasActiveFilters && (
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={isLoading}
          >
            Filter zurücksetzen
          </Button>
        )}
      </Stack>

      {hasActiveFilters && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ mr: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              Aktive Filter:
            </Box>
            {searchValue && (
              <Chip
                label={`Suche: "${searchValue}"`}
                size="small"
                onDelete={() => setSearchValue('')}
              />
            )}
            {currentStatus !== 'all' && (
              <Chip
                label={`Status: ${statusOptions.find(o => o.value === currentStatus)?.label}`}
                size="small"
                onDelete={() => onStatusChange('all')}
              />
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}