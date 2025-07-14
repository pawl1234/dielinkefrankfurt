'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import AdminNavigation from '@/components/admin/AdminNavigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import NewsletterArchives, { NewsletterArchivesRef } from '@/components/newsletter/NewsletterArchives';
import NewsletterSendingForm from '@/components/newsletter/NewsletterSendingForm';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';

interface NewsletterItem {
  id: string;
  sentAt?: string;
  createdAt?: string;
  subject: string;
  recipientCount?: number;
  status: string;
  type: 'draft' | 'sent';
  introductionText?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { status } = useSession();
  
  // State for dialogs and forms
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<NewsletterItem | null>(null);
  const [newsletterHtml, setNewsletterHtml] = useState('');
  const [subject, setSubject] = useState('');

  // Create ref for NewsletterArchives to trigger refresh
  const archivesRef = useRef<NewsletterArchivesRef>(null);

  // Handle newsletter sending completion
  const handleNewsletterSent = () => {
    console.log('Newsletter sent, refreshing archives...');
    archivesRef.current?.refresh();
  };

  // Handle dialog close (also refresh to show updated status)
  const handleCloseDialog = () => {
    setSendDialogOpen(false);
    setSelectedNewsletter(null);
    console.log('Send dialog closed, refreshing archives...');
    archivesRef.current?.refresh();
  };

  // Handle resend dialog close
  const handleCloseResendDialog = () => {
    setResendDialogOpen(false);
    setSelectedNewsletter(null);
    console.log('Resend dialog closed, refreshing archives...');
    archivesRef.current?.refresh();
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress /> 
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Typography>Redirecting to login...</Typography>
        </Box>
    ); 
  }

  if (status === 'authenticated') {
    return (
      <MainLayout
        breadcrumbs={[
          { label: 'Start', href: '/' },
          { label: 'Administration', href: '/admin', active: true },
        ]}>
        <Box sx={{ flexGrow: 1 }}>
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Admin Navigation */}
            <AdminNavigation />
            
            {/* Page Header */}
            <AdminPageHeader 
              title="Newsletter verwalten"
              icon={<MailOutlineIcon />}
            />
            
            {/* Action buttons */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => router.push('/admin/newsletter/edit')}
              >
                Neuer Newsletter
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                startIcon={<SettingsIcon />}
                onClick={() => router.push('/admin/newsletter/settings')}
              >
                Einstellungen
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                startIcon={<BarChartIcon />}
                onClick={() => router.push('/admin/newsletter/analytics')}
              >
                Analytics Dashboard
              </Button>
            </Box>
            
            {/* Newsletter Archives Table */}
            <NewsletterArchives 
              onSendNewsletter={async (newsletter) => {
                setSelectedNewsletter(newsletter);
                // Fetch the newsletter content
                try {
                  const response = await fetch(`/api/admin/newsletter/archives/${newsletter.id}`);
                  if (response.ok) {
                    const data = await response.json();
                    setNewsletterHtml(data.content || '');
                    setSubject(data.subject || '');
                  }
                } catch {
                  console.error('Error fetching newsletter content');
                }
                setSendDialogOpen(true);
              }}
              onResendNewsletter={async (newsletter) => {
                setSelectedNewsletter(newsletter);
                // Fetch the newsletter content (same as onSendNewsletter)
                try {
                  const response = await fetch(`/api/admin/newsletter/archives/${newsletter.id}`);
                  if (response.ok) {
                    const data = await response.json();
                    setNewsletterHtml(data.content || '');
                    setSubject(data.subject || '');
                  }
                } catch {
                  console.error('Error fetching newsletter content');
                }
                setResendDialogOpen(true);
              }}
              onEditDraft={(newsletter) => {
                router.push(`/admin/newsletter/edit?id=${newsletter.id}`);
              }}
              onTestEmail={(newsletter) => {
                setSelectedNewsletter(newsletter);
                setTestEmailDialogOpen(true);
              }}
              onPreview={(newsletter) => {
                // Navigate to the view page
                router.push(`/admin/newsletter/view?id=${newsletter.id}`);
              }}
              ref={archivesRef}
            />
          </Container>
        </Box>
        
        {/* Send Newsletter Dialog */}
        <Dialog 
          open={sendDialogOpen} 
          onClose={() => setSendDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Newsletter versenden</DialogTitle>
          <DialogContent>
            {selectedNewsletter && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedNewsletter.subject}
                </Typography>
                
                <NewsletterSendingForm 
                  newsletterHtml={newsletterHtml}
                  subject={subject || selectedNewsletter.subject}
                  newsletterId={selectedNewsletter.id}
                  onComplete={handleNewsletterSent}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Resend Newsletter Dialog */}
        <Dialog 
          open={resendDialogOpen} 
          onClose={() => setResendDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Newsletter erneut versenden</DialogTitle>
          <DialogContent>
            {selectedNewsletter && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedNewsletter.subject}
                </Typography>
                
                <NewsletterSendingForm 
                  newsletterHtml={newsletterHtml}
                  subject={subject || selectedNewsletter.subject}
                  newsletterId={selectedNewsletter.id}
                  onComplete={handleNewsletterSent}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseResendDialog}>
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Test Email Dialog */}
        <Dialog 
          open={testEmailDialogOpen} 
          onClose={() => setTestEmailDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Test-Email senden</DialogTitle>
          <DialogContent>
            {selectedNewsletter && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ mb: 2 }}>
                  Test-Email für: <strong>{selectedNewsletter.subject}</strong> senden?
                </Typography>
                
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/newsletter/send-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          newsletterId: selectedNewsletter.id,
                          subject: selectedNewsletter.subject,
                        }),
                      });
                      
                      if (response.ok) {
                        await response.json();
                      // alert(`Test-Email wurde erfolgreich gesendet! ${data.message || ''}`);
                        setTestEmailDialogOpen(false);
                        setSelectedNewsletter(null);
                      } else {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Unbekannter Fehler');
                      }
                    } catch (error) {
                      console.error('Error sending test email:', error);
                      alert(`Fehler beim Senden der Test-Email: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
                    }
                  }}
                >
                  Test-Email senden
                </Button>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setTestEmailDialogOpen(false);
              setSelectedNewsletter(null);
            }}>
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
      </MainLayout>
    );
  }

  return null; 
}