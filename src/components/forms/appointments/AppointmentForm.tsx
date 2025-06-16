'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useForm, Controller, FieldValues, Control } from 'react-hook-form';
import RichTextEditor from '../../editor/RichTextEditor';
import FileUpload from '@/components/upload/FileUpload';
import CoverImageUpload from '@/components/upload/CoverImageUpload';
import { FileThumbnailGrid, parseFileUrls } from '@/components/ui/FileThumbnail';
import DateTimePicker from '@/components/ui/DateTimePicker'; // Updated DateTimePicker will be used
import AddressFields from '../shared/AddressFields';
import RequesterFields from '../shared/RequesterFields';
// Captcha feature removed
import FormSection from '../shared/FormSection';
import FormBase, { FieldRefMap, CustomValidationEntry } from '../shared/FormBase';
import {
  Box, Typography, TextField, Checkbox, FormControlLabel,
  Collapse, Paper, Button,
} from '@mui/material';

interface FormInput extends FieldValues {
  title: string;
  teaser: string; // Keeping this for database compatibility
  mainText: string;
  startDateTime: Date | null;
  endDateTime?: Date | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName: string; // Required field now
  lastName: string; // Required field now
  recurringText?: string;
  // captchaToken removed
}

interface AppointmentFormProps {
  initialValues?: {
    id?: number;
    title?: string;
    teaser?: string;
    mainText?: string;
    startDateTime?: string;
    endDateTime?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    recurringText?: string | null;
    fileUrls?: string | null;
    featured?: boolean;
    metadata?: string | null;
  };
  mode?: 'create' | 'edit';
  submitButtonText?: string;
  onSubmit?: (data: FormInput, files: (File | Blob)[], existingFileUrls?: string[], deletedFileUrls?: string[]) => Promise<void>;
  onCancel?: () => void;
}

