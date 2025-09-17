'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import RichTextEditor from '../../editor/RichTextEditor';
import FileUpload from '@/components/upload/FileUpload';
import FormSection from '../shared/FormSection';
import FormBase, { FieldRefMap, CustomValidationEntry } from '../shared/FormBase'; // Ensure this path is correct

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
}

export default function StatusReportForm() {
  const groupRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reporterRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [contentEditorValue, setContentEditorValue] = useState('');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);

  // Status report limits from settings
  const [titleLimit, setTitleLimit] = useState(100);
  const [contentLimit, setContentLimit] = useState(5000);
  const [loadingLimits, setLoadingLimits] = useState(true);

  const methods = useForm<FormInput>({
    defaultValues: {
      groupId: '',
      title: '',
      content: '',
      reporterFirstName: '',
      reporterLastName: ''
    }
  });

  const { register, setValue, control, formState } = methods;

  useEffect(() => {
    register('content');
  }, [register]);

  const fieldRefs: FieldRefMap = useMemo(() => ({
    'groupId': groupRef,
    'title': titleRef,
    'content': contentRef,
    'reporterFirstName': reporterRef,
    'files': filesRef
  }), []);

  const fieldOrder: string[] = useMemo(() => [
    'groupId',
    'title',
    'content',
    'reporterFirstName',
    'files'
  ], []);

  const customValidations: CustomValidationEntry[] = useMemo(() => [
    {
      field: 'content',
      isValid: !!contentEditorValue && contentEditorValue.trim() !== '' && contentEditorValue.trim() !== '<p></p>',
      message: 'Inhalt ist erforderlich und muss Text enthalten.'
    }
  ], [contentEditorValue]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingGroups(true);
      setLoadingLimits(true);
      try {
        // Fetch groups and settings in parallel
        const [groupsResponse, settingsResponse] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/admin/newsletter/settings')
        ]);

        // Handle groups
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json();
          if (groupsData.success && Array.isArray(groupsData.groups)) {
            setGroups(groupsData.groups);
          } else {
            throw new Error('Invalid groups response format');
          }
        } else {
          throw new Error('Failed to fetch groups');
        }

        // Handle settings (for limits)
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setTitleLimit(settingsData.statusReportTitleLimit || 100);
          setContentLimit(settingsData.statusReportContentLimit || 5000);
        } else {
          // Use defaults if settings can't be fetched
          console.warn('Could not fetch settings, using default limits');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingGroups(false);
        setLoadingLimits(false);
      }
    };
    fetchData();
  }, []);

  const handleContentChange = (value: string) => {
    setContentEditorValue(value);
    setValue('content', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };

  const handleFileSelect = useCallback((files: (File | Blob)[]) => {
    setFileList(files);
  }, []);

  const handleReset = () => {
    setContentEditorValue('');
    setFileList([]);
  };

  const handleFormSubmit = async (data: FormInput) => {
    const formData = new FormData();
    formData.append('groupId', data.groupId);
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('reporterFirstName', data.reporterFirstName);
    formData.append('reporterLastName', data.reporterLastName);

    if (fileList.length > 0) {
      fileList.forEach((file, index) => formData.append(`file-${index}`, file));
      formData.append('fileCount', fileList.length.toString());
    }

    const response = await fetch('/api/status-reports/submit', { method: 'POST', body: formData });
    
    // Handle 413 Request Entity Too Large specifically
    if (response.status === 413) {
      throw new Error('Die hochgeladenen Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße oder Anzahl der Anhänge und versuchen Sie es erneut.');
    }
    
    // Handle other non-2xx responses
    if (!response.ok) {
      let errorMessage = 'Ihr Bericht konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.';
      
      try {
        // Try to parse JSON error response
        const result = await response.json();
        errorMessage = result.error || errorMessage;
      } catch {
        // If JSON parsing fails, provide generic error based on status
        if (response.status >= 500) {
          errorMessage = 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
        } else if (response.status === 404) {
          errorMessage = 'Der angeforderte Endpunkt wurde nicht gefunden.';
        } else if (response.status >= 400) {
          errorMessage = 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte überprüfen Sie Ihre Eingaben.';
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse successful response
    await response.json();
  };

  const getCustomError = (fieldName: string): string | undefined => {
    if (formState.isSubmitted || formState.submitCount > 0) {
        const validation = customValidations.find(cv => cv.field === fieldName && !cv.isValid);
        return validation?.message;
    }
    return undefined;
  };

  // Help text constants
  const helpTextGroup = <Typography variant="body2"> Wählen Sie die Gruppe aus, für die Sie einen Bericht einreichen möchten. Nur aktive Gruppen können ausgewählt werden. </Typography>;
  const helpTextReportInfo = <> <Typography variant="body2"> In diesem Abschnitt können Sie Ihren Bericht beschreiben: </Typography> <Box component="ul" sx={{ pl: 2, mt: 1 }}> <li>Der <strong>Titel</strong> sollte kurz und prägnant sein (max. {titleLimit} Zeichen).</li> <li>Der <strong>Inhalt</strong> kann Text, Listen und Links enthalten (max. {contentLimit} Zeichen).</li> </Box> </>;
  const helpTextReporter = <Typography variant="body2"> Bitte geben Sie Ihre Kontaktdaten an. Diese Informationen werden nur intern verwendet und nicht veröffentlicht. </Typography>;
  const helpTextAttachments = <Typography variant="body2"> Hier können Sie Anhänge wie Bilder oder PDFs hochladen, die mit Ihrem Bericht veröffentlicht werden sollen. Sie können maximal 5 Dateien hochladen (jeweils max. 5MB). </Typography>;


  if (loadingLimits) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Lade Formular...</Typography>
      </Box>
    );
  }

  return (
    <FormBase
      formMethods={methods}
      onSubmit={handleFormSubmit}
      onReset={handleReset}
      submitButtonText="Bericht einreichen"
      successTitle="Vielen Dank für Ihren Bericht!"
      successMessage="Ihr Bericht wurde erfolgreich übermittelt. Er wird nun geprüft und nach Freigabe auf der Seite Ihrer Gruppe veröffentlicht."
      fieldRefs={fieldRefs}
      fieldOrder={fieldOrder} // This is correctly passed
      files={fileList}
      customValidations={customValidations}
    >
      <FormSection title="Gruppe auswählen" helpTitle="Gruppe auswählen" helpText={helpTextGroup}>
        <Box ref={groupRef}>
          <FormControl fullWidth error={!!formState.errors.groupId} disabled={loadingGroups || groups.length === 0} sx={{ mt: 1 }}>
            <Controller
              name="groupId" control={control} rules={{ required: 'Bitte wählen Sie eine Gruppe aus' }}
              render={({ field }) => (
                <Select {...field} labelId="group-select-label-implicit" displayEmpty inputProps={{ 'aria-label': 'Gruppe auswählen' }}>
                  {loadingGroups ? ( <MenuItem value="" disabled> <Box sx={{ display: 'flex', alignItems: 'center' }}> <CircularProgress size={20} sx={{ mr: 1 }} /> Gruppen werden geladen... </Box> </MenuItem>
                  ) : groups.length === 0 ? ( <MenuItem value="" disabled> Keine aktiven Gruppen gefunden </MenuItem>
                  ) : ( [ <MenuItem key="placeholder" value="" disabled> Bitte wählen Sie eine Gruppe </MenuItem>, ...groups.map((group) => ( <MenuItem key={group.id} value={group.id}> {group.name} </MenuItem> )) ] )}
                </Select>
              )}
            />
            {formState.errors.groupId && (<FormHelperText>{formState.errors.groupId.message}</FormHelperText>)}
          </FormControl>
        </Box>
      </FormSection>

      <FormSection title="Berichtsinformationen" helpTitle="Details zum Bericht" helpText={helpTextReportInfo}>
        <Box sx={{ mb: 3 }} ref={titleRef}>
          <Typography variant="subtitle1" component="label" htmlFor="status-report-title" sx={{ fontWeight: 600 }}>
            Titel <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
          </Typography>
          <Controller
            name="title" control={control}
            rules={{ required: 'Titel ist erforderlich', maxLength: { value: titleLimit, message: `Max. ${titleLimit} Zeichen` }, minLength: { value: 3, message: 'Mind. 3 Zeichen' }}}
            render={({ field }) => ( <TextField id="status-report-title" {...field} fullWidth placeholder="Titel des Berichts..." inputProps={{ maxLength: titleLimit }} error={!!formState.errors.title} helperText={ formState.errors.title?.message || `${(field.value || '').length}/${titleLimit}` } margin="normal" /> )}
          />
        </Box>
        <Box sx={{ mb: 3 }} ref={contentRef}>
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
            Inhalt <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
          </Typography>
          <Typography variant="body2" display="block" gutterBottom sx={{ mb: 2 }}> Beschreiben Sie die Aktivitäten, Erfolge oder Pläne Ihrer Gruppe. Text kann hier formatiert und mit Links versehen werden. </Typography>
          <RichTextEditor value={contentEditorValue} onChange={handleContentChange} maxLength={contentLimit} placeholder="Inhalt des Berichts..." />
          {getCustomError('content') && ( <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}> {getCustomError('content')} </Typography> )}
          {formState.errors.content && !getCustomError('content') && ( <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}> {formState.errors.content.message} </Typography> )}
        </Box>
      </FormSection>

      <FormSection title="Ansprechpartner" helpTitle="Kontaktdaten des Erstellers" helpText={helpTextReporter}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }} ref={reporterRef}>
          <Controller
            name="reporterFirstName" control={control}
            rules={{ required: 'Vorname ist erforderlich', minLength: { value: 2, message: 'Mind. 2 Zeichen' }, maxLength: { value: 50, message: 'Max. 50 Zeichen' }}}
            render={({ field }) => ( <TextField {...field} label="Vorname *" fullWidth error={!!formState.errors.reporterFirstName} helperText={formState.errors.reporterFirstName?.message} margin="normal" /> )}
          />
          <Controller
            name="reporterLastName" control={control}
            rules={{ required: 'Nachname ist erforderlich', minLength: { value: 2, message: 'Mind. 2 Zeichen' }, maxLength: { value: 50, message: 'Max. 50 Zeichen' }}}
            render={({ field }) => ( <TextField {...field} label="Nachname *" fullWidth error={!!formState.errors.reporterLastName} helperText={formState.errors.reporterLastName?.message} margin="normal" /> )}
          />
        </Box>
      </FormSection>

      <FormSection title="Datei Anhänge (optional)" helpTitle="Zusätzliche Dateien" helpText={helpTextAttachments}>
        <Box sx={{ mb: 2 }} ref={filesRef}>
          <FileUpload onFilesSelect={handleFileSelect} maxFiles={5} />
          {getCustomError('files') && <Typography variant="caption" color="error">{getCustomError('files')}</Typography>}
        </Box>
      </FormSection>
    </FormBase>
  );
}