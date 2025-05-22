'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler, Controller, FormProvider } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import FormSection from './FormSection';
import FormSuccessMessage from './FormSuccessMessage';
import { useFormSubmission } from '@/hooks/useFormSubmission';

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
  // Create refs for each section to allow scrolling to errors
  const groupRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reporterRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);

  const methods = useForm<FormInput>({
    defaultValues: {
      groupId: '',
      title: '',
      content: '',
      reporterFirstName: '',
      reporterLastName: ''
    }
  });

  const { register, handleSubmit, setValue, control, reset, formState: { errors } } = methods;

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
        // This will be handled by the useFormSubmission hook
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Reset function for form
  const resetForm = () => {
    reset();
    setContent('');
    setFileList([]);
    
    // If we're in the success state, let FormSuccessMessage handle the reset
    if (submissionSuccess) {
      // We let the FormSuccessMessage handle the reload
      return;
    }
  };

  // Use our custom hook for form submission
  const {
    isSubmitting,
    submissionError,
    submissionSuccess,
    fieldErrors,
    handleSubmit: handleFormSubmit
  } = useFormSubmission<FormInput>({
    onSubmit: async (data) => {
      // Validate required fields
      if (!data.groupId || data.groupId.trim() === '') {
        throw new Error('Bitte wählen Sie eine Gruppe aus');
      }
      
      if (!data.title || data.title.trim() === '') {
        throw new Error('Titel ist erforderlich');
      }
      
      if (!content || content.trim() === '<p></p>' || content.trim() === '') {
        throw new Error('Inhalt ist erforderlich');
      }
      
      if (content.length > 5000) {
        throw new Error('Inhalt darf maximal 5000 Zeichen lang sein');
      }
      
      if (!data.reporterFirstName || data.reporterFirstName.trim() === '') {
        throw new Error('Vorname ist erforderlich');
      }
      
      if (!data.reporterLastName || data.reporterLastName.trim() === '') {
        throw new Error('Nachname ist erforderlich');
      }

      // Create form data for submission
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

      // Submit the form data to the API
      const response = await fetch('/api/status-reports/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ihr Bericht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      }
    },
    resetForm,
    fieldRefs: {
      'groupId': groupRef,
      'title': titleRef,
      'content': contentRef,
      'reporterFirstName': reporterRef,
      'reporterLastName': reporterRef,
      'files': filesRef
    }
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    // Check for errors from react-hook-form
    if (Object.keys(errors).length > 0) {
      // Scroll to the first error field
      if (errors.groupId) {
        groupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.title) {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.reporterFirstName || errors.reporterLastName) {
        reporterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    // Validate content, which is not controlled by react-hook-form
    if (!content || content.trim() === '' || content.trim() === '<p></p>') {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    handleFormSubmit(data);
  };

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ '& > *': { mt: 3 } }}>
        {submissionError && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" color="error" component="div" fontWeight="bold">
              Fehler beim Absenden:
            </Typography>
            <Typography variant="body2" color="error">
              {submissionError}
            </Typography>
          </Box>
        )}

        {submissionSuccess && (
          <FormSuccessMessage
            title="Vielen Dank für Ihren Bericht!"
            message="Ihr Bericht wurde erfolgreich übermittelt. Er wird nun geprüft und nach Freigabe auf der Seite Ihrer Gruppe veröffentlicht."
            resetForm={resetForm}
            resetButtonText="Neuen Bericht einreichen"
          />
        )}

        {!submissionSuccess && (
          <>
            <FormSection
              title="Gruppe auswählen"
              helpTitle="Gruppe auswählen"
              helpText={
                <Typography variant="body2">
                  Wählen Sie die Gruppe aus, für die Sie einen Bericht einreichen möchten.
                  Nur aktive Gruppen können ausgewählt werden.
                </Typography>
              }
            >
              <Box ref={groupRef}>
                <FormControl 
                  fullWidth 
                  error={!!errors.groupId || !!fieldErrors.find(e => e.fieldName === 'groupId')}
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
                  {(errors.groupId || fieldErrors.find(e => e.fieldName === 'groupId')) && (
                    <FormHelperText>
                      {errors.groupId?.message || fieldErrors.find(e => e.fieldName === 'groupId')?.message}
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>
            </FormSection>

            <FormSection
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
            >
              <Box sx={{ mb: 3 }} ref={titleRef}>
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
                      error={!!errors.title || !!fieldErrors.find(e => e.fieldName === 'title')}
                      helperText={
                        errors.title?.message || 
                        fieldErrors.find(e => e.fieldName === 'title')?.message || 
                        `${(field.value || '').length}/100`
                      }
                      margin="normal"
                    />
                  )}
                />
              </Box>

              <Box sx={{ mb: 3 }} ref={contentRef}>
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
                {(fieldErrors.find(e => e.fieldName === 'content') || (!content || content.trim() === '' || content.trim() === '<p></p>')) && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {fieldErrors.find(e => e.fieldName === 'content')?.message || 'Inhalt ist erforderlich'}
                  </Typography>
                )}
              </Box>
            </FormSection>

            <FormSection
              title="Ansprechpartner"
              helpTitle="Ansprechpartner"
              helpText={
                <Typography variant="body2">
                  Bitte geben Sie Ihre Kontaktdaten an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht.
                </Typography>
              }
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }} ref={reporterRef}>
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
                      error={!!errors.reporterFirstName || !!fieldErrors.find(e => e.fieldName === 'reporterFirstName')}
                      helperText={
                        errors.reporterFirstName?.message || 
                        fieldErrors.find(e => e.fieldName === 'reporterFirstName')?.message
                      }
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
                      error={!!errors.reporterLastName || !!fieldErrors.find(e => e.fieldName === 'reporterLastName')}
                      helperText={
                        errors.reporterLastName?.message ||
                        fieldErrors.find(e => e.fieldName === 'reporterLastName')?.message
                      }
                      margin="normal"
                    />
                  )}
                />
              </Box>
            </FormSection>

            <FormSection
              title="Datei Anhänge"
              helpTitle="Anhänge hochladen"
              helpText={
                <Typography variant="body2">
                  Hier können Sie Anhänge wie Bilder oder PDFs hochladen, die mit Ihrem Bericht veröffentlicht werden sollen.
                  Sie können maximal 5 Dateien hochladen (jeweils max. 5MB).
                </Typography>
              }
            >
              <Box sx={{ mb: 2 }} ref={filesRef}>
                <FileUpload
                  onFilesSelect={setFileList}
                  maxFiles={5}
                />
              </Box>
            </FormSection>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                type="button"
                variant="outlined"
                color="inherit"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Zurücksetzen
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                endIcon={isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {isSubmitting ? 'Wird gesendet...' : 'Bericht einreichen'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </FormProvider>
  );
}