export default function AppointmentForm({
  initialValues, mode = 'create', submitButtonText = 'Termin einreichen',
  onSubmit: customSubmit, onCancel
}: AppointmentFormProps) {

  const requesterRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const mainTextRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const dateTimeRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  // Captcha feature removed

  const [formResetKey, setFormResetKey] = useState(0); // Still useful for non-RHF controlled parts if any
  // const [submissionCount, setSubmissionCount] = useState(0); // Captcha feature removed
  const [mainTextEditorContent, setMainTextEditorContent] = useState(initialValues?.mainText || '');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);
  const [existingFileUrls, setExistingFileUrls] = useState<string[]>([]);
  const [deletedFileUrls, setDeletedFileUrls] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(!!initialValues?.recurringText);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isFeatured, setIsFeatured] = useState(initialValues?.featured || false);
  const [coverImageFile, setCoverImageFile] = useState<File | Blob | null>(null);
  const [croppedCoverImageFile, setCroppedCoverImageFile] = useState<File | Blob | null>(null);
  const [initialCoverImageUrl, setInitialCoverImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => { /* ... parsing initialValues as before ... */
    if (initialValues?.fileUrls) {
        try { const urls = JSON.parse(initialValues.fileUrls); setExistingFileUrls(Array.isArray(urls) ? urls : []); }
        catch (err) { console.error('Error parsing file URLs:', err); }
    }
    if (initialValues?.featured && initialValues?.metadata) {
        try {
            const metadata = JSON.parse(initialValues.metadata);
            if (metadata.coverImageUrl) setInitialCoverImageUrl(metadata.coverImageUrl);
        } catch (err) { console.error('Error parsing appointment metadata:', err); }
    }
  }, [initialValues]);

  const defaultValues = useMemo<FormInput>(() => ({
    title: initialValues?.title || '',
    teaser: initialValues?.teaser || '', // Keep this for database compatibility
    mainText: initialValues?.mainText || '',
    startDateTime: initialValues?.startDateTime ? new Date(initialValues.startDateTime) : null,
    endDateTime: initialValues?.endDateTime ? new Date(initialValues.endDateTime) : null,
    street: initialValues?.street || '', city: initialValues?.city || '', state: initialValues?.state || '', postalCode: initialValues?.postalCode || '',
    firstName: initialValues?.firstName || '', lastName: initialValues?.lastName || '',
    recurringText: initialValues?.recurringText || '',
  }), [initialValues]);

  const methods = useForm<FormInput>({ defaultValues });
  const { register, watch, setValue, control, formState: { errors }, getValues } = methods;

  useEffect(() => {
    register('mainText');
    // Ensure teaser is registered and has a default empty value
    register('teaser');
    setValue('teaser', initialValues?.teaser || '');
  }, [register, setValue, initialValues?.teaser]);

  // Captcha feature removed
  const watchedStartDateTime = watch('startDateTime');

  const fieldRefs: FieldRefMap = useMemo(() => ({
    'firstName': requesterRef, 'lastName': requesterRef, 'title': titleRef, /* 'teaser': teaserRef, */ 'mainText': mainTextRef,
    'coverImage': coverImageRef, 'files': fileRef, 'startDateTime': dateTimeRef,
    'endDateTime': dateTimeRef, 'recurringText': dateTimeRef, 'street': addressRef,
  }), []);

  const fieldOrder: string[] = useMemo(() => [
    'firstName', 'lastName', 'title', /* 'teaser', */ 'mainText', 'coverImage', 'files',
    'startDateTime', 'endDateTime', 'recurringText',
    'street',
  ], []);

  const customValidations: CustomValidationEntry[] = useMemo(() => [
    { field: 'mainText', isValid: !!mainTextEditorContent && mainTextEditorContent.trim() !== '' && mainTextEditorContent.trim() !== '<p></p>', message: 'Beschreibung ist erforderlich.' },
    { field: 'coverImage', isValid: !isFeatured || !!coverImageFile || !!initialCoverImageUrl, message: 'Cover-Bild für Featured Termin erforderlich.' },
    { field: 'recurringText', isValid: !isRecurring || (!!getValues('recurringText') && getValues('recurringText')?.trim() !== ''), message: 'Beschreibung für Wiederholung erforderlich.' },
    // Captcha validation removed
  ], [mainTextEditorContent, isFeatured, coverImageFile, initialCoverImageUrl, isRecurring, getValues]);

  const handleMainTextChange = useCallback((value: string) => {
    setMainTextEditorContent(value);
    setValue('mainText', value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  }, [setValue]);

  const handleCoverImageSelect = useCallback((original: File | Blob | null, cropped: File | Blob | null) => {
    setCoverImageFile(original); setCroppedCoverImageFile(cropped);
    // Note: 'coverImage' is handled by custom validation, not RHF fields
  }, []);

  const handleFileSelect = useCallback((files: (File | Blob)[]) => {
    setFileList(files);
  }, []);

  const handleReset = () => { /* ... as before: reset local state ... */
    setMainTextEditorContent(initialValues?.mainText || '');
    setFileList([]); 
    setDeletedFileUrls([]);
    setIsRecurring(!!initialValues?.recurringText);
    // Reset teaser value handled by setValue below
    setValue('teaser', initialValues?.teaser || ''); // Reset teaser in React Hook Form
    setIsFeatured(initialValues?.featured || false);
    setCoverImageFile(null); setCroppedCoverImageFile(null);
    setFormResetKey(prevKey => prevKey + 1); // For things not reset by RHF
  };

  const handleFormSubmit = async (data: FormInput) => { /* ... as before: prepare and send data ... */
    // Make sure teaser always has a value
    const submissionPayload: FormInput & { 
      id?: number;
      featured: boolean;
      newCoverImageForUpload?: File | Blob;
      newCroppedCoverImageForUpload?: File | Blob;
    } = { 
      ...data, 
      teaser: data.teaser || '',  // Ensure teaser is never null
      mainText: mainTextEditorContent, 
      featured: isFeatured 
    };
    
    if (initialValues?.id) submissionPayload.id = initialValues.id;
    if (isFeatured) {
      if (coverImageFile) submissionPayload.newCoverImageForUpload = coverImageFile;
      if (croppedCoverImageFile) submissionPayload.newCroppedCoverImageForUpload = croppedCoverImageFile;
    }
    if (customSubmit) { await customSubmit(submissionPayload, fileList, existingFileUrls, deletedFileUrls); return; }
    const formData = new FormData();
    Object.entries(submissionPayload).forEach(([key, value]) => {
      if (key === 'newCoverImageForUpload' && value) formData.append('coverImage', value as Blob);
      else if (key === 'newCroppedCoverImageForUpload' && value) formData.append('croppedCoverImage', value as Blob);
      else if (value instanceof Date) formData.append(key, value.toISOString());
      else if (typeof value === 'boolean') formData.append(key, value.toString());
      else if (key === 'teaser') formData.append(key, (value as string) || ''); // Ensure teaser is never null
      else if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    if (fileList.length > 0) fileList.forEach((file, index) => formData.append(`files[${index}]`, file));
    if (mode === 'edit' && existingFileUrls.length > 0) formData.append('existingFileUrls', JSON.stringify(existingFileUrls));
    if (mode === 'edit' && deletedFileUrls.length > 0) formData.append('deletedFileUrls', JSON.stringify(deletedFileUrls));
    const apiEndpoint = mode === 'edit' && initialValues?.id ? `/api/appointments/submit/${initialValues.id}` : '/api/appointments/submit';
    const apiMethod = mode === 'edit' && initialValues?.id ? 'PUT' : 'POST';
    const response = await fetch(apiEndpoint, { method: apiMethod, body: formData });
    
    // Handle 413 Request Entity Too Large specifically
    if (response.status === 413) {
      throw new Error('Die hochgeladenen Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße oder Anzahl der Anhänge und versuchen Sie es erneut.');
    }
    
    // Handle other non-2xx responses
    if (!response.ok) {
      let errorMessage = 'Ein Fehler ist aufgetreten.';
      
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
  };

  const getCustomError = (fieldName: string): string | undefined => {
    if (methods.formState.isSubmitted || methods.formState.submitCount > 0) {
        const validation = customValidations.find(cv => cv.field === fieldName && !cv.isValid);
        return validation?.message;
    }
    return undefined;
  };
  
  // Restored full help texts
  const helpTextRequester = <Typography variant="body2"> Bitte geben Sie Ihren Namen an. Diese Informationen sind erforderlich, damit wir Ihre Anfrage bearbeiten und zuordnen können. Die Daten werden nur für die interne Freigabe verwendet und nicht nach außen gegeben. </Typography>;
  const helpTextDescription = <> <Typography variant="body2"> In diesem Abschnitt können Sie Ihre Veranstaltung beschreiben: </Typography> <Box component="ul" sx={{ pl: 2, mt: 1 }}> <li>Der <strong>Titel</strong> der Veranstaltung wird sowohl in der Mittwochsmail als auch auf der Webseite angezeigt. Er sollte sehr kurz und prägnant sein.</li> {/* <li>Der <strong>Teaser</strong> ist eine kurze Zusammenfassung (max. 250 Zeichen), die in Übersichten angezeigt wird.</li> */} <li>Die <strong>Beschreibung</strong> ermöglicht eine detaillierte Beschreibung mit bis zu 5000 Zeichen. Diese Beschreibung wird angezeigt, wenn jemand die Termindetails öffnet. </li> <li>Ein <strong>Featured Termin</strong> erscheint hervorgehoben in der Mittwochsmail. Dafür benötigt es immer ein <strong>Cover-Bild</strong>. Dieses können sie im nächsten Schritt hochladen.</li> </Box> </>;
  const helpTextCoverImage = <> <Typography variant="body2"> Für einen Featured Termin <strong>muss</strong> stets ein Cover-Bild hochgeladen und zugeschnitten werden, damit die Darstellung im Newsletter gewährleistet wird. </Typography> </>;
  const helpTextAttachments = <> <Typography variant="body2"> Hier können Sie Anhänge wie Flyer oder Plakate als Bild oder PDF hochladen (max. 5 Dateien, je max. 5MB). </Typography> </>;
  const helpTextDateTime = <> <Typography variant="body2"> Bitte geben Sie an, wann Ihre Veranstaltung stattfinden soll: </Typography> <Box component="ul" sx={{ pl: 2, mt: 1 }}> <li>Das <strong>Startdatum</strong> und die <strong>Startzeit</strong> sind erforderlich.</li> <li>Das <strong>Enddatum</strong> und die <strong>Endzeit</strong> sind optional, helfen aber bei der Planung.</li> <li>Für <strong>wiederkehrende Termine</strong> aktivieren Sie bitte die entsprechende Option und beschreiben Sie die Wiederholung.</li> </Box> </>;
  const helpTextAddress = <> <Typography variant="body2"> Bitte geben Sie den Ort an, an dem die Veranstaltung stattfinden soll: </Typography> <Box component="ul" sx={{ pl: 2, mt: 1 }}> <li>Die <strong>Straße und Hausnummer</strong> ermöglichen die genaue Lokalisierung.</li> <li>Die <strong>Stadt</strong> ist wichtig für die regionale Einordnung.</li> <li>Das <strong>Bundesland</strong> und die <strong>Postleitzahl</strong> helfen bei der administrativen Zuordnung.</li> </Box> <Typography variant="body2" sx={{ mt: 1 }}> Sollten Sie noch keinen genauen Ort haben, können Sie die ungefähre Gegend angeben oder das Feld frei lassen, wenn der Termin online stattfindet. </Typography> </>;
  // Captcha help text removed


  return (
    <FormBase
      formMethods={methods} onSubmit={handleFormSubmit} onReset={handleReset} onCancel={onCancel}
      submitButtonText={submitButtonText} mode={mode}
      successTitle={mode === 'create' ? "Vielen Dank für Ihre Terminanfrage!" : "Termin erfolgreich aktualisiert!"}
      successMessage={mode === 'create' ? "Ihre Anfrage wurde erfolgreich übermittelt." : "Die Termindaten wurden gespeichert."}
      fieldRefs={fieldRefs} fieldOrder={fieldOrder}
      customValidations={customValidations}
      files={fileList}
    >
      <FormSection title="Antragsteller" helpTitle="Ihre Kontaktdaten" helpText={helpTextRequester}>
        <Box ref={requesterRef}><RequesterFields register={register} errors={errors} control={control} /></Box>
      </FormSection>

      <FormSection title="Beschreibung der Veranstaltung" helpTitle="Über die Veranstaltung" helpText={helpTextDescription}>
        <Box sx={{ mb: 3 }} ref={titleRef}>
          <Typography variant="subtitle1" component="label" htmlFor="appointment-title-input" sx={{ fontWeight: 600 }}>
            Titel <Box component="span" sx={{ color: "primary.main" }}>*</Box>
          </Typography>
          <Controller name="title" control={control} rules={{ required: 'Titel ist erforderlich', minLength: { value: 5, message: 'Mind. 5 Zeichen' }, maxLength: { value: 100, message: 'Max. 100 Zeichen' } }}
            render={({ field }) => <TextField id="appointment-title-input" {...field} fullWidth placeholder="Titel der Veranstaltung..." error={!!errors.title} helperText={errors.title?.message || `${(field.value || '').length}/100`} margin="normal" />}
          />
        </Box>
        {/* Teaser section removed as no longer needed */}
        <Box sx={{ mb: 3 }} ref={mainTextRef}>
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>Beschreibung <Box component="span" sx={{ color: "primary.main" }}>*</Box></Typography>
          <Typography variant="body2" display="block" gutterBottom sx={{ mb: 2 }}> Ausführliche und motivierende Beschreibung des Events. Text kann hier formatiert und Emojis verwendet werden. </Typography>
          <RichTextEditor value={mainTextEditorContent} onChange={handleMainTextChange} maxLength={5000} placeholder="Ausführliche Beschreibung..." />
          {getCustomError('mainText') && <Typography variant="caption" color="error" sx={{mt:1, display:'block'}}>{getCustomError('mainText')}</Typography>}
        </Box>
        <Box sx={{ mt: 3 }}>
          <FormControlLabel control={<Checkbox checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} color="primary" />} label="Als Featured Termin markieren (wird im Newsletter hervorgehoben)" />
          <Button size="small" onClick={() => setHelpOpen(!helpOpen)} sx={{ ml: 1, textTransform: 'none' }}>{helpOpen ? 'Weniger Info' : 'Mehr Info'}</Button>
          <Collapse in={helpOpen}><Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}> <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}> Featured Termine </Typography> <Typography variant="body2"> Featured Termine werden im Newsletter besonders hervorgehoben. Sie erscheinen mit einem größeren Bild und mehr Platz. </Typography> <Typography variant="body2" sx={{ mt: 1 }}> Wenn Sie diese Option aktivieren, können Sie ein Titelbild hochladen, welches im Newsletter verwendet wird. Ein Cover-Bild ist für Featured Termine erforderlich. </Typography> </Paper></Collapse>
        </Box>
      </FormSection>

      {isFeatured && (
        <FormSection title="Cover-Bild für Newsletter" helpTitle="Cover-Bild hochladen" helpText={helpTextCoverImage}>
          <Box ref={coverImageRef}>
            <CoverImageUpload onImageSelect={handleCoverImageSelect} initialCoverImageUrl={initialCoverImageUrl} />
            {getCustomError('coverImage') && <Typography variant="caption" color="error" sx={{mt:1, display:'block'}}>{getCustomError('coverImage')}</Typography>}
          </Box>
        </FormSection>
      )}

      <FormSection title="Datei Anhänge (optional)" helpTitle="Anhänge hochladen" helpText={helpTextAttachments}>
        <Box ref={fileRef} sx={{mb:2}}><FileUpload onFilesSelect={handleFileSelect} maxFiles={5} /></Box>
        {mode === 'edit' && existingFileUrls.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Vorhandene Anhänge
            </Typography>
            <FileThumbnailGrid
              files={parseFileUrls(JSON.stringify(existingFileUrls))}
              gridSize={{ xs: 12, sm: 6, md: 4 }}
              height={140}
              showRemoveButton={true}
              onRemove={(file) => {
                if (file.url) {
                  // Add URL to deletion list
                  setDeletedFileUrls(prev => [...prev, file.url!]);
                  // Remove from existing files list
                  setExistingFileUrls(prev => prev.filter(url => url !== file.url));
                }
              }}
            />
          </Box>
        )}
      </FormSection>

      <FormSection title="Datum und Uhrzeit" helpTitle="Zeitliche Planung" helpText={helpTextDateTime}>
        <Box ref={dateTimeRef}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <DateTimePicker
                key={`start-date-${formResetKey}`} // Key for re-rendering on reset if needed
                label="Startdatum und -uhrzeit"
                name="startDateTime"
                control={control as unknown as Control<FieldValues>}
                rules={{ required: 'Startdatum und -uhrzeit sind erforderlich' }}
                required={true} // For asterisk
                error={errors.startDateTime?.message || undefined}
                defaultValue={defaultValues.startDateTime || undefined} // Pass RHF default
            />
            <DateTimePicker
                key={`end-date-${formResetKey}`}
                label="Enddatum und -uhrzeit (optional)"
                name="endDateTime"
                control={control as unknown as Control<FieldValues>}
                rules={{ validate: value => { const startDateVal = getValues('startDateTime'); if (startDateVal && value && value < startDateVal) { return 'Enddatum darf nicht vor dem Startdatum liegen.'; } return true; }}}
                error={errors.endDateTime?.message || undefined}
                minDate={watchedStartDateTime || undefined}
                defaultValue={defaultValues.endDateTime || undefined} // Pass RHF default
            />
          </Box>
          <Box sx={{ mt: 2 }}><FormControlLabel control={<Checkbox checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} color="primary" />} label="Handelt es sich um einen wiederkehrenden Termin?" /></Box>
          {isRecurring && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" component="label" htmlFor="recurring-text-input" sx={{ fontWeight: 600, display:'block', mb:1 }}>Beschreibung der Wiederholung <Box component="span" sx={{ color: "primary.main" }}>*</Box></Typography>
              <Typography variant="body2" display="block" sx={{ mb: 1 }}> Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. &apos;Jeden zweiten Mittwoch im Monat um 19 Uhr&apos;. </Typography>
              <Controller name="recurringText" control={control}
                render={({ field }) => <TextField id="recurring-text-input" {...field} fullWidth multiline rows={3} placeholder="z.B. Jeden Montag um 18:00 Uhr" error={!!errors.recurringText || !!getCustomError('recurringText')} helperText={errors.recurringText?.message || getCustomError('recurringText')} margin="normal" />}
              />
            </Box>
          )}
        </Box>
      </FormSection>

      <FormSection title="Veranstaltungsort (optional)" helpTitle="Adressinformationen" helpText={helpTextAddress}>
        <Box ref={addressRef}><AddressFields register={register} errors={errors} control={control} /></Box>
      </FormSection>

      {/* Captcha section removed */}
    </FormBase>
  );
}