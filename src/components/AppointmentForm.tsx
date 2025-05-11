'use client';

import { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import RichTextEditor from './RichTextEditor';
import FileUpload from './FileUpload';
import DateTimePicker from './DateTimePicker';
import AddressFields from './AddressFields';
import RequesterFields from './RequesterFields';
import CaptchaField from './CaptchaField';
import SectionHeader from './SectionHeader';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Alert,
  Paper,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import { Grid } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { LoadingButton } from '@mui/lab';
import SendIcon from '@mui/icons-material/Send';

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

export default function AppointmentForm() {
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [mainText, setMainText] = useState('');
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [teaserLength, setTeaserLength] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormInput>();

  const showCaptcha = submissionCount >= 3;
  const startDateTime = watch('startDateTime');

  const resetForm = () => {
    // Reset form fields
    setValue('teaser', '');
    setValue('startDateTime', undefined as any);
    setValue('endDateTime', undefined as any);
    setValue('street', '');
    setValue('city', '');
    setValue('state', '');
    setValue('postalCode', '');
    setValue('firstName', '');
    setValue('lastName', '');
    setValue('recurringText', '');
    setValue('captchaToken', '');

    // Reset other state
    setMainText('');
    setFileList([]);
    setIsRecurring(false);
    setTeaserLength(0);
  };

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('title', data.title)
      formData.append('teaser', data.teaser || '');
      formData.append('mainText', mainText);

      // Handle date formatting
      if (data.startDateTime) {
        formData.append('startDateTime', data.startDateTime instanceof Date ?
          data.startDateTime.toISOString() :
          new Date(data.startDateTime).toISOString());
      } else {
        throw new Error('Startdatum und -uhrzeit sind erforderlich');
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

      // Append all files with index to identify them
      if (fileList.length > 0) {
        fileList.forEach((file, index) => {
          formData.append(`file-${index}`, file);
        });
        formData.append('fileCount', fileList.length.toString());
      }

      if (showCaptcha && !data.captchaToken) {
        throw new Error('Bitte bestätigen Sie, dass Sie kein Roboter sind.');
      }

      console.log('Submitting form data...');
      const response = await fetch('/api/submit-appointment', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.');
      }

      // Update submission count and show success
      setSubmissionCount(submissionCount + 1);
      setSubmissionSuccess(true);

      // Reset form after successful submission
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
              Vielen Dank für Ihre Terminanfrage!
            </Typography>
            <Typography variant="body1">
              Ihre Anfrage wurde erfolgreich übermittelt. Wir werden uns so schnell wie möglich mit Ihnen in Verbindung setzen.
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
            title="Antragsteller"
            helpTitle="Ihre Kontaktdaten"
            helpText={
              <Typography variant="body2">
                Bitte geben Sie Ihren Namen an, damit wir Sie bei Rückfragen kontaktieren können.
                Diese Informationen werden vertraulich behandelt und nur für die Veranstaltungsplanung verwendet.
              </Typography>
            }
          />
          <RequesterFields register={register} errors={errors} />
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
            title="Beschreibung der Veranstaltung"
            helpTitle="Über die Veranstaltung"
            helpText={
              <>
                <Typography variant="body2">
                  In diesem Abschnitt können Sie Ihre Veranstaltung beschreiben:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  <li>Der <strong>Teaser</strong> erscheint als kurze Vorschau in Übersichten und sollte prägnant sein.</li>
                  <li>Die <strong>Beschreibung</strong> ermöglicht eine detaillierte Darstellung mit Formatierungsoptionen.</li>
                  <li>Optional können Sie ein <strong>Bild oder PDF</strong> hochladen für die visuelle Darstellung.</li>
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
            rules={{ required: 'Titel ist erforderlich', maxLength: 100 }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                placeholder="Titel der Veranstaltung..."
                inputProps={{ maxLength: 100 }}
                error={!!errors.title}
                helperText={errors.title?.message || `${field.value?.length || 0}/100`}
                margin="normal"
                onChange={(e) => field.onChange(e)} // You can customize the onChange logic here if needed
              />
            )}
          />

            <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
              Teaser <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
            </Typography>

            <Typography variant="body1" display="block" gutterBottom>
              Kurze Zusammenfassung Ihrer Veranstaltung (max. 300 Zeichen).
              {teaserLength > 100 && (
                <Typography variant="caption" color="error.main" component="span">
                  {' '}Bitte halten Sie den Teaser so kurz wie möglich.
                </Typography>
              )}
            </Typography>

            <Controller
              name="teaser"
              control={control}
              rules={{ required: 'Teaser ist erforderlich', maxLength: 300 }}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  rows={2}
                  fullWidth
                  placeholder="Kurze Zusammenfassung der Veranstaltung..."
                  inputProps={{ maxLength: 300 }}
                  onChange={(e) => {
                    field.onChange(e);
                    setTeaserLength(e.target.value.length);
                  }}
                  error={!!errors.teaser}
                  helperText={errors.teaser?.message || `${teaserLength}/300`}
                  margin="normal"
                />
              )}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
              Beschreibung <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
            </Typography>

            <Typography variant="body1" display="block" mb={2} gutterBottom>
              Ausführliche und motivierende Beschreibung des Events. Text kann hier formatiert und Emojies verwerdet werden.
            </Typography>
            <RichTextEditor
              value={mainText}
              onChange={setMainText}
              maxLength={1000}
            />
            {errors.mainText && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {errors.mainText.message}
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
            title="Datei Anhänge"
            helpTitle="Anhänge hochladen"
            helpText={
              <>
                <Typography variant="body2">
                  Hier können Sie anhänge wie Flyer oder Plakate als Bild oder PDF hochladen 
                </Typography>
              </>
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
      <Card variant="outlined" sx={{
        mb: 3,
        borderLeft: 4,
        borderLeftColor: 'primary.main',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
      }}>
        <CardContent>
          <SectionHeader
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
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <DateTimePicker
                label="Startdatum und -uhrzeit"
                name="startDateTime"
                register={register}
                required={true}
                setValue={setValue}
                error={errors.startDateTime?.message}
              />
            </Box>

            <Box>
              <DateTimePicker
                label="Enddatum und -uhrzeit (optional)"
                name="endDateTime"
                register={register}
                required={false}
                setValue={setValue}
                error={errors.endDateTime?.message}
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
                    error={!!errors.recurringText}
                    helperText={errors.recurringText?.message}
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
          />
          <AddressFields register={register} errors={errors} />
        </CardContent>
      </Card>

      {showCaptcha && (
        <Card variant="outlined" sx={{
          mb: 3,
          borderLeft: 4,
          borderLeftColor: 'primary.main',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)'
        }}>
          <CardContent>
            <SectionHeader
              title="Sicherheitsverifizierung"
              helpTitle="Warum ist dies notwendig?"
              helpText={
                <Typography variant="body2">
                  Die Sicherheitsverifizierung schützt unser Formular vor automatisierten Zugriffen und Spam.
                  Bitte bestätigen Sie, dass Sie kein Roboter sind, indem Sie das Captcha ausfüllen.
                </Typography>
              }
            />
            <CaptchaField
              register={register}
              error={errors.captchaToken?.message}
              setValue={setValue}
            />
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LoadingButton
          type="submit"
          variant="contained"
          color="primary"
          loading={isSubmitting}
          endIcon={<SendIcon />}
        >
          {isSubmitting ? 'Wird gesendet...' : 'Termin einreichen'}
        </LoadingButton>
      </Box>
    </Box>
  );
}