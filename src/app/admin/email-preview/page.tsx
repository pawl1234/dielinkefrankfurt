'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Email as EmailIcon } from '@mui/icons-material';

type EmailTemplate = 'newsletter' | 'antrag-submission' | 
  'group-acceptance' | 'group-rejection' | 'group-archiving' |
  'status-report-acceptance' | 'status-report-rejection' | 'status-report-archiving' |
  'antrag-acceptance' | 'antrag-rejection';

/**
 * Admin page for previewing email templates in real-time.
 * Shows newsletter and notification email templates with live preview.
 */
export default function EmailPreviewPage() {
  const { data: session, status } = useSession();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('newsletter');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templateOptions = [
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'antrag-submission', label: 'Antrag Submission (to Admin)' },
    { value: 'group-acceptance', label: 'Group Acceptance' },
    { value: 'group-rejection', label: 'Group Rejection' },
    { value: 'group-archiving', label: 'Group Archiving' },
    { value: 'status-report-acceptance', label: 'Status Report Acceptance' },
    { value: 'status-report-rejection', label: 'Status Report Rejection' },
    { value: 'status-report-archiving', label: 'Status Report Archiving' },
    { value: 'antrag-acceptance', label: 'Antrag Acceptance' },
    { value: 'antrag-rejection', label: 'Antrag Rejection' }
  ] as const;

  /**
   * Fetch preview HTML for the selected template
   */
  const fetchPreview = async (template: EmailTemplate) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/email-preview/${template}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
      
      const data = await response.json();
      setPreviewHtml(data.html);
    } catch (err) {
      console.error('Preview fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle template selection change
   */
  const handleTemplateChange = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    fetchPreview(template);
  };

  /**
   * Refresh current preview
   */
  const refreshPreview = () => {
    fetchPreview(selectedTemplate);
  };

  // Load initial preview
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchPreview(selectedTemplate);
    }
  }, [selectedTemplate, status, session]);

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Alert severity="error">
        You need to be logged in as an admin to access this page.
      </Alert>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Administration', href: '/admin', active: true },
      ]}>
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 2 }}>
          {/* Admin Navigation */}
          <AdminNavigation />
          
          {/* Page Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <AdminPageHeader 
              title="Email Template Preview"
              icon={<EmailIcon />}
            />
          </Box>

          {/* Content */}
          <Box sx={{ mt: 3 }}>
            <Grid container spacing={3}>
          {/* Controls */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Email Template</InputLabel>
                      <Select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value as EmailTemplate)}
                        label="Email Template"
                      >
                        {templateOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Button 
                      variant="outlined" 
                      onClick={refreshPreview}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={16} /> : undefined}
                    >
                      {loading ? 'Loading...' : 'Refresh Preview'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Error Display */}
          {error && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">
                {error}
              </Alert>
            </Grid>
          )}

          {/* Preview */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Email Preview - {templateOptions.find(t => t.value === selectedTemplate)?.label}
                </Typography>
                
                <Box 
                  sx={{
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    height: '600px',
                    overflow: 'hidden'
                  }}
                >
                  {loading ? (
                    <Box 
                      display="flex" 
                      justifyContent="center" 
                      alignItems="center" 
                      height="100%"
                    >
                      <CircularProgress />
                    </Box>
                  ) : previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none'
                      }}
                      title="Email Preview"
                    />
                  ) : (
                    <Box 
                      display="flex" 
                      justifyContent="center" 
                      alignItems="center" 
                      height="100%"
                      color="text.secondary"
                    >
                      <Typography>No preview available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
}