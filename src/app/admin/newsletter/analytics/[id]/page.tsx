'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import MetricCard from '@/components/newsletter/analytics/MetricCard';
import LinkPerformanceTable from '@/components/newsletter/analytics/LinkPerformanceTable';
import { NewsletterAnalyticsResponse } from '@/types/newsletter-analytics';

export default function NewsletterAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NewsletterAnalyticsResponse | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/newsletter/analytics/${newsletterId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          throw new Error(errorData.details || errorData.error || 'Analytics not available');
        }
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

    fetchAnalytics();
  }, [newsletterId]);

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
          {error || 'Failed to load analytics'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/newsletter/archives')}
        >
          Back to Archives
        </Button>
      </Container>
    );
  }

  const { 
    analytics, 
    newsletter, 
    openRate, 
    uniqueOpenRate, 
    repeatOpenRate, 
    linkPerformance,
    engagementMetrics 
  } = data;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/newsletter/archives')}
          sx={{ mb: 2 }}
        >
          Back to Archives
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Newsletter Analytics
        </Typography>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {newsletter.subject}
        </Typography>
        
        {newsletter.sentAt && (
          <Typography variant="body2" color="text.secondary">
            Sent on {format(new Date(newsletter.sentAt), 'dd.MM.yyyy HH:mm', { locale: de })}
          </Typography>
        )}
      </Box>

      {/* Enhanced Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Recipients"
            value={analytics.totalRecipients}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Total Opens"
            value={analytics.totalOpens}
            subtitle={`${openRate.toFixed(1)}% rate`}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Unique Opens"
            value={analytics.uniqueOpens}
            subtitle={`${uniqueOpenRate.toFixed(1)}% rate`}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Repeat Opens"
            value={engagementMetrics.repeatOpens}
            subtitle={`${repeatOpenRate.toFixed(1)}% rate`}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Second row of metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Total Link Clicks"
            value={engagementMetrics.totalLinkClicks}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Unique Link Clicks"
            value={engagementMetrics.uniqueLinkClicks}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Avg Opens/Recipient"
            value={engagementMetrics.averageOpensPerRecipient.toFixed(1)}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Engagement Quality"
            value={analytics.totalOpens > 0 
              ? `${((analytics.uniqueOpens / analytics.totalOpens) * 100).toFixed(1)}%`
              : '0%'
            }
            subtitle="Unique/Total ratio"
            color="primary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <LinkPerformanceTable data={linkPerformance} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}