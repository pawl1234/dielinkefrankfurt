'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  CardMedia,
  CardActions
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import SectionHeader from './SectionHeader';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface Group {
  id: string;
  name: string;
  slug: string;
}

interface FormInput {
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status?: 'draft' | 'published' | 'rejected';
  files?: (File | Blob)[];
}

interface StatusReport {
  id: number;
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status: 'draft' | 'published' | 'rejected';
  createdAt: string;
  updatedAt: string;
  fileUrls: string | null;
}

interface EditStatusReportFormProps {
  statusReport: StatusReport;
  onSubmit: (data: FormInput, files: (File | Blob)[]) => Promise<void>;
  onCancel: () => void;
}

export default function EditStatusReportForm({
  statusReport,
  onSubmit,
  onCancel
}: EditStatusReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(statusReport.content || '');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);
  const [existingFileUrls, setExistingFileUrls] = useState<string[]>([]);

  // Initialize existing file URLs if provided
  useEffect(() => {
    if (statusReport.fileUrls) {
      try {
        const urls = JSON.parse(statusReport.fileUrls);
        setExistingFileUrls(Array.isArray(urls) ? urls : []);
      } catch (err) {
        console.error('Error parsing file URLs:', err);
        setExistingFileUrls([]);
      }
    }
  }, [statusReport.fileUrls]);

  // Fetch active groups for the dropdown
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/groups');
        
        if (!response.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const data = await response.json();
        if (data.success && Array.isArray(data.groups)) {
          setGroups(data.groups);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setSubmissionError('Es konnten keine Gruppen geladen werden. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Prepare default values from status report
  const defaultValues = {
    groupId: statusReport.groupId,
    title: statusReport.title,
    reporterFirstName: statusReport.reporterFirstName,
    reporterLastName: statusReport.reporterLastName,
    status: statusReport.status
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<FormInput>({
    defaultValues
  });

  const handleFormSubmit: SubmitHandler<FormInput> = async (data) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    // Validate content before submission
    if (!content || content.trim() === '<p></p>' || content.trim() === '') {
      setSubmissionError('Bitte geben Sie einen Inhalt ein');
      setIsSubmitting(false);
      return;
    }

    // Validate that content is not too long
    if (content.length > 1000) {
      setSubmissionError('Inhalt darf maximal 1000 Zeichen lang sein');
      setIsSubmitting(false);
      return;
    }

    try {
      // Add content to the form data
      const dataWithContent = {
        ...data,
        content
      };

      // Call the provided onSubmit handler
      await onSubmit(dataWithContent, fileList);
      
      // Show success message
      setSubmissionSuccess(true);
      
      // Scroll to top of form to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(handleFormSubmit)} sx={{ '& > *': { mt: 3 } }}>
      {submissionError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Fehler beim Absenden:</strong> {submissionError}
        </Alert>
      )}

      {submissionSuccess && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
            p: 2,
            borderLeft: 3,
            borderColor: 'success.main',
            '& .MuiAlert-icon': {
              fontSize: '2rem',
            }
          }}
        >
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" component="div" gutterBottom>
              Der Bericht wurde erfolgreich aktualisiert!
            </Typography>
            <Typography variant="body1">
              Die Änderungen wurden gespeichert.
            </Typography>
          </Box>
        </Alert>
      )}

      <Card variant="outlined" sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <CardContent>
          <SectionHeader
            title="Gruppe auswählen"
            helpTitle="Gruppe auswählen"
            helpText={
              <Typography variant="body2">
                Wählen Sie die Gruppe aus, für die der Bericht gilt.
                Nur aktive Gruppen können ausgewählt werden.
              </Typography>
            }
          />

          <Box sx={{ mb: 3 }}>
            <FormControl 
              fullWidth 
              error={!!errors.groupId}
              disabled={loading || groups.length === 0}
            >
              <InputLabel id="group-select-label">Gruppe</InputLabel>
              <Controller
                name="groupId"
                control={control}
                defaultValue={statusReport.groupId}
                rules={{ required: 'Bitte wählen Sie eine Gruppe aus' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="group-select-label"
                    label="Gruppe"
                  >
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.groupId && (
                <FormHelperText>{errors.groupId.message}</FormHelperText>
              )}
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <CardContent>
          <SectionHeader
            title="Berichtsinformationen"
            helpTitle="Berichtsinformationen"
            helpText={
              <>
                <Typography variant="body2">
                  In diesem Abschnitt können Sie Ihren Bericht bearbeiten:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  <li>Der <strong>Titel</strong> sollte kurz und prägnant sein (max. 100 Zeichen).</li>
                  <li>Der <strong>Inhalt</strong> kann Text, Listen und Links enthalten (max. 1000 Zeichen).</li>
                </Box>
              </>
            }
          />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
              Titel <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
            </Typography>

            <Controller
              name="title"
              control={control}
              rules={{ 
                required: 'Titel ist erforderlich', 
                maxLength: { 
                  value: 100, 
                  message: 'Titel darf maximal 100 Zeichen lang sein' 
                },
                minLength: {
                  value: 3,
                  message: 'Titel muss mindestens 3 Zeichen lang sein'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  placeholder="Titel des Berichts..."
                  inputProps={{ maxLength: 100 }}
                  error={!!errors.title}
                  helperText={errors.title?.message || `${(field.value || '').length}/100`}
                  margin="normal"
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
              Inhalt <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
            </Typography>

            <Typography variant="body1" display="block" mb={2} gutterBottom>
              Beschreiben Sie die Aktivitäten, Erfolge oder Pläne Ihrer Gruppe. Text kann hier formatiert und mit Links versehen werden.
            </Typography>
            <RichTextEditor
              value={content}
              onChange={setContent}
              maxLength={1000}
              placeholder="Inhalt des Berichts..."
            />
            {errors.content && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {errors.content.message}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <CardContent>
          <SectionHeader
            title="Status"
            helpTitle="Berichtsstatus"
            helpText={
              <Typography variant="body2">
                Der Status bestimmt, ob der Bericht sichtbar ist oder nicht.
              </Typography>
            }
          />

          <Box sx={{ mb: 3 }}>
            <FormControl 
              fullWidth 
              error={!!errors.status}
            >
              <InputLabel id="status-select-label">Status</InputLabel>
              <Controller
                name="status"
                control={control}
                defaultValue={statusReport.status}
                rules={{ required: 'Status ist erforderlich' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="status-select-label"
                    label="Status"
                  >
                    <MenuItem value="draft">Entwurf</MenuItem>
                    <MenuItem value="published">Veröffentlicht</MenuItem>
                    <MenuItem value="rejected">Abgelehnt</MenuItem>
                  </Select>
                )}
              />
              {errors.status && (
                <FormHelperText>{errors.status.message}</FormHelperText>
              )}
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <CardContent>
          <SectionHeader
            title="Ansprechpartner"
            helpTitle="Ansprechpartner"
            helpText={
              <Typography variant="body2">
                Bitte geben Sie die Kontaktdaten des Ansprechpartners an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht.
              </Typography>
            }
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Controller
              name="reporterFirstName"
              control={control}
              rules={{ 
                required: 'Vorname ist erforderlich',
                minLength: {
                  value: 2,
                  message: 'Vorname muss mindestens 2 Zeichen lang sein'
                },
                maxLength: {
                  value: 50,
                  message: 'Vorname darf maximal 50 Zeichen lang sein'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Vorname"
                  fullWidth
                  error={!!errors.reporterFirstName}
                  helperText={errors.reporterFirstName?.message}
                  margin="normal"
                />
              )}
            />

            <Controller
              name="reporterLastName"
              control={control}
              rules={{ 
                required: 'Nachname ist erforderlich',
                minLength: {
                  value: 2,
                  message: 'Nachname muss mindestens 2 Zeichen lang sein'
                },
                maxLength: {
                  value: 50,
                  message: 'Nachname darf maximal 50 Zeichen lang sein'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nachname"
                  fullWidth
                  error={!!errors.reporterLastName}
                  helperText={errors.reporterLastName?.message}
                  margin="normal"
                />
              )}
            />
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <CardContent>
          <SectionHeader
            title="Datei Anhänge"
            helpTitle="Anhänge hochladen"
            helpText={
              <Typography variant="body2">
                Hier können Sie Anhänge wie Bilder oder PDFs hochladen oder existierende Anhänge entfernen.
                Sie können maximal 5 Dateien hochladen (jeweils max. 5MB).
              </Typography>
            }
          />

          <Box sx={{ mb: 2 }}>
            <FileUpload
              onFilesSelect={setFileList}
              maxFiles={5 - existingFileUrls.length}
            />
          </Box>
          
          {/* Show existing files */}
          {existingFileUrls.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Vorhandene Anhänge
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {existingFileUrls.map((fileUrl, index) => {
                  const isImage = fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg') || fileUrl.endsWith('.png');
                  const isPdf = fileUrl.endsWith('.pdf');
                  const fileName = fileUrl.split('/').pop() || `File-${index + 1}`;
                  
                  return (
                    <Box key={fileUrl} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.333% - 11px)' } }}>
                      <Card variant="outlined" sx={{ mb: 1 }}>
                        {isImage && (
                          <CardMedia
                            component="img"
                            height="140"
                            image={fileUrl}
                            alt={`Anhang ${index + 1}`}
                            sx={{ objectFit: 'cover' }}
                          />
                        )}
                        {isPdf && (
                          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                            <PictureAsPdfIcon sx={{ fontSize: 40, color: 'error.main' }} />
                          </Box>
                        )}
                        <CardContent sx={{ py: 1 }}>
                          <Typography variant="caption" noWrap title={fileName}>
                            {fileName}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button
                            variant="outlined"
                            size="small"
                            href={fileUrl}
                            target="_blank"
                            sx={{ mr: 1 }}
                          >
                            Öffnen
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => {
                              setExistingFileUrls(prev => prev.filter(url => url !== fileUrl));
                            }}
                          >
                            Entfernen
                          </Button>
                        </CardActions>
                      </Card>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </Button>
      </Box>
    </Box>
  );
}