'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form'; // Added useWatch
import {
  Box,
  Typography,
  TextField,
} from '@mui/material';
import RichTextEditor from '../../editor/RichTextEditor';
import GroupLogoUpload from '../../upload/GroupLogoUpload';
import ResponsiblePersonFields from '../shared/ResponsiblePersonFields';
import FormSection from '../shared/FormSection';
import FormBase, { FieldRefMap } from '../shared/FormBase';

export interface ResponsiblePerson {
  firstName: string;
  lastName: string;
  email: string;
}

export interface GroupFormInput {
  name: string;
  description: string; // Value from RichTextEditor, custom validated
  responsiblePersons: ResponsiblePerson[];
  logo?: File | Blob;
  croppedLogo?: File | Blob;
}

export default function GroupRequestForm() {
  const nameRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const responsiblePersonsRef = useRef<HTMLDivElement>(null);

  // State for RichTextEditor content for custom validation
  const [descriptionEditorContent, setDescriptionEditorContent] = useState('');
  const [logoFile, setLogoFile] = useState<File | Blob | null>(null); // Renamed for clarity
  const [croppedLogoFile, setCroppedLogoFile] = useState<File | Blob | null>(null); // Renamed
  // State to track if the form has been submitted
  const [formSubmitted, setFormSubmitted] = useState(false);
  // State for server field errors
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string> | undefined>(undefined);

  const methods = useForm<GroupFormInput>({
    defaultValues: {
      name: '',
      description: '', // Will be set by editor's onChange
      responsiblePersons: [{ firstName: '', lastName: '', email: '' }]
    },
    mode: 'onSubmit', // Only validate on submit
  });

  const { register, setValue, control, formState: { errors } } = methods;

  // Watch responsiblePersons array for real-time custom validation
  const watchedResponsiblePersons = useWatch({
    control,
    name: 'responsiblePersons',
    defaultValue: [{ firstName: '', lastName: '', email: '' }] // Ensure it has a default for initial check
  });

  const fieldRefs: FieldRefMap = useMemo(() => ({ // useMemo for stable ref object
    'name': nameRef,
    'description': descriptionRef,
    'logo': logoRef, // Even if not strictly "required", it's a form section
    'responsiblePersons': responsiblePersonsRef
  }), []); // Refs themselves are stable

  // Define the visual/logical order of fields for scrolling to errors
  const fieldOrder = useMemo(() => ['name', 'description', 'responsiblePersons', 'logo'], []);


  const customValidations = useMemo(() => [
    {
      field: 'description',
      isValid: !!descriptionEditorContent &&
               descriptionEditorContent.trim() !== '' &&
               descriptionEditorContent.trim() !== '<p></p>' &&
               descriptionEditorContent.length >= 50, // Check minimum length
      message: descriptionEditorContent.length > 0 && descriptionEditorContent.length < 50
        ? `Beschreibung muss mindestens 50 Zeichen lang sein (aktuell: ${descriptionEditorContent.length})`
        : 'Beschreibung ist erforderlich und muss Inhalt haben.'
    },
    {
      field: 'responsiblePersons',
      isValid:
        watchedResponsiblePersons &&
        watchedResponsiblePersons.length > 0 &&
        watchedResponsiblePersons.every(person =>
          person &&
          person.firstName && person.firstName.trim() !== '' &&
          person.lastName && person.lastName.trim() !== '' &&
          person.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email.trim())
        ),
      message: 'Mindestens eine verantwortliche Person mit vollständigen und gültigen Angaben (Vorname, Nachname, E-Mail) ist erforderlich.'
    }
    // Add more custom validations here if needed, e.g., for logo if it becomes required
  ], [descriptionEditorContent, watchedResponsiblePersons]);


  const handleDescriptionChange = (value: string) => {
    setDescriptionEditorContent(value); // Update state for custom validation
    setValue('description', value, { shouldValidate: false, shouldDirty: true }); // Update RHF, optionally validate
  };

  const handleLogoSelect = useCallback((original: File | Blob, cropped: File | Blob) => {
    if (original.size === 0 || cropped.size === 0) {
      setLogoFile(null);
      setCroppedLogoFile(null);
      setValue('logo', undefined, { shouldDirty: true });
      setValue('croppedLogo', undefined, { shouldDirty: true });
    } else {
      setLogoFile(original);
      setCroppedLogoFile(cropped);
      setValue('logo', original, { shouldDirty: true });
      setValue('croppedLogo', cropped, { shouldDirty: true });
    }
  }, [setValue]);

  const handleFormSubmit = async (data: GroupFormInput) => {
    // Set form as submitted to show validation errors
    setFormSubmitted(true);
    
    // Client-side RHF and custom validations are now handled by FormBase before this point.
    // This function now primarily focuses on preparing and sending data.

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description); // description from RHF (updated by editor)

    if (data.responsiblePersons && data.responsiblePersons.length > 0) {
        formData.append('responsiblePersonsCount', data.responsiblePersons.length.toString());
        data.responsiblePersons.forEach((person, index) => {
          formData.append(`responsiblePerson[${index}].firstName`, person.firstName);
          formData.append(`responsiblePerson[${index}].lastName`, person.lastName);
          formData.append(`responsiblePerson[${index}].email`, person.email);
        });
    }


    if (logoFile && croppedLogoFile) { // Use state variables for files
      formData.append('logo', logoFile);
      formData.append('croppedLogo', croppedLogoFile);
    }

    const response = await fetch('/api/groups/submit', {
      method: 'POST',
      body: formData
    });

    // Handle 413 Request Entity Too Large specifically
    if (response.status === 413) {
      throw new Error('Die hochgeladenen Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße des Logos und versuchen Sie es erneut.');
    }
    
    // Handle other non-2xx responses
    if (!response.ok) {
      let errorMessage = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';

      try {
        // Try to parse JSON error response
        const result = await response.json();

        // Check if server returned field errors
        if (result.fieldErrors) {
          setServerFieldErrors(result.fieldErrors);
          // Throw error to prevent success message from showing
          const firstError = Object.values(result.fieldErrors)[0];
          throw new Error(firstError || 'Validierungsfehler aufgetreten');
        }

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
    // Success is handled by FormBase and useFormSubmission
  };

  const handleReset = () => {
    // FormBase calls RHF's reset(). This handles custom state.
    setDescriptionEditorContent('');
    setLogoFile(null);
    setCroppedLogoFile(null);
    // Reset the form submitted state
    setFormSubmitted(false);
    // Reset server field errors
    setServerFieldErrors(undefined);
    // Resetting responsiblePersons to one empty entry is handled by RHF's reset if defaultValues are set up
  };

  // Get specific custom error messages for display
  const descriptionCustomError = customValidations.find(cv => cv.field === 'description' && !cv.isValid);
  const responsiblePersonsCustomError = customValidations.find(cv => cv.field === 'responsiblePersons' && !cv.isValid);

  return (
    <FormBase
      formMethods={methods}
      onSubmit={handleFormSubmit}
      onReset={handleReset}
      submitButtonText="Gruppenvorschlag senden"
      successTitle="Vielen Dank für Ihren Vorschlag!"
      successMessage="Ihre Anfrage für eine neue Arbeitsgruppe wurde erfolgreich übermittelt. Wir werden Ihren Vorschlag prüfen und Sie per E-Mail benachrichtigen, sobald die Gruppe freigeschaltet wurde."
      fieldRefs={fieldRefs}
      customValidations={customValidations}
      serverFieldErrors={serverFieldErrors}
      // validateBeforeSubmit removed as it's not in FormBaseProps
      fieldOrder={fieldOrder} // Pass the defined field order
    >
      <FormSection
        title="Gruppeninformationen"
        helpTitle="Allgemeine Informationen"
        helpText={
          <>
            <Typography variant="body2">
              Bitte geben Sie grundlegende Informationen zu Ihrer Arbeitsgruppe an:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>Der <strong>Name</strong> sollte kurz und prägnant sein.</li>
              <li>Die <strong>Beschreibung</strong> sollte die Ziele, Aktivitäten und Schwerpunkte der Gruppe erläutern.</li>
            </Box>
          </>
        }
      >
        <Box sx={{ mb: 3 }} ref={nameRef}>
          <Typography variant="subtitle1" component="label" htmlFor="group-name-input" sx={{ fontWeight: 600 }}>
            Name der Gruppe <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
          </Typography>
          <TextField
            id="group-name-input"
            {...register('name', {
              required: 'Gruppenname ist erforderlich',
              minLength: { value: 3, message: 'Der Name muss mindestens 3 Zeichen lang sein' },
              maxLength: { value: 100, message: 'Der Name darf maximal 100 Zeichen lang sein' }
            })}
            placeholder="z.B. AG Klimagerechtigkeit"
            fullWidth
            margin="normal"
            error={formSubmitted && !!errors.name}
            helperText={formSubmitted ? (errors.name?.message as string) : undefined}
          />
        </Box>

        <Box sx={{ mb: 3 }} ref={descriptionRef}>
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
            Beschreibung <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
          </Typography>
          <Typography variant="body2" display="block" gutterBottom sx={{ mb: 2 }}>
            Beschreiben Sie die Ziele, Aktivitäten und Schwerpunkte der Arbeitsgruppe (min. 50 Zeichen).
          </Typography>
          <RichTextEditor
            value={descriptionEditorContent} // Controlled by local state
            onChange={handleDescriptionChange}
            maxLength={5000}
            placeholder="Beschreibung der Arbeitsgruppe..."
          />
          {/* Display custom error for description if it exists and RHF hasn't put an error on 'description' field */}
          {formSubmitted && descriptionCustomError && !errors.description && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {descriptionCustomError.message}
            </Typography>
          )}
          {/* Display RHF error for description (if any rules were added to RHF for it) */}
          {formSubmitted && errors.description && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {errors.description.message as string}
            </Typography>
          )}
        </Box>
      </FormSection>

      <FormSection
        title="Gruppenlogo (optional)"
        helpTitle="Logo hochladen"
        helpText={
          <>
            <Typography variant="body2">
              Ein Logo hilft, Ihre Gruppe auf der Website leichter erkennbar zu machen:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>Laden Sie ein <strong>quadratisches Logo</strong> hoch für optimale Darstellung.</li>
              <li>Unterstützt werden <strong>JPEG, PNG und GIF</strong> Dateien bis 2MB.</li>
              <li>Das Logo wird auf der Gruppenseite angezeigt.</li>
            </Box>
          </>
        }
      >
        <Box ref={logoRef}>
          <GroupLogoUpload onImageSelect={handleLogoSelect} />
          {/* If logo becomes required, add custom validation and error display here */}
        </Box>
      </FormSection>

      <FormSection
        title="Verantwortliche Personen"
        helpTitle="Kontaktpersonen"
        helpText={
          <>
            <Typography variant="body2">
              Bitte geben Sie Kontaktdaten für die verantwortlichen Personen an:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <li>Mindestens <strong>eine Person</strong> ist erforderlich.</li>
              <li>Diese Personen werden bei <strong>Änderungen des Gruppenstatus</strong> benachrichtigt.</li>
              <li>Die Kontaktdaten sind <strong>nicht öffentlich</strong> sichtbar.</li>
            </Box>
          </>
        }
      >
        <Box ref={responsiblePersonsRef}>
          {/* ResponsiblePersonFields should internally use RHF's useFieldArray for best integration */}
          <ResponsiblePersonFields form={methods} showValidationErrors={formSubmitted} />
          {/* Display custom error for responsiblePersons section */}
          {formSubmitted && responsiblePersonsCustomError && !errors.responsiblePersons && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {responsiblePersonsCustomError.message}
            </Typography>
          )}
          {/* Display RHF error for responsiblePersons (e.g. if you add a top-level validate rule to RHF for the array) */}
          {formSubmitted && errors.responsiblePersons && typeof errors.responsiblePersons.message === 'string' && (
             <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {errors.responsiblePersons.message}
            </Typography>
          )}
          {/* Individual errors within ResponsiblePersonFields (e.g., errors.responsiblePersons[0].firstName)
              should ideally be handled and displayed *within* the ResponsiblePersonFields component itself. */}
        </Box>
      </FormSection>
    </FormBase>
  );
}
