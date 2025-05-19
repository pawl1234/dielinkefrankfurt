'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Avatar, 
  Skeleton,
  Chip,
  CircularProgress,
  Paper,
  Pagination
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import Link from 'next/link';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  createdAt: Date | string;
}

const GroupsSection: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Added pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(6); // Default page size for groups

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        // Add pagination parameters to the API request
        const response = await fetch(`/api/groups?page=${page}&pageSize=${pageSize}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const data = await response.json();
        console.log('API response data for groups:', data); // Debug log
        
        // Handle different response formats
        if (data.success && data.groups) {
          setGroups(data.groups);
          // If API includes pagination metadata
          if (data.totalPages) {
            setTotalPages(data.totalPages);
          }
        } else if (data && data.items) {
          // Handle paginated format with items array
          setGroups(data.items);
          setTotalPages(data.totalPages || 1);
          // Keep the page in sync with what the API returns
          if (data.page) setPage(data.page);
        } else {
          console.warn('API returned unexpected format:', data);
          setGroups([]);
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load groups. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, [page, pageSize]); // Re-fetch when page or pageSize changes

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    // Smooth scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number = 200) => {
    // Remove HTML tags for cleaner display
    const plainText = text.replace(/<[^>]+>/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };
  
  if (loading) {
    return (
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
          Aktive Gruppen
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3].map((item) => (
            <Grid key={item} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Skeleton variant="text" width={120} height={24} />
                  </Box>
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="80%" height={20} />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width={100} height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, mt: 2, mb: 4, textAlign: 'center' }}>
        <Typography color="error">
          Fehler beim Laden der Gruppen.
        </Typography>
      </Paper>
    );
  }

  if (groups.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2, mb: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Keine aktiven Gruppen gefunden.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Aktive Gruppen
      </Typography>
      
      <Grid container spacing={3}>
        {groups.map((group) => (
          <Grid key={group.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {group.logoUrl ? (
                    <Avatar 
                      src={group.logoUrl} 
                      alt={group.name}
                      sx={{ mr: 2, width: 40, height: 40 }}
                    />
                  ) : (
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {group.name.charAt(0)}
                    </Avatar>
                  )}
                  <Typography variant="subtitle1" fontWeight="bold">
                    {group.name}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {truncateText(group.description)}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Chip
                    size="small"
                    icon={<PersonIcon />}
                    label={`Seit ${format(new Date(group.createdAt), 'MMMM yyyy', { locale: de })}`}
                    variant="outlined"
                    color="primary"
                  />
                </Box>
              </CardContent>
              
              <CardActions>
                <Button 
                  size="small"
                  variant="contained"
                  component={Link}
                  href={`/gruppen/${group.slug}`}
                >
                  Mehr anzeigen
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary"
            size="large"
            siblingCount={1}
          />
        </Box>
      )}
    </Box>
  );
};

export default GroupsSection;