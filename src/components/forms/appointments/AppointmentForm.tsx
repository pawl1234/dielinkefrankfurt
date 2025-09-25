'use client';

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { FieldValues } from 'react-hook-form';
import { useZodForm } from '@/hooks/useZodForm';
import { appointmentSubmitDataSchema } from '@/lib/validation/appointment';
import FormBase, { FieldRefMap, CustomValidationEntry } from '../shared/FormBase';
import RequesterSection from './sections/RequesterSection';
import DescriptionSection from './sections/DescriptionSection';
import CoverImageSection from './sections/CoverImageSection';
import FileAttachmentsSection from './sections/FileAttachmentsSection';
import DateTimeSection from './sections/DateTimeSection';
import AddressSection from './sections/AddressSection';
import { Box, Typography } from '@mui/material';

interface FormInput extends FieldValues {
  title: string;
  teaser?: string; // Optional for compatibility with Zod schema
  mainText: string;
  startDateTime: string; // Changed to string to match Zod schema
  endDateTime?: string; // Changed to string to match Zod schema
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string; // Made optional to match Zod schema
  lastName?: string; // Made optional to match Zod schema
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
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Move form submission handler implementation here
  const handleFormSubmit = async (data: FormInput) => {
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

  const defaultValues = useMemo(() => ({
    title: initialValues?.title || '',
    teaser: initialValues?.teaser || '', // Keep this for database compatibility
    mainText: initialValues?.mainText || '',
    startDateTime: initialValues?.startDateTime || '',
    endDateTime: initialValues?.endDateTime || '',
    street: initialValues?.street || '',
    city: initialValues?.city || '',
    state: initialValues?.state || '',
    postalCode: initialValues?.postalCode || '',
    firstName: initialValues?.firstName || '',
    lastName: initialValues?.lastName || '',
    recurringText: initialValues?.recurringText || '',
  }), [initialValues]);

  // Initialize form with basic setup
  const form = useZodForm({
    schema: appointmentSubmitDataSchema,
    defaultValues: {
      title: defaultValues.title,
      teaser: defaultValues.teaser,
      mainText: mainTextEditorContent,
      startDateTime: defaultValues.startDateTime,
      endDateTime: defaultValues.endDateTime,
      street: defaultValues.street,
      city: defaultValues.city,
      state: defaultValues.state,
      postalCode: defaultValues.postalCode,
      firstName: defaultValues.firstName,
      lastName: defaultValues.lastName,
      recurringText: defaultValues.recurringText
    },
    onSubmit: handleFormSubmit
  });

  const { control, setValue, watch } = form;

  const watchedStartDateTime = watch('startDateTime');
  const watchedRecurringText = watch('recurringText');

  // Custom validations for rich text editor, file uploads, and conditional fields
  const customValidations: CustomValidationEntry[] = useMemo(() => [
    {
      field: 'mainText',
      isValid: !!mainTextEditorContent &&
               mainTextEditorContent.trim() !== '' &&
               mainTextEditorContent.trim() !== '<p></p>' &&
               mainTextEditorContent.length <= 10000,
      message: mainTextEditorContent.length > 10000
        ? `Beschreibung ist zu lang. Maximal 10000 Zeichen erlaubt (aktuell: ${mainTextEditorContent.length})`
        : 'Beschreibung ist erforderlich und muss Inhalt haben.'
    },
    {
      field: 'coverImage',
      isValid: !isFeatured || !!coverImageFile || !!initialCoverImageUrl,
      message: 'Cover-Bild für Featured Termin erforderlich.'
    },
    {
      field: 'recurringText',
      isValid: !isRecurring || (!!watchedRecurringText && watchedRecurringText.trim() !== ''),
      message: 'Beschreibung für Wiederholung erforderlich.'
    },
    {
      field: 'files',
      isValid: !fileUploadError,
      message: fileUploadError || 'Datei-Upload-Fehler'
    }
  ], [mainTextEditorContent, isFeatured, coverImageFile, initialCoverImageUrl, isRecurring, watchedRecurringText, fileUploadError]);

  // Field references for FormBase error scrolling
  const fieldRefs: FieldRefMap = useMemo(() => ({
    'firstName': requesterRef,
    'lastName': requesterRef,
    'title': titleRef,
    'mainText': mainTextRef,
    'coverImage': coverImageRef,
    'files': fileRef,
    'startDateTime': dateTimeRef,
    'recurringText': dateTimeRef,
    'street': addressRef
  }), []);

  // Field order for FormBase error handling
  const fieldOrder: string[] = useMemo(() => [
    'firstName',
    'lastName',
    'title',
    'mainText',
    'coverImage',
    'files',
    'startDateTime',
    'recurringText',
    'street'
  ], []);

  const handleMainTextChange = useCallback((value: string) => {
    setMainTextEditorContent(value);
    setValue('mainText', value, { shouldValidate: false, shouldDirty: true });
  }, [setValue]);

  const handleCoverImageSelect = useCallback((original: File | Blob | null, cropped: File | Blob | null) => {
    setCoverImageFile(original);
    setCroppedCoverImageFile(cropped);
  }, []);

  const handleFileSelect = useCallback((files: (File | Blob)[]) => {
    setFileList(files);
  }, []);

  const handleReset = () => {
    setMainTextEditorContent(initialValues?.mainText || '');
    setFileList([]);
    setDeletedFileUrls([]);
    setIsRecurring(!!initialValues?.recurringText);
    setIsFeatured(initialValues?.featured || false);
    setCoverImageFile(null);
    setCroppedCoverImageFile(null);
    setFileUploadError(null);
    setFormResetKey(prevKey => prevKey + 1);
  };

  // Remove duplicate function definition


  
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
      formMethods={form}
      onSubmit={handleFormSubmit}
      fieldRefs={fieldRefs}
      fieldOrder={fieldOrder}
      onReset={handleReset}
      onCancel={onCancel}
      customValidations={customValidations}
      submitButtonText={submitButtonText}
      mode={mode}
      successMessage={mode === 'create' ? "Vielen Dank für Ihre Terminanfrage!" : "Termin erfolgreich aktualisiert!"}
      files={fileList}
    >
      <RequesterSection
        control={control}
        requesterRef={requesterRef}
        helpText={helpTextRequester}
      />

      <DescriptionSection
        control={control}
        titleRef={titleRef}
        mainTextRef={mainTextRef}
        helpText={helpTextDescription}
        mainTextEditorContent={mainTextEditorContent}
        handleMainTextChange={handleMainTextChange}
        isFeatured={isFeatured}
        setIsFeatured={setIsFeatured}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        customValidations={customValidations}
      />

      {isFeatured && (
        <CoverImageSection
          handleCoverImageSelect={handleCoverImageSelect}
          initialCoverImageUrl={initialCoverImageUrl}
          coverImageRef={coverImageRef}
          helpText={helpTextCoverImage}
          customValidations={customValidations}
        />
      )}

      <FileAttachmentsSection
        mode={mode}
        handleFileSelect={handleFileSelect}
        setFileUploadError={setFileUploadError}
        existingFileUrls={existingFileUrls}
        setExistingFileUrls={setExistingFileUrls}
        setDeletedFileUrls={setDeletedFileUrls}
        fileRef={fileRef}
        helpText={helpTextAttachments}
        customValidations={customValidations}
      />

      <DateTimeSection
        control={control}
        watchedStartDateTime={watchedStartDateTime}
        defaultValues={defaultValues}
        formResetKey={formResetKey}
        isRecurring={isRecurring}
        setIsRecurring={setIsRecurring}
        dateTimeRef={dateTimeRef}
        helpText={helpTextDateTime}
        customValidations={customValidations}
      />

      <AddressSection
        control={control}
        addressRef={addressRef}
        helpText={helpTextAddress}
      />
    </FormBase>
  );
}