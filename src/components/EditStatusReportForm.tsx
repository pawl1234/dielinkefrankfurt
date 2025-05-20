// src/components/EditStatusReportForm.tsx
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
  CardActions,
  Grid // Import Grid
} from '@mui/material';
// import SendIcon from '@mui/icons-material/Send'; // Not used
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import SectionHeader from './SectionHeader';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Attachment as AttachmentIcon } from '@mui/icons-material'; // Generic attachment icon

interface Group {
  id: string;
  name: string;
  slug: string;
}

// This is the data structure the form internally works with and submits (excluding files separately)
export interface StatusReportFormInput { // Renamed for clarity
  groupId: string;
  title: string;
  content: string; // This will be populated from RichTextEditor state
  reporterFirstName: string;
  reporterLastName: string;
  status: 'draft' | 'published' | 'rejected'; // Form's internal status representation
  // files are handled separately by FileUpload component
}

// This is the type for the initial status report data passed into the form
export interface InitialStatusReportData { // Renamed for clarity
  id: string; // Changed from number to string
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status: 'draft' | 'published' | 'rejected'; // Expects the mapped status
  createdAt: string;
  updatedAt: string;
  fileUrls: string | null;
}

interface EditStatusReportFormProps {
  statusReport: InitialStatusReportData; // Use the new type
  onSubmit: (
    data: StatusReportFormInput,
    newFiles: (File | Blob)[],
    retainedExistingFileUrls: string[]
  ) => Promise<void>;
  onCancel: () => void;
}

