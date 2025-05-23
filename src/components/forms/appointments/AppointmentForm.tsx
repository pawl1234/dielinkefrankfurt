'use client';

import { useState, useRef } from 'react';
import { useForm, SubmitHandler, Controller, FormProvider } from 'react-hook-form';
import RichTextEditor from '../../editor/RichTextEditor';
import FileUpload from '@/components/upload/FileUpload';
import CoverImageUpload from '@/components/upload/CoverImageUpload';
import DateTimePicker from '@/components/ui/DateTimePicker';
import AddressFields from '../shared/AddressFields';
import RequesterFields from '../shared/RequesterFields';
import CaptchaField from '../shared/CaptchaField';
import FormSection from '../shared/FormSection';
import FormSuccessMessage from '../shared/FormSuccessMessage';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Collapse,
  Paper,
  CardMedia,
  CardContent,
  CardActions,
  Card,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface FormInput {
  title: string;
  teaser: string;
  mainText: string;
  startDateTime: Date;
  endDateTime?: Date;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  firstName?: string;
  lastName?: string;
  recurringText?: string;
  captchaToken?: string;
  files?: (File | Blob)[];
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
  onSubmit?: (data: FormInput, files: (File | Blob)[]) => Promise<void>;
  onCancel?: () => void;
}

export default function AppointmentForm({
  initialValues,
  mode = 'create',
  submitButtonText = 'Termin einreichen',
  onSubmit: customSubmit,
  onCancel
}: AppointmentFormProps) {
  // Create refs for each section to allow scrolling to errors
  const titleRef = useRef<HTMLDivElement>(null);
  const mainTextRef = useRef<HTMLDivElement>(null);
  const dateTimeRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const requesterRef = useRef<HTMLDivElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);

  const [formResetKey, setFormResetKey] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [mainText, setMainText] = useState(initialValues?.mainText || '');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);
  const [existingFileUrls, setExistingFileUrls] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(!!initialValues?.recurringText);
  const [teaserLength, setTeaserLength] = useState(initialValues?.teaser?.length || 0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isFeatured, setIsFeatured] = useState(initialValues?.featured || false);
  const [coverImage, setCoverImage] = useState<File | Blob | null>(null);
  const [croppedCoverImage, setCroppedCoverImage] = useState<File | Blob | null>(null);

  // Initialize existing file URLs and metadata if provided
  useState(() => {
    if (initialValues?.fileUrls) {
      try {
        const urls = JSON.parse(initialValues.fileUrls);
        setExistingFileUrls(Array.isArray(urls) ? urls : []);
      } catch (err) {
        console.error('Error parsing file URLs:', err);
        setExistingFileUrls([]);
      }
    }
    
    // If this is an edit of a featured appointment with metadata, check for cover images
    if (initialValues?.featured && initialValues?.metadata) {
      try {
        const metadata = JSON.parse(initialValues.metadata);
        
        if (metadata.coverImageUrl) {
          // Just set the URLs for display, but don't load the actual files
          // The user will need to select a new file if they want to change it
          setIsFeatured(true);
          console.log("Found cover image in metadata:", metadata.coverImageUrl);
          console.log("Found cropped cover image in metadata:", metadata.croppedCoverImageUrl);
        }
      } catch (err) {
        console.error('Error parsing appointment metadata:', err);
      }
    }
  });

  // Prepare default values from initialValues if provided
  const defaultValues: Partial<FormInput> = {
    teaser: '', // Default empty teaser
    title: ''
  };
  
  if (initialValues) {
    if (initialValues.title) defaultValues.title = initialValues.title;
    if (initialValues.teaser) defaultValues.teaser = initialValues.teaser;
    if (initialValues.startDateTime) defaultValues.startDateTime = new Date(initialValues.startDateTime);
    if (initialValues.endDateTime) defaultValues.endDateTime = new Date(initialValues.endDateTime);
    if (initialValues.street) defaultValues.street = initialValues.street;
    if (initialValues.city) defaultValues.city = initialValues.city;
    if (initialValues.state) defaultValues.state = initialValues.state;
    if (initialValues.postalCode) defaultValues.postalCode = initialValues.postalCode;
    if (initialValues.firstName) defaultValues.firstName = initialValues.firstName;
    if (initialValues.lastName) defaultValues.lastName = initialValues.lastName;
    if (initialValues.recurringText) defaultValues.recurringText = initialValues.recurringText;
  }

  const methods = useForm<FormInput>({
    defaultValues,
    mode: 'onSubmit'
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = methods;

  const showCaptcha = submissionCount >= 3;
  const startDateTime = watch('startDateTime');

  // Reset function for form
  const resetForm = () => {
    // Use React Hook Form's reset method for a complete reset
    reset({
      title: '',
      teaser: '',
      startDateTime: undefined as any,
      endDateTime: undefined as any,
      street: '',
      city: '',
      state: '',
      postalCode: '',
      firstName: '',
      lastName: '',
      recurringText: '',
      captchaToken: '',
    });

    // Reset all other state variables
    setMainText('');
    setFileList([]);
    setExistingFileUrls([]);
    setIsRecurring(false);
    setTeaserLength(0);
    setIsFeatured(false);
    setCoverImage(null);
    setCroppedCoverImage(null);
    
    // Force remount of the DateTimePicker components by changing the key
    setFormResetKey(prevKey => prevKey + 1);

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
      if (!data.title || data.title.trim() === '') {
        throw new Error('Titel ist erforderlich');
      }
      
      if (!mainText || mainText.trim() === '' || mainText.trim() === '<p></p>') {
        throw new Error('Beschreibung ist erforderlich');
      }
      
      if (!data.startDateTime) {
        throw new Error('Startdatum und -uhrzeit sind erforderlich');
      }

      // For featured appointments, cover image is required
      if (isFeatured && !coverImage && !initialValues?.metadata) {
        throw new Error('Für einen Featured Termin ist ein Cover-Bild erforderlich');
      }
      
      // If custom submit handler is provided (edit mode), use it
      if (customSubmit) {
        // Add cover image data to the form data
        const dataWithCover = {
          ...data,
          featured: isFeatured,
          coverImage: coverImage || undefined,
          croppedCoverImage: croppedCoverImage || undefined,
          mainText: mainText
        };
        await customSubmit(dataWithCover, fileList);
        return;
      }
      
      // Default create mode submission
      // Create form data
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('teaser', data.teaser || ''); // Always include teaser, but may be empty
      formData.append('mainText', mainText);

      // Handle date formatting
      if (data.startDateTime) {
        formData.append('startDateTime', data.startDateTime instanceof Date ?
          data.startDateTime.toISOString() :
          new Date(data.startDateTime).toISOString());
      }

      if (data.endDateTime) {
        formData.append('endDateTime', data.endDateTime instanceof Date ?
          data.endDateTime.toISOString() :
          new Date(data.endDateTime).toISOString());
      }

      // Add other form fields
      formData.append('street', data.street || '');
      formData.append('city', data.city || '');
      formData.append('state', data.state || '');
      formData.append('postalCode', data.postalCode || '');
      formData.append('firstName', data.firstName || '');
      formData.append('lastName', data.lastName || '');
      formData.append('recurringText', data.recurringText || '');
      formData.append('featured', isFeatured.toString());

      // Append all files with index to identify them
      if (fileList.length > 0) {
        fileList.forEach((file, index) => {
          formData.append(`file-${index}`, file);
        });
        formData.append('fileCount', fileList.length.toString());
      }

      // For edit mode, include existing file URLs
      if (mode === 'edit' && existingFileUrls.length > 0) {
        formData.append('existingFileUrls', JSON.stringify(existingFileUrls));
      }
      
      // Add cover image if available (for featured appointments)
      if (isFeatured && coverImage) {
        formData.append('coverImage', coverImage);
        if (croppedCoverImage) {
          formData.append('croppedCoverImage', croppedCoverImage);
        }
      }

      if (showCaptcha && !data.captchaToken && mode === 'create') {
        throw new Error('Bitte bestätigen Sie, dass Sie kein Roboter sind.');
      }

      // Submit the form data to the API
      const response = await fetch('/api/appointments/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
      
      // Update submission count for captcha tracking
      setSubmissionCount(prevCount => prevCount + 1);
    },
    resetForm,
    fieldRefs: {
      'title': titleRef,
      'mainText': mainTextRef,
      'startDateTime': dateTimeRef,
      'endDateTime': dateTimeRef,
      'street': addressRef,
      'city': addressRef,
      'state': addressRef,
      'postalCode': addressRef,
      'firstName': requesterRef,
      'lastName': requesterRef,
      'recurringText': dateTimeRef,
      'captchaToken': captchaRef,
      'coverImage': coverImageRef,
      'files': fileRef
    }
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    // Check for errors from react-hook-form
    if (Object.keys(errors).length > 0) {
      // Scroll to the first error field
      if (errors.title) {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.startDateTime) {
        dateTimeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.street || errors.city || errors.state || errors.postalCode) {
        addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.firstName || errors.lastName) {
        requesterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.captchaToken) {
        captchaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    // Validate mainText, which is not controlled by react-hook-form
    if (!mainText || mainText.trim() === '') {
      mainTextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            title="Vielen Dank für Ihre Terminanfrage!"
            message="Ihre Anfrage wurde erfolgreich übermittelt. Wir werden uns so schnell wie möglich mit Ihnen in Verbindung setzen."
            resetForm={resetForm}
            resetButtonText="Neuen Termin einreichen"
          />
        )}

        {!submissionSuccess && (
          <>
            <FormSection
              title="Antragsteller"
              helpTitle="Ihre Kontaktdaten"
              helpText={
                <Typography variant="body2">
                  Bitte geben Sie Ihren Namen an, damit wir die Anfrage intern zuordnen können. Die Informationen werden 
                  für die interne Freigabe verwendet und nicht nach außen gegeben. 
                </Typography>
              }
            >
              <Box ref={requesterRef}>
                <RequesterFields register={register} errors={errors} />
              </Box>
            </FormSection>

            <FormSection
              title="Beschreibung der Veranstaltung"
              helpTitle="Über die Veranstaltung"
              helpText={
                <>
                  <Typography variant="body2">
                    In diesem Abschnitt können Sie Ihre Veranstaltung beschreiben:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Der <strong>Titel</strong> der Veranstaltung wird sowohl in der Mittwochsmail als auch auf der Webseite angezeigt. Er sollte sehr kurz und prägnant sein.</li>
                    <li>Die <strong>Beschreibung</strong> ermöglicht eine detaillierte Beschreibung mit bis zu 5000 Zeichen. Diese Beschreibung wird angezeigt, wenn jemand die Termindetails öffnet. </li>
                    <li>Ein <strong>Featured Termin</strong> erscheint hervorgehoben in der Mittwochsmail. Dafür benötigt immer es <strong>Cover-Bild</strong>. Dieses können sie im nächsten Schritt hochladen.</li>
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
                      value: 5,
                      message: 'Titel muss mindestens 5 Zeichen lang sein'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''} 
                      fullWidth
                      placeholder="Titel der Veranstaltung..."
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

              <Box sx={{ mb: 3 }} ref={mainTextRef}>
                <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
                  Beschreibung <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
                </Typography>

                <Typography variant="body1" display="block" mb={2} gutterBottom>
                  Ausführliche und motivierende Beschreibung des Events. Text kann hier formatiert und Emojies verwerdet werden.
                </Typography>
                <RichTextEditor
                  value={mainText}
                  onChange={setMainText}
                  maxLength={5000}
                />
                {(fieldErrors.find(e => e.fieldName === 'mainText') || (!mainText || mainText.trim() === '')) && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {fieldErrors.find(e => e.fieldName === 'mainText')?.message || 'Beschreibung ist erforderlich'}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Als Featured Termin markieren (wird im Newsletter hervorgehoben)"
                />
                
                <Collapse in={helpOpen}>
                  <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Featured Termine
                    </Typography>
                    <Typography variant="body2">
                      Featured Termine werden im Newsletter besonders hervorgehoben. Sie erscheinen mit einem größeren Bild und mehr Platz.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Wenn Sie diese Option aktivieren, können Sie ein Titelbild hochladen, welches im Newsletter verwendet wird.
                    </Typography>
                  </Paper>
                </Collapse>
              </Box>
            </FormSection>

            {isFeatured && (
              <FormSection
                title="Cover-Bild für Newsletter"
                helpTitle="Cover-Bild hochladen"
                helpText={
                  <>
                    <Typography variant="body2">
                      Für einen Featured Termin <strong>muss</strong> stets ein Cover-Bild hochgeladen und 
                      zugeschnitten werden, damit die Darstellung im Newsletter gewährleistet wird.
                    </Typography>
                  </>
                }
              >
                <Box ref={coverImageRef}>
                  <CoverImageUpload 
                    onImageSelect={(originalImage, croppedImage) => {
                      setCoverImage(originalImage);
                      setCroppedCoverImage(croppedImage);
                    }}
                    initialCoverImageUrl={
                      initialValues?.metadata ? 
                        (() => {
                          try {
                            const metadata = JSON.parse(initialValues.metadata || '{}');
                            return metadata.coverImageUrl || undefined;
                          } catch {
                            return undefined;
                          }
                        })() : 
                        undefined
                    }
                    initialCroppedCoverImageUrl={
                      initialValues?.metadata ? 
                        (() => {
                          try {
                            const metadata = JSON.parse(initialValues.metadata || '{}');
                            return metadata.croppedCoverImageUrl || undefined;
                          } catch {
                            return undefined;
                          }
                        })() : 
                        undefined
                    }
                  />
                </Box>
              </FormSection>
            )}

            <FormSection
              title="Datei Anhänge"
              helpTitle="Anhänge hochladen"
              helpText={
                <>
                  <Typography variant="body2">
                    Hier können Sie anhänge wie Flyer oder Plakate als Bild oder PDF hochladen 
                  </Typography>
                </>
              }
            >
              <Box sx={{ mb: 2 }} ref={fileRef}>
                <FileUpload
                  onFilesSelect={setFileList}
                  maxFiles={5}
                />
              </Box>
              
              {/* Show existing files in edit mode */}
              {mode === 'edit' && existingFileUrls.length > 0 && (
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
            </FormSection>

            <FormSection
              title="Datum und Uhrzeit"
              helpTitle="Zeitliche Planung"
              helpText={
                <>
                  <Typography variant="body2">
                    Bitte geben Sie an, wann Ihre Veranstaltung stattfinden soll:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Das <strong>Startdatum</strong> und die <strong>Startzeit</strong> sind erforderlich.</li>
                    <li>Das <strong>Enddatum</strong> und die <strong>Endzeit</strong> sind optional, helfen aber bei der Planung.</li>
                    <li>Für <strong>wiederkehrende Termine</strong> aktivieren Sie bitte die entsprechende Option.</li>
                  </Box>
                </>
              }
            >
              <Box ref={dateTimeRef}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <Box>
                    <DateTimePicker
                      key={`start-date-${formResetKey}`}
                      label="Startdatum und -uhrzeit"
                      name="startDateTime"
                      register={register}
                      required={true}
                      setValue={setValue}
                      error={errors.startDateTime?.message || fieldErrors.find(e => e.fieldName === 'startDateTime')?.message}
                    />
                  </Box>

                  <Box>
                    <DateTimePicker
                      key={`end-date-${formResetKey}`}
                      label="Enddatum und -uhrzeit (optional)"
                      name="endDateTime"
                      register={register}
                      required={false}
                      setValue={setValue}
                      error={errors.endDateTime?.message || fieldErrors.find(e => e.fieldName === 'endDateTime')?.message}
                      minDate={startDateTime}
                    />
                  </Box>
                </Box>

                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Handelt es sich um einen wiederkehrenden Termin?"
                  />
                </Box>

                {isRecurring && (
                  <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">
                        Wiederholende Termine
                      </Typography>
                    <Typography variant="body1" display="block" sx={{ mt: 1 }}>
                      Beschreiben Sie den wiederkehrenden Termin in eigenen Worten, z. B. 'Jeden zweiten Mittwoch'.
                    </Typography>
                    <Controller
                      name="recurringText"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          multiline
                          rows={3}
                          fullWidth
                          placeholder="Beschreiben Sie den wiederkehrenden Termin..."
                          error={!!errors.recurringText || !!fieldErrors.find(e => e.fieldName === 'recurringText')}
                          helperText={errors.recurringText?.message || fieldErrors.find(e => e.fieldName === 'recurringText')?.message}
                          margin="normal"
                        />
                      )}
                    />

                    <Collapse in={helpOpen}>
                      <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                          Wiederholende Termine erklären
                        </Typography>
                        <Typography variant="body2">
                          Wenn Ihr Termin in regelmäßigen Abständen stattfindet, können Sie dies hier beschreiben. Schreiben Sie zum Beispiel:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                          <li>Jeden Dienstag um 15:00 Uhr für 4 Wochen</li>
                          <li>Alle zwei Wochen Mittwochmorgens</li>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Wenn der Termin nicht wiederholt wird, lassen Sie dieses Feld einfach leer.
                        </Typography>
                      </Paper>
                    </Collapse>
                  </Box>
                )}
              </Box>
            </FormSection>

            <FormSection
              title="Veranstaltungsort"
              helpTitle="Adressinformationen"
              helpText={
                <>
                  <Typography variant="body2">
                    Bitte geben Sie den Ort an, an dem die Veranstaltung stattfinden soll:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Die <strong>Straße und Hausnummer</strong> ermöglichen die genaue Lokalisierung.</li>
                    <li>Die <strong>Stadt</strong> ist wichtig für die regionale Einordnung.</li>
                    <li>Das <strong>Bundesland</strong> und die <strong>Postleitzahl</strong> helfen bei der administrativen Zuordnung.</li>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Sollten Sie noch keinen genauen Ort haben, können Sie die ungefähre Gegend angeben.
                  </Typography>
                </>
              }
            >
              <Box ref={addressRef}>
                <AddressFields register={register} errors={errors} />
              </Box>
            </FormSection>

            {showCaptcha && (
              <FormSection
                title="Sicherheitsverifizierung"
                helpTitle="Warum ist dies notwendig?"
                helpText={
                  <Typography variant="body2">
                    Die Sicherheitsverifizierung schützt unser Formular vor automatisierten Zugriffen und Spam.
                    Bitte bestätigen Sie, dass Sie kein Roboter sind, indem Sie das Captcha ausfüllen.
                  </Typography>
                }
              >
                <Box ref={captchaRef}>
                  <CaptchaField
                    register={register}
                    error={errors.captchaToken?.message || fieldErrors.find(e => e.fieldName === 'captchaToken')?.message}
                    setValue={setValue}
                  />
                </Box>
              </FormSection>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              {mode === 'create' && (
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Zurücksetzen
                </Button>
              )}
              {mode === 'edit' && onCancel && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              >
                {isSubmitting ? 'Wird gesendet...' : submitButtonText}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </FormProvider>
  );
}