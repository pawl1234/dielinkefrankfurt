import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  icon: React.ReactNode;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, icon }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        textAlign: isMobile ? 'center' : 'left',
      }}
    >
      <Typography 
        variant={isMobile ? "h5" : "h4"} 
        component="h1" 
        gutterBottom
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'center' : 'flex-start',
          wordBreak: 'break-word',
          fontSize: isMobile ? '1.5rem' : undefined
        }}
      >
        {icon && React.cloneElement(icon as React.ReactElement, { 
          sx: { 
            mr: 1, 
            verticalAlign: 'middle',
            fontSize: isMobile ? '1.5rem' : '2rem' 
          } 
        })}
        <span>{title}</span>
      </Typography>
    </Box>
  );
};

export default AdminPageHeader;