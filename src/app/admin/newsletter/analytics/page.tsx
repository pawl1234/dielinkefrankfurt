'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BarChartIcon from '@mui/icons-material/BarChart';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import MetricCard from '@/components/newsletter/analytics/MetricCard';
import { NewsletterAnalyticsDashboardResponse } from '@/types/newsletter-analytics';

export default function NewsletterAnalyticsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NewsletterAnalyticsDashboardResponse | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/newsletter/analytics/dashboard');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch analytics dashboard`);
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error fetching analytics dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load analytics dashboard'}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={fetchDashboard}
            disabled={loading}
          >
            Retry
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin')}
          >
            Back to Admin
          </Button>
        </Box>
      </Container>
    );
  }

  const { recentNewsletters, overallMetrics } = data;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin')}
          sx={{ mb: 2 }}
        >
          Back to Admin
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Newsletter Analytics Dashboard
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Total Newsletters Sent"
            value={overallMetrics.totalNewsletters}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Average Open Rate"
            value={`${overallMetrics.averageOpenRate.toFixed(1)}%`}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Total Link Clicks"
            value={overallMetrics.totalClicks}
            color="info"
          />
        </Grid>
      </Grid>

      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Recent Newsletters
      </Typography>

      <Grid container spacing={3}>
        {recentNewsletters.map((newsletter) => (
          <Grid key={newsletter.id} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  {newsletter.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {newsletter.sentAt 
                    ? format(new Date(newsletter.sentAt), 'dd.MM.yyyy HH:mm', { locale: de })
                    : 'Not sent'}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Recipients
                      </Typography>
                      <Typography variant="h6">
                        {newsletter.recipientCount || 0}
                      </Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Open Rate
                      </Typography>
                      <Typography variant="h6">
                        {newsletter.openRate.toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid size={4}>
                      <Typography variant="body2" color="text.secondary">
                        Clicks
                      </Typography>
                      <Typography variant="h6">
                        {newsletter.clickCount}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  startIcon={<BarChartIcon />}
                  onClick={() => router.push(`/admin/newsletter/analytics/${newsletter.id}`)}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {recentNewsletters.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No newsletters have been sent yet.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}