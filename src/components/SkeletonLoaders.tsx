import React from 'react';
import { 
  Skeleton, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Box, 
  Paper,
  Container
} from '@mui/material';

interface LoaderProps {
  count?: number;
}

/**
 * Skeleton loader for a Group card
 */
export const GroupCardSkeleton: React.FC = () => (
  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <CardContent sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="text" width={80} />
      </Box>
      
      <Skeleton variant="text" width="80%" height={30} sx={{ mb: 1 }} />
      
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={100} 
        sx={{ mb: 2, borderRadius: 1 }} 
      />
      
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="85%" />
    </CardContent>
    
    <CardActions sx={{ p: 1.5, gap: 0.5, flexWrap: 'wrap' }}>
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="rounded" width={100} height={32} />
      <Skeleton variant="rounded" width={90} height={32} />
    </CardActions>
  </Card>
);

/**
 * Grid of Group card skeletons
 */
export const GroupCardGridSkeleton: React.FC<LoaderProps> = ({ count = 6 }) => (
  <Grid container spacing={3}>
    {Array.from(new Array(count)).map((_, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
        <GroupCardSkeleton />
      </Grid>
    ))}
  </Grid>
);

/**
 * Skeleton loader for a Status Report card
 */
export const StatusReportCardSkeleton: React.FC = () => (
  <Card 
    variant="outlined" 
    sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column'
    }}
  >
    <CardContent sx={{ flexGrow: 1 }}>
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
          <Skeleton variant="rounded" width={70} height={24} />
        </Box>
      </Box>
      
      <Skeleton variant="text" width="90%" height={28} sx={{ mb: 1 }} />
      
      <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
      <Skeleton variant="text" width="70%" sx={{ mb: 1 }} />
      <Skeleton variant="text" width="50%" sx={{ mb: 2 }} />
      
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      
      <Skeleton variant="text" width="50%" sx={{ mt: 1 }} />
    </CardContent>
    
    <CardActions sx={{ pt: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <Skeleton variant="rounded" width={70} height={32} />
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="rounded" width={90} height={32} />
    </CardActions>
  </Card>
);

/**
 * Grid of Status Report card skeletons
 */
export const StatusReportCardGridSkeleton: React.FC<LoaderProps> = ({ count = 6 }) => (
  <Grid container spacing={3}>
    {Array.from(new Array(count)).map((_, index) => (
      <Grid key={index} size={{ xs: 12, md: 6, lg: 4 }}>
        <StatusReportCardSkeleton />
      </Grid>
    ))}
  </Grid>
);

/**
 * Form Skeleton loader
 */
export const FormSkeleton: React.FC = () => (
  <Paper sx={{ p: 3 }}>
    <Skeleton variant="text" width="50%" height={40} sx={{ mb: 3 }} />
    
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={150} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={56} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Skeleton variant="rounded" width={120} height={40} />
      </Grid>
    </Grid>
  </Paper>
);

/**
 * Full page loader with navigation
 */
export const PageSkeleton: React.FC = () => (
  <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
    <Paper sx={{ p: 2, mb: 4 }}>
      <Skeleton variant="text" width={180} height={30} sx={{ mb: 1 }} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rounded" width={120} height={40} />
        <Skeleton variant="rounded" width={120} height={40} />
        <Skeleton variant="rounded" width={150} height={40} />
      </Box>
    </Paper>
    
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Skeleton variant="text" width={250} height={40} />
    </Box>
    
    <Paper sx={{ p: 0, mb: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
        </Box>
      </Box>
    </Paper>
    
    <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      <Skeleton variant="rounded" width={300} height={40} sx={{ flexGrow: 1 }} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rounded" width={120} height={40} />
        <Skeleton variant="rounded" width={120} height={40} />
      </Box>
    </Box>
    
    <GroupCardGridSkeleton count={6} />
  </Container>
);