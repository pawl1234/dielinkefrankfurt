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
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import SectionHeader from './SectionHeader';

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
  files?: (File | Blob)[];
}

export default function StatusReportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors }
  } = useForm<FormInput>();

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

  const resetForm = () => {
    reset();
    setContent('');
    setFileList([]);
  };

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
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
    if (content.length > 5000) {
      setSubmissionError('Inhalt darf maximal 5000 Zeichen lang sein');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('groupId', data.groupId);
      formData.append('title', data.title);
      formData.append('content', content);
      formData.append('reporterFirstName', data.reporterFirstName);
      formData.append('reporterLastName', data.reporterLastName);

      // Append all files with index to identify them
      if (fileList.length > 0) {
        fileList.forEach((file, index) => {
          formData.append(`file-${index}`, file);
        });
        formData.append('fileCount', fileList.length.toString());
      }

      // Submit the form data
      const response = await fetch('/api/status-reports/submit', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Ihr Bericht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      }

      // Show success and reset form
      setSubmissionSuccess(true);
      resetForm();

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
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ '& > *': { mt: 3 } }}>
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
              Vielen Dank für Ihren Bericht!
            </Typography>
            <Typography variant="body1">
              Ihr Bericht wurde erfolgreich übermittelt. Er wird nun geprüft und nach Freigabe auf der Seite Ihrer Gruppe veröffentlicht.
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
                Wählen Sie die Gruppe aus, für die Sie einen Bericht einreichen möchten.
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
              
              <Controller
                name="groupId"
                control={control}
                defaultValue=""
                rules={{ required: 'Bitte wählen Sie eine Gruppe aus' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="group-select-label"
                    //label="Gruppe"
                    displayEmpty
                  >
                    {loading ? (
                      <MenuItem value="" disabled>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          Gruppen werden geladen...
                        </Box>
                      </MenuItem>
                    ) : groups.length === 0 ? (
                      <MenuItem value="" disabled>
                        Keine aktiven Gruppen gefunden
                      </MenuItem>
                    ) : (
                      [
                        <MenuItem key="placeholder" value="" disabled>
                          Bitte wählen Sie eine Gruppe
                        </MenuItem>,
                        ...groups.map((group) => (
                          <MenuItem key={group.id} value={group.id}>
                            {group.name}
                          </MenuItem>
                        ))
                      ]
                    )}
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
                  In diesem Abschnitt können Sie Ihren Bericht beschreiben:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  <li>Der <strong>Titel</strong> sollte kurz und prägnant sein (max. 100 Zeichen).</li>
                  <li>Der <strong>Inhalt</strong> kann Text, Listen und Links enthalten (max. 5000 Zeichen).</li>
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
              defaultValue=""
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
              maxLength={5000}
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
            title="Ansprechpartner"
            helpTitle="Ansprechpartner"
            helpText={
              <Typography variant="body2">
                Bitte geben Sie Ihre Kontaktdaten an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht.
              </Typography>
            }
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Controller
              name="reporterFirstName"
              control={control}
              defaultValue=""
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
              defaultValue=""
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
                Hier können Sie Anhänge wie Bilder oder PDFs hochladen, die mit Ihrem Bericht veröffentlicht werden sollen.
                Sie können maximal 5 Dateien hochladen (jeweils max. 5MB).
              </Typography>
            }
          />

          <Box sx={{ mb: 2 }}>
            <FileUpload
              onFilesSelect={setFileList}
              maxFiles={5}
            />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          endIcon={<SendIcon />}
        >
          {isSubmitting ? 'Wird gesendet...' : 'Bericht einreichen'}
        </Button>
      </Box>
    </Box>
  );
}