export default function EditStatusReportForm({
  statusReport,
  onSubmit,
  onCancel
}: EditStatusReportFormProps) {
  const [isSubmittingForm, setIsSubmittingForm] = useState(false); // Renamed to avoid conflict
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true); // Renamed
  const [editorContent, setEditorContent] = useState(statusReport.content || ''); // Renamed
  const [newlySelectedFiles, setNewlySelectedFiles] = useState<(File | Blob)[]>([]); // Renamed
  const [currentExistingFileUrls, setCurrentExistingFileUrls] = useState<string[]>([]); // Renamed

  useEffect(() => {
    if (statusReport.fileUrls) {
      try {
        const urls = JSON.parse(statusReport.fileUrls);
        setCurrentExistingFileUrls(Array.isArray(urls) ? urls : []);
      } catch (err) {
        console.error('Error parsing file URLs:', err);
        setCurrentExistingFileUrls([]);
      }
    } else {
      setCurrentExistingFileUrls([]);
    }
  }, [statusReport.fileUrls]);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const response = await fetch('/api/groups?status=ACTIVE'); // Fetch only active groups
        if (!response.ok) throw new Error('Failed to fetch groups');
        const data = await response.json();
        if (data.success && Array.isArray(data.groups)) {
          setGroups(data.groups);
        } else {
          throw new Error('Invalid response format for groups');
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setSubmissionError('Es konnten keine Gruppen geladen werden.');
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  const defaultFormValues: Omit<StatusReportFormInput, 'content'> = { // Omit content as it's handled by RichTextEditor
    groupId: statusReport.groupId,
    title: statusReport.title,
    reporterFirstName: statusReport.reporterFirstName,
    reporterLastName: statusReport.reporterLastName,
    status: statusReport.status,
  };

  const {
    // register, // Not directly used for controlled components
    handleSubmit,
    control,
    formState: { errors },
    watch // To get current form values for helper text
  } = useForm<StatusReportFormInput>({ // Use StatusReportFormInput here
    defaultValues: defaultFormValues,
  });

  const titleValue = watch('title', statusReport.title); // For character count

  const handleActualFormSubmit: SubmitHandler<StatusReportFormInput> = async (data) => {
    setIsSubmittingForm(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    if (!editorContent || editorContent.trim() === '<p></p>' || editorContent.trim() === '') {
      setSubmissionError('Bitte geben Sie einen Inhalt ein');
      setIsSubmittingForm(false);
      return;
    }
    if (editorContent.length > 65535) { // Typical TEXT limit, adjust if needed
      setSubmissionError('Inhalt ist zu lang.');
      setIsSubmittingForm(false);
      return;
    }

    try {
      const dataWithContent = { ...data, content: editorContent };
      await onSubmit(dataWithContent, newlySelectedFiles, currentExistingFileUrls);
      setSubmissionSuccess(true);
      // Clearing files after successful submit might be desired, or let parent handle refresh
      // setNewlySelectedFiles([]); 
      // Parent component (AdminStatusReportsPage) will handle closing the form or refreshing
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(handleActualFormSubmit)} sx={{ '& > *': { mt: 3 } }}>
      {submissionError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Fehler:</strong> {submissionError}
        </Alert>
      )}
      {submissionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Statusmeldung erfolgreich aktualisiert!
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Gruppe auswählen" />
          <FormControl fullWidth error={!!errors.groupId} disabled={loadingGroups || groups.length === 0}>
            <InputLabel id="group-select-label">Gruppe</InputLabel>
            <Controller
              name="groupId"
              control={control}
              rules={{ required: 'Bitte wählen Sie eine Gruppe aus' }}
              render={({ field }) => (
                <Select {...field} labelId="group-select-label" label="Gruppe">
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.groupId && <FormHelperText>{errors.groupId.message}</FormHelperText>}
          </FormControl>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Berichtsinformationen" />
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600, display: 'block', mt: 2 }}>
            Titel <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Titel ist erforderlich', maxLength: { value: 100, message: 'Maximal 100 Zeichen' }, minLength: { value: 3, message: 'Mindestens 3 Zeichen' }}}
            render={({ field }) => (
              <TextField {...field} fullWidth placeholder="Titel des Berichts..." error={!!errors.title} helperText={errors.title?.message || `${(titleValue || '').length}/100`} margin="dense" />
            )}
          />
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600, display: 'block', mt: 2 }}>
            Inhalt <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <RichTextEditor value={editorContent} onChange={setEditorContent} placeholder="Inhalt des Berichts..." />
          {/* Add manual error display for editorContent if needed, react-hook-form won't validate it directly */}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Status" />
          <FormControl fullWidth error={!!errors.status}>
            <InputLabel id="status-select-label">Status</InputLabel>
            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status ist erforderlich' }}
              render={({ field }) => (
                <Select {...field} labelId="status-select-label" label="Status">
                  <MenuItem value="draft">Entwurf (Neu)</MenuItem>
                  <MenuItem value="published">Veröffentlicht (Aktiv)</MenuItem>
                  <MenuItem value="rejected">Abgelehnt</MenuItem>
                </Select>
              )}
            />
            {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
          </FormControl>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Ansprechpartner" />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="reporterFirstName"
                control={control}
                rules={{ required: 'Vorname ist erforderlich', minLength: {value: 2, message: 'Mind. 2 Zeichen'}, maxLength: {value: 50, message: 'Max. 50 Zeichen'} }}
                render={({ field }) => (
                  <TextField {...field} label="Vorname" fullWidth error={!!errors.reporterFirstName} helperText={errors.reporterFirstName?.message} margin="normal" />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="reporterLastName"
                control={control}
                rules={{ required: 'Nachname ist erforderlich', minLength: {value: 2, message: 'Mind. 2 Zeichen'}, maxLength: {value: 50, message: 'Max. 50 Zeichen'} }}
                render={({ field }) => (
                  <TextField {...field} label="Nachname" fullWidth error={!!errors.reporterLastName} helperText={errors.reporterLastName?.message} margin="normal" />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Datei Anhänge" />
          <FileUpload onFilesSelect={setNewlySelectedFiles} maxFiles={5 - currentExistingFileUrls.length} />
          {currentExistingFileUrls.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Vorhandene Anhänge ({currentExistingFileUrls.length})</Typography>
              <Grid container spacing={2}>
                {currentExistingFileUrls.map((fileUrl) => {
                  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(fileUrl);
                  const isPdf = /\.pdf$/i.test(fileUrl);
                  const fileName = fileUrl.split('/').pop()?.split('?')[0] || `Anhang`;
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={fileUrl}>
                      <Card variant="outlined">
                        {isImage && <CardMedia component="img" height="140" image={fileUrl} alt={fileName} sx={{ objectFit: 'cover' }} />}
                        {isPdf && <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 140 }}><PictureAsPdfIcon sx={{ fontSize: 40, color: 'error.main' }} /></Box>}
                        {!isImage && !isPdf && <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 140 }}><AttachmentIcon sx={{ fontSize: 40, color: 'text.secondary' }} /></Box>}
                        <CardContent sx={{ py: 1 }}><Typography variant="caption" noWrap title={fileName}>{fileName}</Typography></CardContent>
                        <CardActions sx={{ justifyContent: 'space-between' }}>
                          <Button size="small" href={fileUrl} target="_blank" rel="noopener noreferrer">Öffnen</Button>
                          <Button size="small" color="error" onClick={() => setCurrentExistingFileUrls(prev => prev.filter(url => url !== fileUrl))}>Entfernen</Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={isSubmittingForm}>Abbrechen</Button>
        <Button type="submit" variant="contained" color="primary" disabled={isSubmittingForm}>
          {isSubmittingForm ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </Button>
      </Box>
    </Box>
  );
}