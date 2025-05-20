'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import {
  Typography,
  Container,
  Box,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  CardMedia,
  CircularProgress,
  CardActions,
  Button
} from '@mui/material';
import Link from 'next/link';
import { Group } from '@prisma/client';
import GroupIcon from '@mui/icons-material/Group';

interface GroupsResponse {
  success: boolean;
  groups: Group[];
  error?: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/groups');
        
        if (!response.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const data: GroupsResponse = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch groups');
        }
        
        setGroups(data.groups);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load groups. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, []);

  // Function to get excerpt from HTML description
  const getExcerpt = (html: string, maxLength: number = 150) => {
    // Remove HTML tags and extract text
    const text = html.replace(/<[^>]*>/g, '');
    
    if (text.length <= maxLength) return text;
    
    // Find the last space before maxLength
    const lastSpace = text.lastIndexOf(' ', maxLength);
    return text.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
  };

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Arbeitsgruppen', href: '/gruppen', active: true }
      ]}
    >
      <Container maxWidth="lg">
        {/* Title section container */}
        <Box sx={{ mb: 4 }}>
          {/* Red primary title bar */}
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'primary.main',
              color: 'common.white',
              p: { xs: 1.5, md: 2 },
              borderRadius: 0
            }}
          >
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'fontWeightBold' }}>
              Arbeitsgruppen
            </Typography>
          </Box>

          {/* Secondary subtitle bar - indented from primary title */}
          <Box
            sx={{
              display: 'inline-block',
              bgcolor: 'secondary.main',
              color: 'common.white',
              p: { xs: 1.5, md: 1.5 },
              ml: { xs: 3, md: 4 },
              borderRadius: 0
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'fontWeightMedium' }}>
              Entdecke die Arbeitsgruppen der LINKEN Frankfurt
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" paragraph>
              {error}
            </Typography>
          </Paper>
        ) : groups.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" paragraph>
              Aktuell sind keine Arbeitsgruppen vorhanden.
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'fontWeightBold', mb: 3 }}>
              Alle Arbeitsgruppen
            </Typography>
            
            <Grid container spacing={3}>
              {groups.map((group) => (
                <Grid key={group.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 4,
                    }
                  }}>
                    {group.logoUrl ? (
                      <CardMedia
                        component="img"
                        height="140"
                        image={group.logoUrl}
                        alt={`Logo von ${group.name}`}
                        sx={{ objectFit: 'contain', bgcolor: 'grey.50', p: 1 }}
                      />
                    ) : (
                      <Box sx={{ 
                        height: 140, 
                        bgcolor: 'grey.100', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <GroupIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                      </Box>
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {group.name}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {getExcerpt(group.description)}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        href={`/gruppen/${group.slug}`}
                        variant="contained"
                        LinkComponent={Link}
                        fullWidth
                      >
                        Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </MainLayout>
  );
}