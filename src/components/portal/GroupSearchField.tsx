'use client';

import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface GroupSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

/**
 * Search field component for filtering groups.
 * Provides a text input with search icon for filtering group lists.
 */
export default function GroupSearchField({
  value,
  onChange,
  placeholder = 'Gruppen durchsuchen...',
  fullWidth = true
}: GroupSearchFieldProps) {
  return (
    <TextField
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
      inputProps={{ maxLength: 100 }}
    />
  );
}
