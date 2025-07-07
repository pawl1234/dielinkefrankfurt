'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Link,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { AntragPurposes } from '@/types/api-types';

interface ViewAntragDialogProps {
  open: boolean;
  onClose: () => void;
  antragId: string | null;
}

interface AntragDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: string; // JSON string
  fileUrls: string | null; // JSON string
  status: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  createdAt: string;
  updatedAt: string;
  decisionComment?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'NEU':
      return 'warning';
    case 'AKZEPTIERT':
      return 'success';
    case 'ABGELEHNT':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'NEU':
      return 'Neu';
    case 'AKZEPTIERT':
      return 'Angenommen';
    case 'ABGELEHNT':
      return 'Abgelehnt';
    default:
      return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'AKZEPTIERT':
      return <CheckCircleIcon fontSize="small" />;
    case 'ABGELEHNT':
      return <CancelIcon fontSize="small" />;
    default:
      return null;
  }
};

export default function ViewAntragDialog({ open, onClose, antragId }: ViewAntragDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [antrag, setAntrag] = useState<AntragDetails | null>(null);
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchAntragDetails = useCallback(async () => {
    if (!antragId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/antraege/${antragId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Antrag nicht gefunden');
        }
        throw new Error('Fehler beim Laden der Antragsdaten');
      }

      const data = await response.json();
      setAntrag(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }, [antragId]);

  useEffect(() => {
    if (open && antragId) {
      fetchAntragDetails();
    }
  }, [open, antragId, fetchAntragDetails]);

  const getPurposesObject = (purposes: string): AntragPurposes => {
    try {
      return JSON.parse(purposes);
    } catch {
      return {} as AntragPurposes;
    }
  };

  const getFileUrls = (fileUrls: string | null): string[] => {
    if (!fileUrls) return [];
    try {
      return JSON.parse(fileUrls);
    } catch {
      return [];
    }
  };

  const getFileName = (url: string): string => {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Datei';
  };

  const handleClose = () => {
    setAntrag(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Antrag Details</Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {antrag && !loading && (
          <Box>
            {/* Status at the top */}
            <Box sx={{ mb: 3 }}>
              <Chip
                label={getStatusLabel(antrag.status)}
                color={getStatusColor(antrag.status) as 'warning' | 'success' | 'error' | 'default'}
                icon={getStatusIcon(antrag.status) || undefined}
                sx={{ mb: 2 }}
              />
              
              {/* Title */}
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  fontWeight: 500 
                }}
              >
                {antrag.title}
              </Typography>
              
              {/* Summary */}
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                {antrag.summary}
              </Typography>
            </Box>
            <Divider sx={{ mb: 2}}>Informationen</Divider>
            {/* Contact and Timestamp Info */}
            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Antragsteller
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {antrag.firstName} {antrag.lastName}
                  </Typography>
                </Box>
                
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      E-Mail
                    </Typography>
                  </Box>
                    {antrag.email}
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Eingereicht
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {format(new Date(antrag.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <CalendarTodayIcon fontSize="small" color="action" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Aktualisiert
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {format(new Date(antrag.updatedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Divider sx={{ mb: 2}}> Anliegen </Divider>
            {/* Purposes Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(() => {
                  const purposes = getPurposesObject(antrag.purposes);
                  return (
                    <>
                      {purposes.zuschuss?.enabled && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                            Zuschuss (Finanzielle Unterstützung)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Betrag: {purposes.zuschuss.amount}€
                          </Typography>
                        </Box>
                      )}
                      
                      {purposes.personelleUnterstuetzung?.enabled && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                            Personelle Unterstützung
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {purposes.personelleUnterstuetzung.details}
                          </Typography>
                        </Box>
                      )}
                      
                      {purposes.raumbuchung?.enabled && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                            Raumbuchung
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Ort: {purposes.raumbuchung.location}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Anzahl Personen: {purposes.raumbuchung.numberOfPeople}
                          </Typography>
                          {purposes.raumbuchung.details && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {purposes.raumbuchung.details}
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {purposes.weiteres?.enabled && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
                            Weiteres
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {purposes.weiteres.details}
                          </Typography>
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Box>
            </Box>

            {/* File Attachments */}
            {getFileUrls(antrag.fileUrls).length > 0 && (
                          
              <Box sx={{ mb: 4 }}>
                <Divider sx={{ mb: 2}}>Anhänge ({getFileUrls(antrag.fileUrls).length})</Divider>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {getFileUrls(antrag.fileUrls).map((url, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        p: 1.5,
                      }}
                    >
                      <AttachFileIcon color="action" fontSize="small" />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getFileName(url)}
                        </Typography>
                      </Box>
                      <Link
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          fontSize: '0.875rem'
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                        <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
                          Herunterladen
                        </Box>
                      </Link>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Decision Information */}
            {(antrag.decisionComment || antrag.decidedBy || antrag.decidedAt) && (
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                >
                  Entscheidungsinformationen
                </Typography>
                <Box sx={{ 
                  p: { xs: 2, sm: 2.5 }, 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}>
                  {antrag.decidedBy && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Entschieden von:</strong> {antrag.decidedBy}
                    </Typography>
                  )}
                  {antrag.decidedAt && (
                    <Typography variant="body2" gutterBottom>
                      <strong>Entschieden am:</strong> {format(new Date(antrag.decidedAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </Typography>
                  )}
                  {antrag.decisionComment && (
                    <Typography variant="body2">
                      <strong>Kommentar:</strong> {antrag.decisionComment}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* ID at the bottom */}
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center' }}
            >
              ID: {antrag.id}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
        <Button onClick={handleClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
}