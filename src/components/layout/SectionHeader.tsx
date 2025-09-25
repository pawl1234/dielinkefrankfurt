'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Collapse, 
  Paper 
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface SectionHeaderProps {
  title: string;
  helpTitle?: string;
  helpText?: React.ReactNode;
}

const SectionHeader = ({ title, helpTitle, helpText }: SectionHeaderProps) => {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        pb: 1, 
        borderBottom: 1, 
        borderColor: 'divider',
      }}>
        <Typography 
          variant="h6" 
          component="h3" 
          color="primary" 
          sx={{ fontWeight: 'medium' }}
        >
          {title}
        </Typography>
        
        {helpText && (
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => setShowHelp(!showHelp)}
            sx={{ ml: 1 }}
            aria-label="Hilfe anzeigen"
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      
      <Collapse in={showHelp}>
        <Paper 
          variant="outlined" 
          sx={{ 
            mt: 2, 
            mb: 2, 
            p: 2, 
            bgcolor: 'grey.50' 
          }}
        >
          {helpTitle && (
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {helpTitle}
            </Typography>
          )}
          
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {helpText}
          </Typography>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default SectionHeader;