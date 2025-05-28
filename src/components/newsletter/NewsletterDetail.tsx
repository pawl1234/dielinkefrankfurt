'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar
} from '@mui/material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import DownloadIcon from '@mui/icons-material/Download';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Interface for newsletter details
interface NewsletterDetail {
  id: string;
  sentAt: string;
  subject: string;
  recipientCount: number;
  status: string;
  content: string;
  settings: string;
  settingsData?: Record<string, any>;
}

interface NewsletterDetailProps {
  id: string;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

/**
 * Component for displaying newsletter details
 */
export default function NewsletterDetail({ id, onBack, onDelete }: NewsletterDetailProps) {
  const [newsletter, setNewsletter] = useState<NewsletterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Copy link notification
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch newsletter details
  useEffect(() => {
    const fetchNewsletter = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/admin/newsletter/archives/${id}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching newsletter: ${response.status}`);
        }
        
        const data = await response.json();
        setNewsletter(data);
      } catch (err) {
        console.error('Failed to fetch newsletter:', err);
        setError('Beim Laden des Newsletters ist ein Fehler aufgetreten.');
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletter();
  }, [id]);

  /**
   * Get status chip based on newsletter status
   */
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip label="Abgeschlossen" color="success" />;
      case 'processing':
        return <Chip label="In Bearbeitung" color="primary" />;
      case 'failed':
        return <Chip label="Fehlgeschlagen" color="error" />;
      case 'completed_with_errors':
        return <Chip label="Teilweise Fehlgeschlagen" color="warning" />;
      default:
        return <Chip label={status} />;
    }
  };

  /**
   * Format date string
   */
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd. MMMM yyyy HH:mm', { locale: de });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  // Generate iframe content for preview
  const getIframeContent = () => {
    if (!newsletter) return '';
    
    // Add base tag to ensure resources load correctly
    const contentWithBase = newsletter.content.replace(
      '<head>',
      `<head><base target="_blank">`
    );
    
    return contentWithBase;
  };

  // Handle resending the newsletter
  const handleResend = () => {
    // This would be implemented in the future
    alert('Diese Funktion ist noch nicht implementiert.');
  };

  // Download the newsletter as HTML
  const handleDownload = () => {
    if (!newsletter) return;
    
    const blob = new Blob([newsletter.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-${newsletter.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  // Delete the newsletter
  const handleDelete = async () => {
    if (!newsletter) return;
    
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/admin/newsletter/archives/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete newsletter');
      }
      
      // Call the onDelete callback if provided
      if (onDelete) {
        onDelete(id);
      } else {
        // Otherwise just go back
        onBack();
      }
    } catch (err) {
      console.error('Failed to delete newsletter:', err);
      setDeleteError((err as Error).message || 'Beim Löschen des Newsletters ist ein Fehler aufgetreten.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  
  // Copy public link to clipboard
  const handleCopyPublicLink = () => {
    if (!newsletter) return;
    
    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/newsletter/${id}`;
    
    navigator.clipboard.writeText(publicUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
      });
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          variant="outlined"
        >
          Zurück zur Übersicht
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {!loading && !newsletter && (
        <Alert severity="warning">Newsletter nicht gefunden.</Alert>
      )}

      {!loading && newsletter && (
        <Grid container spacing={3}>
          {/* Newsletter metadata */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Newsletter-Details
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {getStatusChip(newsletter.status)}
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Datum
                </Typography>
                <Typography variant="body1">
                  {formatDate(newsletter.sentAt)}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Betreff
                </Typography>
                <Typography variant="body1">
                  {newsletter.subject}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Empfänger
                </Typography>
                <Typography variant="body1">
                  {newsletter.recipientCount}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Newsletter settings */}
              <Typography variant="subtitle1" gutterBottom>
                Versand-Einstellungen
              </Typography>
              
              {newsletter.settingsData && (
                <Card variant="outlined" sx={{ mt: 2, bgcolor: 'background.default' }}>
                  <CardContent>
                    {newsletter.settingsData.fromName && newsletter.settingsData.fromEmail && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Absender
                        </Typography>
                        <Typography variant="body2">
                          {newsletter.settingsData.fromName} &lt;{newsletter.settingsData.fromEmail}&gt;
                        </Typography>
                      </Box>
                    )}
                    
                    {newsletter.settingsData.replyToEmail && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Antwort an
                        </Typography>
                        <Typography variant="body2">
                          {newsletter.settingsData.replyToEmail}
                        </Typography>
                      </Box>
                    )}
                    
                    {newsletter.settingsData.batchSize && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Batch-Größe
                        </Typography>
                        <Typography variant="body2">
                          {newsletter.settingsData.batchSize} Empfänger pro Batch
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              {/* Actions */}
              <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<LinkIcon />}
                  onClick={handleCopyPublicLink}
                  fullWidth
                  color="success"
                >
                  Öffentlichen Link kopieren
                </Button>
                
                <Button 
                  variant="outlined" 
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                  fullWidth
                >
                  Als HTML herunterladen
                </Button>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<ReplayIcon />}
                  onClick={handleResend}
                  fullWidth
                >
                  Erneut versenden
                </Button>
                
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<DeleteIcon />}
                  onClick={handleOpenDeleteDialog}
                  fullWidth
                >
                  Newsletter löschen
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Newsletter preview */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Newsletter-Vorschau
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ 
                width: '100%', 
                height: 'calc(100vh - 350px)', 
                minHeight: '500px',
                border: '1px solid',
                borderColor: 'grey.300',
                overflow: 'hidden',
                borderRadius: 1
              }}>
                <iframe
                  srcDoc={getIframeContent()}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title="Newsletter Preview"
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Newsletter löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sind Sie sicher, dass Sie diesen Newsletter aus dem Archiv löschen möchten? 
            Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Wird gelöscht...' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Link copied notification */}
      <Snackbar
        open={linkCopied}
        autoHideDuration={3000}
        onClose={() => setLinkCopied(false)}
        message="Öffentlicher Link in die Zwischenablage kopiert"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: 'success.dark',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }
        }}
        ContentProps={{
          sx: { 
            '&::before': {
              content: '""',
              display: 'inline-block',
              width: 20,
              height: 20,
              mr: 1,
              bgcolor: 'transparent',
              borderRadius: '50%'
            }
          }
        }}
      />
    </Box>
  );
}