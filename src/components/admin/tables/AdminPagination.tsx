import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import React from 'react';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

const AdminPagination: React.FC<AdminPaginationProps> = ({ 
  page, 
  totalPages, 
  pageSize, 
  onPageChange, 
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50]
}) => {
  if (totalPages <= 1) return null;
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          variant="outlined"
        >
          Vorherige
        </Button>
        
        <Typography variant="body1">
          Seite {page} von {totalPages}
        </Typography>
        
        <Button
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          variant="outlined"
        >
          Nächste
        </Button>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="page-size-label">Elemente pro Seite</InputLabel>
          <Select
            labelId="page-size-label"
            value={pageSize}
            label="Elemente pro Seite"
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
            }}
          >
            {pageSizeOptions.map(size => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default AdminPagination;