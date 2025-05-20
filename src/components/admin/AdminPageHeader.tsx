import { Box, Typography } from '@mui/material';
import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  icon: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, icon }) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {icon && React.cloneElement(icon as React.ReactElement, { sx: { mr: 1, verticalAlign: 'middle' } })}
        {title}
      </Typography>
    </Box>
  );
};

export default AdminPageHeader;