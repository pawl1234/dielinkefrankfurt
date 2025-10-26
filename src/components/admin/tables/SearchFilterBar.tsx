import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { FAQ_SEARCH_MAX_LENGTH } from '@/lib/validation/faq-schema';

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onSearch: (e: React.FormEvent) => void;
  children?: React.ReactNode; // For additional filters
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  onSearch,
  children
}) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      <form onSubmit={onSearch} style={{ display: 'flex', flexGrow: 1 }}>
        <TextField
          label="Suchen"
          variant="outlined"
          value={searchTerm}
          onChange={onSearchChange}
          fullWidth
          size="small"
          inputProps={{ maxLength: FAQ_SEARCH_MAX_LENGTH }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={onClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Button 
          type="submit" 
          variant="contained" 
          sx={{ ml: 1 }}
        >
          Suchen
        </Button>
      </form>
      
      {/* Additional filters passed as children */}
      {children}
    </Box>
  );
};

export default SearchFilterBar;