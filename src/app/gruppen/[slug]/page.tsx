'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import {
  Typography,
  Container,
  Box,
  Paper,
  Button,
  Divider,
  CircularProgress,
  Grid,
  Alert,
  Tooltip,
  Chip,
  Avatar
} from '@mui/material';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupIcon from '@mui/icons-material/Group';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import AttachmentIcon from '@mui/icons-material/Attachment';
import { Group, StatusReport } from '@prisma/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface GroupWithReports extends Group {
  statusReports: StatusReport[];
}

interface GroupDetailResponse {
  success: boolean;
  group?: GroupWithReports | null;
  error?: string;
}

export default function GroupDetailPage() {
  const [group, setGroup] = useState<GroupWithReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get params using the useParams hook
  const params = useParams();
  const slug = params?.slug as string;
  const pathname = usePathname();

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/groups/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Arbeitsgruppe nicht gefunden');
          }
          throw new Error('Failed to fetch group');
        }

        const data: GroupDetailResponse = await response.json();
        
        if (!data.success || !data.group) {
          throw new Error(data.error || 'Failed to fetch group data');
        }
        
        setGroup(data.group);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ein Fehler ist aufgetreten');
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchGroup();
    }
  }, [slug]);

  // Fragment navigation effect
  useEffect(() => {
    if (!loading && group && typeof window !== 'undefined') {
      const hash = window.location.hash;
      
      if (hash) {
        const elementId = hash.substring(1);
        const element = document.getElementById(elementId);
        
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            element.style.transition = 'box-shadow 0.3s ease-in-out';
            element.style.boxShadow = '0 0 0 2px #e91e63';
            
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 3000);
          }, 200);
        }
      }
    }
  }, [loading, group, pathname]);

  return (
    <MainLayout
      breadcrumbs={[
        { label: 'Start', href: '/' },
        { label: 'Arbeitsgruppen', href: '/gruppen' },
        { label: group?.name || 'Details', href: `/gruppen/${slug}`, active: true },
      ]}
    >
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Button
          href="/?section=groups"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          sx={{ mb: 3 }}
          LinkComponent={Link}
        >
          Zurück zur Übersicht
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error" variant="h6">{error}</Typography>
            <Button
              href="/gruppen"
              variant="contained"
              sx={{ mt: 2 }}
              LinkComponent={Link}
            >
              Zurück zur Gruppenübersicht
            </Button>
          </Paper>
        ) : group ? (
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'center', md: 'flex-start' },
              gap: 3,
              mb: 4
            }}>
              {/* Group Logo */}
              <Box sx={{ 
                width: { xs: '100%', md: '220px' },
                height: { xs: '160px', md: '220px' },
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1,
                mb: { xs: 2, md: 0 },
                overflow: 'hidden'
              }}>
                {group.logoUrl ? (
                  <Box
                    component="img"
                    src={group.logoUrl}
                    alt={`Logo von ${group.name}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      p: 2
                    }}
                  />
                ) : (
                  <GroupIcon sx={{ fontSize: 80, color: 'primary.main' }} />
                )}
              </Box>

              {/* Group Info */}
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                  <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mr: 2 }}>
                    {group.name}
                  </Typography>

                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    Aktiv seit {format(new Date(group.createdAt), 'MMMM yyyy', { locale: de })}
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{ mb: 3, lineHeight: 1.7, color: 'text.secondary' }}
                  dangerouslySetInnerHTML={{ __html: group.description }}
                />
              </Box>
            </Box>

            {/* Status Reports Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DescriptionIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
                  Statusberichte
                </Typography>
              </Box>
              
              {group.statusReports.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Diese Arbeitsgruppe hat noch keine Statusberichte veröffentlicht.
                </Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {group.statusReports.map((report) => (
                    <Paper 
                      key={report.id}
                      id={`report-${report.id}`}
                      elevation={2}
                      sx={{ 
                        p: { xs: 2, sm: 3 },
                        borderRadius: 2,
                        transition: 'box-shadow 0.3s',
                        '&:hover': {
                          boxShadow: 4
                        }
                      }}
                    >
                      {/* Title and date header */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        mb: 2,
                        gap: 1
                      }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 'bold',
                            pb: 0.5,
                            display: 'inline-block'
                          }}
                        >
                          {report.title}
                        </Typography>
                        <Chip
                          icon={<EventIcon fontSize="small" />}
                          label={format(new Date(report.createdAt), 'dd. MMMM yyyy', { locale: de })}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                      
                      {/* Report content */}
                      <Box 
                        sx={{ 
                          mb: 3,
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                          '& p': { mt: 0, mb: 1.5 },
                          '& p:last-child': { mb: 0 },
                          '& ul, & ol': { mt: 0, mb: 1.5, pl: 2.5 },
                          '& a': { color: 'primary.main' }
                        }}
                      >
                        <Typography 
                          component="div"
                          variant="body1"
                          sx={{ lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: report.content }}
                        />
                      </Box>
                      
                      {/* File attachments */}
                      {report.fileUrls && (() => {
                        try {
                          const fileUrls = JSON.parse(report.fileUrls as string);
                          if (Array.isArray(fileUrls) && fileUrls.length > 0) {
                            return (
                              <Box sx={{ mb: 3 }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1, 
                                  mb: 1.5 
                                }}>
                                  <AttachmentIcon fontSize="small" color="primary" />
                                  <Typography variant="subtitle2">
                                    Dateianhänge ({fileUrls.length})
                                  </Typography>
                                </Box>
                                <Box 
                                  sx={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: 'background.paper',
                                  }}
                                >
                                  {fileUrls.map((fileUrl: string, index: number) => {
                                    const fileName = fileUrl.split('/').pop() || `Datei ${index + 1}`;
                                    const fileExt = fileName.split('.').pop()?.toUpperCase() || 'Datei';
                                    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(fileName);
                                    const isPdf = /\.pdf$/i.test(fileName);
                                    
                                    let icon;
                                    if (isImage) {
                                      icon = <Box 
                                        component="img" 
                                        src={fileUrl} 
                                        alt="Thumbnail"
                                        sx={{ 
                                          width: 24, 
                                          height: 24, 
                                          objectFit: 'cover',
                                          borderRadius: '2px' 
                                        }} 
                                      />;
                                    } else if (isPdf) {
                                      icon = <DownloadIcon sx={{ color: 'error.main' }} />;
                                    } else {
                                      icon = <DownloadIcon />;
                                    }
                                    
                                    return (
                                      <Tooltip 
                                        key={index} 
                                        title={`${fileExt}-Datei herunterladen`} 
                                        arrow
                                      >
                                        <Button 
                                          variant="outlined"
                                          size="small"
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          download={fileName}
                                          startIcon={icon}
                                          sx={{ 
                                            textTransform: 'none', 
                                            borderRadius: 1,
                                            borderColor: 'divider',
                                            '&:hover': {
                                              borderColor: 'primary.main',
                                              bgcolor: 'rgba(0, 0, 0, 0.04)'
                                            }
                                          }}
                                        />
                                      </Tooltip>
                                    );
                                  })}
                                </Box>
                              </Box>
                            );
                          }
                          return null;
                        } catch (error) {
                          console.error('Error parsing fileUrls:', error);
                          return (
                            <Alert severity="error" sx={{ mb: 2 }}>
                              Fehler beim Laden der Dateianhänge
                            </Alert>
                          );
                        }
                      })()}
                      
                      {/* Reporter info */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        mt: 1 
                      }}>
                        <Avatar 
                          sx={{ 
                            width: 28, 
                            height: 28, 
                            bgcolor: 'secondary.main',
                            fontSize: '0.9rem' 
                          }}
                        >
                          {report.reporterFirstName[0]}{report.reporterLastName[0]}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Berichtet von <strong>{report.reporterFirstName} {report.reporterLastName}</strong>
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                href="/gruppen"
                startIcon={<ArrowBackIcon />}
                variant="outlined"
                LinkComponent={Link}
              >
                Alle Arbeitsgruppen
              </Button>
            </Box>
          </Paper>
        ) : null}
      </Container>
    </MainLayout>
  );
}