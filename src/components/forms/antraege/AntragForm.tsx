'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { useForm, Controller, FieldValues } from 'react-hook-form';
import FormBase, { FieldRefMap, CustomValidationEntry } from '../shared/FormBase';
import FormSection from '../shared/FormSection';
import FileUpload from '@/components/upload/FileUpload';
import ReCaptcha from '@/components/shared/ReCaptcha';
import FormErrorBoundary from '../shared/FormErrorBoundary';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Collapse,
} from '@mui/material';

interface FormInput extends FieldValues {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  // Flattened purpose fields
  zuschussEnabled: boolean;
  zuschussAmount: number;
  personelleEnabled: boolean;
  personelleDetails: string;
  raumbuchungEnabled: boolean;
  raumbuchungLocation: string;
  raumbuchungNumberOfPeople: number;
  raumbuchungDetails: string;
  weiteresEnabled: boolean;
  weiteresDetails: string;
}

interface AntragFormProps {
  initialValues?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    title?: string;
    summary?: string;
    purposes?: string;
    fileUrls?: string | null;
  };
  mode?: 'create' | 'edit';
  submitButtonText?: string;
  onSubmit?: (data: FormInput, files: (File | Blob)[]) => Promise<void>;
  onCancel?: () => void;
}

export default function AntragForm({
  initialValues,
  mode = 'create',
  submitButtonText = 'Antrag einreichen',
  onSubmit: customSubmit,
  onCancel,
}: AntragFormProps) {
  // Refs for field validation
  const requesterRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const purposesRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  // State management
  const [formResetKey, setFormResetKey] = useState(0);
  const [fileList, setFileList] = useState<(File | Blob)[]>([]);
  // Form submission state now handled by React Hook Form
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  
  // Remove old state management - now handled by React Hook Form

  // Parse initial purposes if available
  const initialPurposes = useMemo(() => {
    if (initialValues?.purposes) {
      try {
        return JSON.parse(initialValues.purposes);
      } catch {
        return {};
      }
    }
    return {};
  }, [initialValues?.purposes]);

  // React Hook Form setup
  const methods = useForm<FormInput>({
    mode: 'onSubmit',
    defaultValues: {
      firstName: initialValues?.firstName || '',
      lastName: initialValues?.lastName || '',
      email: initialValues?.email || '',
      title: initialValues?.title || '',
      summary: initialValues?.summary || '',
      // Flattened purpose defaults
      zuschussEnabled: initialPurposes.zuschuss?.enabled || false,
      zuschussAmount: initialPurposes.zuschuss?.amount || 0,
      personelleEnabled: initialPurposes.personelleUnterstuetzung?.enabled || false,
      personelleDetails: initialPurposes.personelleUnterstuetzung?.details || '',
      raumbuchungEnabled: initialPurposes.raumbuchung?.enabled || false,
      raumbuchungLocation: initialPurposes.raumbuchung?.location || '',
      raumbuchungNumberOfPeople: initialPurposes.raumbuchung?.numberOfPeople || 0,
      raumbuchungDetails: initialPurposes.raumbuchung?.details || '',
      weiteresEnabled: initialPurposes.weiteres?.enabled || false,
      weiteresDetails: initialPurposes.weiteres?.details || '',
    },
  });

  const {
    control,
    formState: { errors, isSubmitted, submitCount },
    watch,
  } = methods;

  // Watch switch states for conditional rendering
  const zuschussEnabled = watch('zuschussEnabled');
  const personelleEnabled = watch('personelleEnabled');
  const raumbuchungEnabled = watch('raumbuchungEnabled');
  const weiteresEnabled = watch('weiteresEnabled');

  // Create field refs map for validation
  const fieldRefs: FieldRefMap = useMemo(() => ({
    firstName: requesterRef,
    lastName: requesterRef,
    email: requesterRef,
    title: titleRef,
    summary: summaryRef,
    zuschussEnabled: purposesRef,
    zuschussAmount: purposesRef,
    personelleEnabled: purposesRef,
    personelleDetails: purposesRef,
    raumbuchungEnabled: purposesRef,
    raumbuchungLocation: purposesRef,
    raumbuchungNumberOfPeople: purposesRef,
    raumbuchungDetails: purposesRef,
    weiteresEnabled: purposesRef,
    weiteresDetails: purposesRef,
    files: filesRef,
  }), []);

  // Custom validation entries
  const customValidations: CustomValidationEntry[] = useMemo(() => {
    const validations: CustomValidationEntry[] = [
      // At least one purpose must be selected
      {
        field: 'purposes',
        isValid: zuschussEnabled || personelleEnabled || raumbuchungEnabled || weiteresEnabled,
        message: 'Mindestens ein Zweck muss ausgewählt werden',
      },
    ];

    return validations;
  }, [zuschussEnabled, personelleEnabled, raumbuchungEnabled, weiteresEnabled]);

  // Get custom validation errors (similar to other forms)
  const getCustomError = (fieldName: string): string | undefined => {
    if (isSubmitted || submitCount > 0) {
      const validation = customValidations.find(cv => cv.field === fieldName && !cv.isValid);
      return validation?.message;
    }
    return undefined;
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: (File | Blob)[]) => {
    setFileList(files);
  }, []);

  // Handle reCAPTCHA verification
  const handleRecaptchaVerify = useCallback((token: string | null) => {
    setRecaptchaToken(token);
  }, []);

  // Remove old state management - now handled by React Hook Form

  // Define field order for validation scrolling
  const fieldOrder = useMemo(() => [
    'firstName', 'lastName', 'email', 'title', 'summary', 'purposes', 'files'
  ], []);

  // Handle form submission
  const handleFormSubmit = async (data: FormInput) => {
    // Reconstruct purposes object for API compatibility
    const purposes: Record<string, unknown> = {};
    
    if (data.zuschussEnabled) {
      purposes.zuschuss = {
        enabled: true,
        amount: Number(data.zuschussAmount),
      };
    }
    
    if (data.personelleEnabled) {
      purposes.personelleUnterstuetzung = {
        enabled: true,
        details: data.personelleDetails,
      };
    }
    
    if (data.raumbuchungEnabled) {
      purposes.raumbuchung = {
        enabled: true,
        location: data.raumbuchungLocation,
        numberOfPeople: Number(data.raumbuchungNumberOfPeople),
        details: data.raumbuchungDetails,
      };
    }
    
    if (data.weiteresEnabled) {
      purposes.weiteres = {
        enabled: true,
        details: data.weiteresDetails,
      };
    }

    // Create submission data with reconstructed purposes
    const submissionData = {
      ...data,
      purposes,
    };

    // Use custom submit handler if provided (e.g., for editing mode)
    if (customSubmit) {
      await customSubmit(submissionData, fileList);
      return;
    }

    // Default submission logic - prepare FormData
    const formData = new FormData();
    
    // Add form fields to FormData
    formData.append('firstName', data.firstName);
    formData.append('lastName', data.lastName);
    formData.append('email', data.email);
    formData.append('title', data.title);
    formData.append('summary', data.summary);
    formData.append('purposes', JSON.stringify(purposes));
    
    // Add files to FormData with correct naming convention
    if (fileList.length > 0) {
      fileList.forEach((file, index) => {
        formData.append(`file-${index}`, file);
      });
      formData.append('fileCount', fileList.length.toString());
    }
    
    // Add reCAPTCHA token if available
    if (recaptchaToken) {
      formData.append('recaptchaToken', recaptchaToken);
    }
    
    // Submit to API endpoint
    const response = await fetch('/api/antraege/submit', {
      method: 'POST',
      body: formData,
    });
    
    // Handle specific error cases with user-friendly messages
    if (response.status === 413) {
      throw new Error('Die hochgeladenen Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße oder Anzahl der Anhänge und versuchen Sie es erneut.');
    }
    
    if (!response.ok) {
      let errorMessage = 'Ein Fehler ist aufgetreten.';
      try {
        const result = await response.json();
        errorMessage = result.error || errorMessage;
      } catch {
        // Fallback error messages based on status
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
    
    // Parse success response
    await response.json();
  };

  // Handle form reset
  const handleReset = () => {
    setFileList([]);
    setRecaptchaToken(null);
    setFormResetKey(prev => prev + 1);
  };

  // Custom success message content
  const successMessage = (
    <>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Vielen Dank für Ihren Antrag. Dieser wird zeitnah vom Kreisvorstand geprüft und bearbeitet.
        Sie erhalten eine E-Mail-Benachrichtigung über den Status Ihres Antrags.
      </Typography>
      <Button
        variant="outlined"
        onClick={() => window.location.href = '/'}
        sx={{ mt: 2 }}
      >
        Zur Startseite
      </Button>
    </>
  );

  return (
    <FormErrorBoundary 
      formName="Antrag" 
      onRetry={handleReset}
      onReset={handleReset}
      showFormData={true}
    >
      <FormBase
        key={formResetKey}
        formMethods={methods}
        onSubmit={handleFormSubmit}
        fieldRefs={fieldRefs}
        fieldOrder={fieldOrder}
        customValidations={customValidations}
        files={fileList}
        submitButtonText={submitButtonText}
        successTitle="Antrag erfolgreich eingereicht!"
        successMessage={successMessage}
        onReset={handleReset}
        onCancel={onCancel}
        mode={mode}
      >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Requester Information */}
        <div ref={requesterRef}>
          <FormSection
            title="Antragsteller"
          >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            <Controller
              name="firstName"
              control={control}
              rules={{
                required: 'Vorname ist erforderlich',
                pattern: {
                  value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                  message: 'Bitte nur Buchstaben eingeben',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Vorname"
                  placeholder="Vorname"
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  margin="normal"
                  size="medium"
                  variant="outlined"
                  required
                />
              )}
            />

            <Controller
              name="lastName"
              control={control}
              rules={{
                required: 'Nachname ist erforderlich',
                pattern: {
                  value: /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/,
                  message: 'Bitte nur Buchstaben eingeben',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Nachname"
                  placeholder="Nachname"
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  margin="normal"
                  size="medium"
                  variant="outlined"
                  required
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              rules={{
                required: 'E-Mail ist erforderlich',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="E-Mail"
                  placeholder="ihre.email@example.com"
                  type="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  margin="normal"
                  size="medium"
                  variant="outlined"
                  required
                />
              )}
            />
          </Box>
          </FormSection>
        </div>

        {/* Antrag Details */}
        <div ref={titleRef}>
          <FormSection
            title="Antrag"
          >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Title Field */}
            <Controller
              name="title"
              control={control}
              rules={{
                required: 'Titel ist erforderlich',
                minLength: { value: 3, message: 'Titel muss mindestens 3 Zeichen lang sein' },
                maxLength: { value: 200, message: 'Titel darf maximal 200 Zeichen lang sein' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Titel des Antrags"
                  variant="outlined"
                  fullWidth
                  required
                  placeholder="z.B. Förderung für Jugendevent, Raumnutzung für Workshop"
                  error={!!errors.title}
                  helperText={
                    errors.title?.message || `${(field.value || '').length}/200 Zeichen`
                  }
                />
              )}
            />

            {/* Summary Field */}
            <Controller
              name="summary"
              control={control}
              rules={{
                required: 'Zusammenfassung ist erforderlich',
                minLength: { value: 10, message: 'Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein' },
                maxLength: { value: 300, message: 'Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Kurze Zusammenfassung"
                  variant="outlined"
                  fullWidth
                  required
                  multiline
                  rows={3}
                  placeholder="Beschreiben Sie kurz, worum es in Ihrem Antrag geht..."
                  error={!!errors.summary}
                  helperText={
                    errors.summary?.message || `${(field.value || '').length}/300 Zeichen`
                  }
                />
              )}
            />
          </Box>
          </FormSection>
        </div>

        {/* Purposes Section */}
        <div ref={purposesRef}>
          <FormSection
            title="Anliegen / Zwecke"
          >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Purpose Selection */}
            <Box 
              role="group" 
              aria-labelledby="purposes-section"
              aria-describedby="purposes-description"
              sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              <Typography 
                id="purposes-description" 
                variant="body2" 
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Bitte wählen Sie mindestens einen Zweck für Ihren Antrag aus:
              </Typography>
              
              {/* Zuschuss (Financial Support) */}
              <Box>
                <Controller
                  name="zuschussEnabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-zuschuss"
                          aria-describedby="zuschuss-description"
                          inputProps={{
                            'aria-label': 'Zuschuss für finanzielle Unterstützung auswählen',
                          }}
                        />
                      }
                      label="Zuschuss (Finanzielle Unterstützung)"
                      sx={{ alignItems: 'flex-start' }}
                    />
                  )}
                />
                <Typography 
                  id="zuschuss-description" 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ display: 'block', ml: 5, mt: 0.5 }}
                >
                  Beantragung finanzieller Mittel
                </Typography>
                <Collapse in={zuschussEnabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2, ml: 5 }}>
                    <Controller
                      name="zuschussAmount"
                      control={control}
                      rules={{
                        required: zuschussEnabled ? 'Betrag ist erforderlich' : false,
                        min: {
                          value: 1,
                          message: 'Betrag muss größer als 0 sein',
                        },
                        max: {
                          value: 50000,
                          message: 'Betrag darf maximal 50.000 Euro betragen',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Benötigter Betrag (Euro)"
                          type="number"
                          fullWidth
                          placeholder="z.B. 500"
                          inputProps={{ min: 1, step: 1 }}
                          error={!!errors.zuschussAmount}
                          helperText={errors.zuschussAmount?.message}
                          data-testid="field-zuschuss-amount"
                        />
                      )}
                    />
                  </Box>
                </Collapse>
              </Box>

              {/* Personelle Unterstützung */}
              <Box>
                <Controller
                  name="personelleEnabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-personelle-unterstuetzung"
                          inputProps={{
                            'aria-label': 'Personelle Unterstützung auswählen',
                          }}
                        />
                      }
                      label="Personelle Unterstützung"
                      sx={{ alignItems: 'flex-start' }}
                    />
                  )}
                />
                <Collapse in={personelleEnabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2, ml: 5 }}>
                    <Controller
                      name="personelleDetails"
                      control={control}
                      rules={{
                        required: personelleEnabled ? 'Beschreibung ist erforderlich' : false,
                        minLength: {
                          value: 10,
                          message: 'Beschreibung muss mindestens 10 Zeichen lang sein',
                        },
                        maxLength: {
                          value: 500,
                          message: 'Beschreibung darf maximal 500 Zeichen lang sein',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Beschreibung der benötigten Unterstützung"
                          multiline
                          rows={3}
                          fullWidth
                          placeholder="Beschreiben Sie, welche Art von personeller Unterstützung Sie benötigen..."
                          error={!!errors.personelleDetails}
                          helperText={
                            errors.personelleDetails?.message || `${(field.value || '').length}/500 Zeichen`
                          }
                          data-testid="field-personelle-details"
                        />
                      )}
                    />
                  </Box>
                </Collapse>
              </Box>

              {/* Raumbuchung */}
              <Box>
                <Controller
                  name="raumbuchungEnabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-raumbuchung"
                          inputProps={{
                            'aria-label': 'Raumbuchung auswählen',
                          }}
                        />
                      }
                      label="Raumbuchung"
                      sx={{ alignItems: 'flex-start' }}
                    />
                  )}
                />
                <Collapse in={raumbuchungEnabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2, ml: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Controller
                      name="raumbuchungLocation"
                      control={control}
                      rules={{
                        required: raumbuchungEnabled ? 'Ort ist erforderlich' : false,
                        minLength: {
                          value: 3,
                          message: 'Ort muss mindestens 3 Zeichen lang sein',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Gewünschter Ort/Raum"
                          fullWidth
                          placeholder="z.B. Gemeindesaal, Konferenzraum"
                          error={!!errors.raumbuchungLocation}
                          helperText={errors.raumbuchungLocation?.message}
                          data-testid="field-raumbuchung-location"
                        />
                      )}
                    />
                    
                    <Controller
                      name="raumbuchungNumberOfPeople"
                      control={control}
                      rules={{
                        required: raumbuchungEnabled ? 'Anzahl Personen ist erforderlich' : false,
                        min: {
                          value: 1,
                          message: 'Anzahl muss mindestens 1 sein',
                        },
                        max: {
                          value: 1000,
                          message: 'Anzahl darf maximal 1000 betragen',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Anzahl Personen"
                          type="number"
                          fullWidth
                          placeholder="z.B. 20"
                          inputProps={{ min: 1, step: 1 }}
                          error={!!errors.raumbuchungNumberOfPeople}
                          helperText={errors.raumbuchungNumberOfPeople?.message}
                          data-testid="field-raumbuchung-people"
                        />
                      )}
                    />
                    
                    <Controller
                      name="raumbuchungDetails"
                      control={control}
                      rules={{
                        required: raumbuchungEnabled ? 'Details sind erforderlich' : false,
                        minLength: {
                          value: 10,
                          message: 'Details müssen mindestens 10 Zeichen lang sein',
                        },
                        maxLength: {
                          value: 500,
                          message: 'Details dürfen maximal 500 Zeichen lang sein',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Weitere Details"
                          multiline
                          rows={3}
                          fullWidth
                          placeholder="Zeit, Dauer, besondere Anforderungen, etc..."
                          error={!!errors.raumbuchungDetails}
                          helperText={
                            errors.raumbuchungDetails?.message || `${(field.value || '').length}/500 Zeichen`
                          }
                          data-testid="field-raumbuchung-details"
                        />
                      )}
                    />
                  </Box>
                </Collapse>
              </Box>

              {/* Weiteres */}
              <Box>
                <Controller
                  name="weiteresEnabled"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-weiteres"
                          inputProps={{
                            'aria-label': 'Weiteres Anliegen auswählen',
                          }}
                        />
                      }
                      label="Weiteres"
                      sx={{ alignItems: 'flex-start' }}
                    />
                  )}
                />
                <Collapse in={weiteresEnabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2, ml: 5 }}>
                    <Controller
                      name="weiteresDetails"
                      control={control}
                      rules={{
                        required: weiteresEnabled ? 'Beschreibung ist erforderlich' : false,
                        minLength: {
                          value: 10,
                          message: 'Beschreibung muss mindestens 10 Zeichen lang sein',
                        },
                        maxLength: {
                          value: 500,
                          message: 'Beschreibung darf maximal 500 Zeichen lang sein',
                        },
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Beschreibung Ihres Anliegens"
                          multiline
                          rows={3}
                          fullWidth
                          placeholder="Beschreiben Sie Ihr weiteres Anliegen..."
                          error={!!errors.weiteresDetails}
                          helperText={
                            errors.weiteresDetails?.message || `${(field.value || '').length}/500 Zeichen`
                          }
                          data-testid="field-weiteres-details"
                        />
                      )}
                    />
                  </Box>
                </Collapse>
              </Box>
            </Box>

            {/* Purpose validation error */}
            {getCustomError('purposes') && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {getCustomError('purposes')}
              </Typography>
            )}
          </Box>
          </FormSection>
        </div>

        {/* File Upload Section */}
        <div ref={filesRef}>
          <FormSection
            title="Dateien anhängen (optional)"
            helpTitle="Unterstützende Dokumente"
            helpText="Sie können bis zu 5 Dateien (jeweils max. 10MB) anhängen. Unterstützte Formate: JPG, PNG, PDF, Word, Excel."
          >
          <Box sx={{ mb: 2 }} role="group" aria-labelledby="file-upload-section">
            <FileUpload 
              onFilesSelect={handleFileSelect}
              maxFiles={5}
              maxFileSize={10 * 1024 * 1024} // 10MB
              allowedFileTypes={['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx']}
              multiple={true}
            />
          </Box>
          </FormSection>
        </div>

        {/* reCAPTCHA Section - only show if enabled */}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ReCaptcha onVerify={handleRecaptchaVerify} />
          </Box>
        )}

      </Box>
      </FormBase>
    </FormErrorBoundary>
  );
}