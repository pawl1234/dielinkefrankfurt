'use client';

import { useState, useRef } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RichTextEditor from '../../editor/RichTextEditor';
import GroupLogoUpload from '../../upload/GroupLogoUpload';
import ResponsiblePersonFields from '../shared/ResponsiblePersonFields';
import FormSection from '../shared/FormSection';
import FormSuccessMessage from '../shared/FormSuccessMessage';
import { useFormSubmission } from '@/hooks/useFormSubmission';

export interface ResponsiblePerson {
  firstName: string;
  lastName: string;
  email: string;
}

export interface GroupFormInput {
  name: string;
  description: string;
  responsiblePersons: ResponsiblePerson[];
  logo?: File | Blob;
  croppedLogo?: File | Blob;
}

export default function GroupRequestForm() {
  // Create refs for each section to allow scrolling to errors
  const nameRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const responsiblePersonsRef = useRef<HTMLDivElement>(null);

  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<File | Blob | null>(null);
  const [croppedLogo, setCroppedLogo] = useState<File | Blob | null>(null);

  const methods = useForm<GroupFormInput>({
    defaultValues: {
      name: '',
      description: '',
      responsiblePersons: [{ firstName: '', lastName: '', email: '' }]
    }
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = methods;

  // Reset function for form
  const resetForm = () => {
    reset();
    setDescription('');
    setLogo(null);
    setCroppedLogo(null);
    // Clear submission success to show form again
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
  } = useFormSubmission<GroupFormInput>({
    onSubmit: async (data) => {
      // Validate required fields
      if (!data.name || data.name.trim() === '') {
        throw new Error('Gruppenname ist erforderlich');
      }
      
      if (!description || description.trim() === '' || description.trim() === '<p></p>') {
        throw new Error('Beschreibung ist erforderlich');
      }
      
      // Validate responsible persons
      if (!data.responsiblePersons || data.responsiblePersons.length === 0) {
        throw new Error('Mindestens eine verantwortliche Person ist erforderlich');
      }
      
      for (const person of data.responsiblePersons) {
        if (!person.firstName || !person.lastName || !person.email) {
          throw new Error('Alle Felder für verantwortliche Personen müssen ausgefüllt sein');
        }
        
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(person.email)) {
          throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
        }
      }
      
      // Create form data for file upload
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('description', description);
      
      // Add responsible persons
      formData.append('responsiblePersonsCount', data.responsiblePersons.length.toString());
      data.responsiblePersons.forEach((person, index) => {
        formData.append(`responsiblePerson[${index}].firstName`, person.firstName);
        formData.append(`responsiblePerson[${index}].lastName`, person.lastName);
        formData.append(`responsiblePerson[${index}].email`, person.email);
      });
      
      // Add logo files if available
      if (logo && croppedLogo) {
        formData.append('logo', logo);
        formData.append('croppedLogo', croppedLogo);
      }
      
      // Submit the form data to the API
      const response = await fetch('/api/groups/submit', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
    },
    resetForm,
    fieldRefs: {
      'name': nameRef,
      'description': descriptionRef,
      'logo': logoRef,
      'responsiblePersons': responsiblePersonsRef
    }
  });

  // Set description value in form when rich text editor changes
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setValue('description', value);
  };

  // Handle logo selection from the logo upload component
  const handleLogoSelect = (originalLogo: File | Blob, croppedLogoFile: File | Blob) => {
    // Check if they are empty blobs (which signals removal)
    if (originalLogo.size === 0 || croppedLogoFile.size === 0) {
      setLogo(null);
      setCroppedLogo(null);
      return;
    }
    
    setLogo(originalLogo);
    setCroppedLogo(croppedLogoFile);
  };

  const onSubmit: SubmitHandler<GroupFormInput> = (data) => {
    // Check for errors from react-hook-form
    if (Object.keys(errors).length > 0) {
      // Scroll to the first error field
      if (errors.name) {
        nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.description) {
        descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      
      if (errors.responsiblePersons) {
        responsiblePersonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    handleFormSubmit(data);
  };

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {submissionError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Fehler beim Absenden:</strong> {submissionError}
          </Alert>
        )}

        {submissionSuccess && (
          <FormSuccessMessage
            title="Vielen Dank für Ihren Vorschlag!"
            message="Ihre Anfrage für eine neue Arbeitsgruppe wurde erfolgreich übermittelt. Wir werden Ihren Vorschlag prüfen und Sie per E-Mail benachrichtigen, sobald die Gruppe freigeschaltet wurde."
            resetForm={resetForm}
            resetButtonText="Neuen Vorschlag einreichen"
          />
        )}

        {!submissionSuccess && (
          <>
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
                <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
                  Name der Gruppe <Box component="span" sx={{ color: 'primary.main' }}>*</Box>
                </Typography>
                <TextField
                  {...register('name', {
                    required: 'Gruppenname ist erforderlich',
                    minLength: { value: 3, message: 'Der Name muss mindestens 3 Zeichen lang sein' },
                    maxLength: { value: 100, message: 'Der Name darf maximal 100 Zeichen lang sein' }
                  })}
                  placeholder="z.B. AG Klimagerechtigkeit"
                  fullWidth
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name?.message}
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
                  value={description}
                  onChange={handleDescriptionChange}
                  maxLength={5000}
                  placeholder="Beschreibung der Arbeitsgruppe..."
                />
                {(errors.description || (fieldErrors.find(e => e.fieldName === 'description'))) && (
                  <Typography variant="caption" color="error">
                    {errors.description?.message || fieldErrors.find(e => e.fieldName === 'description')?.message || 'Beschreibung ist erforderlich'}
                  </Typography>
                )}
              </Box>
            </FormSection>

            <FormSection
              title="Gruppenlogo"
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
                <ResponsiblePersonFields form={methods} />
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
                {isSubmitting ? 'Wird gesendet...' : 'Gruppenvorschlag senden'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </FormProvider>
  );
}