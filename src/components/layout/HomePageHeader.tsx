// components/PageHeader.tsx
import { Box, Typography } from '@mui/material';
import React from 'react';

interface PageHeaderProps {
  mainTitle: string;
  subtitle: string;
  introText?: string | React.ReactNode; // Optional introduction text
}

const HomePageHeader: React.FC<PageHeaderProps> = ({ mainTitle, subtitle, introText }) => {
  return (
    <>
      <Box sx={{ mb: introText ? 2 : 4, minHeight: { xs: '80px', md: '100px' } }}>
        {/* First Box (Main Title) */}
        <Box
          sx={{
            display: 'inline-block',
            bgcolor: 'primary.main',
            color: 'common.white',
            p: { xs: 1.5, md: 2 },
            maxWidth: '100%'
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'fontWeightBold',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
            }}
          >
            {mainTitle}
          </Typography>
        </Box>

        <br />

        {/* Second Box (Subtitle) */}
        <Box
          sx={{
            display: 'inline-block',
            bgcolor: 'secondary.main',
            color: 'common.white',
            p: { xs: 1.5, md: 1.5 },
            ml: { xs: 3, md: 4 },
            mt: 0,
            maxWidth: 'calc(100% - 24px)'
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontWeight: 'fontWeightMedium',
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>
      
      {/* Optional Introduction Text */}
      {introText && (
        <Box 
          sx={{ 
            mb: 4, 
            px: { xs: 0, md: 0 },
            maxWidth: '100%'
          }}
        >
          {typeof introText === 'string' ? (
            <Typography variant="body1" color="text.secondary">{introText}</Typography>
          ) : (
            introText
          )}
        </Box>
      )}
    </>
  );
};

export default HomePageHeader;