'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RichTextEditor from './RichTextEditor';
import GroupLogoUpload from './GroupLogoUpload';
import ResponsiblePersonFields from './ResponsiblePersonFields';
import SectionHeader from './SectionHeader';
import { GroupStatus, ResponsiblePerson } from '@prisma/client';

export interface Group {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  status: GroupStatus;
  slug: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  metadata: string | null;
  responsiblePersons: ResponsiblePerson[];
}

export interface GroupEditFormInput {
  name: string;
  description: string;
  responsiblePersons: {
    firstName: string;
    lastName: string;
    email: string;
  }[];
  logo?: File | Blob;
  croppedLogo?: File | Blob;
  removeLogo?: boolean;
}

interface GroupEditFormProps {
  group: Group;
  onSubmitSuccess?: () => void;
  onCancel?: () => void;
}

export default function GroupEditForm({ group, onSubmitSuccess, onCancel }: GroupEditFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [description, setDescription] = useState(group.description || '');
  const [logo, setLogo] = useState<File | Blob | null>(null);
  const [croppedLogo, setCroppedLogo] = useState<File | Blob | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  
  // Parse the metadata to extract original logo URL if available
  const metadata = group.metadata ? JSON.parse(group.metadata) : null;
  const originalLogoUrl = metadata?.originalUrl || null;

  const methods = useForm<GroupEditFormInput>({
    defaultValues: {
      name: group.name,
      description: group.description,
      responsiblePersons: group.responsiblePersons.map(person => ({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email
      }))
    }
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = methods;

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
      setRemoveLogo(true);
      return;
    }
    
    setLogo(originalLogo);
    setCroppedLogo(croppedLogoFile);
    setRemoveLogo(false);
  };

  const onSubmit: SubmitHandler<GroupEditFormInput> = async (data) => {
    setSubmitting(true);
    setSubmissionError(null);
    
    try {
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
      
      // Handle logo updates
      if (removeLogo) {
        formData.append('removeLogo', 'true');
      } else if (logo && croppedLogo) {
        formData.append('logo', logo);
        formData.append('croppedLogo', croppedLogo);
      }
      
      // Submit the form data to the API
      const response = await fetch(`/api/admin/groups/${group.id}`, {
        method: 'PUT',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      }
      
      // Success - show success message
      setSubmissionSuccess(true);
      
      // Call the onSubmitSuccess callback if provided
      if (onSubmitSuccess) {
        setTimeout(() => {
          onSubmitSuccess();
        }, 500);
      }
      
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {submissionError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Fehler beim Speichern:</strong> {submissionError}
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
                Änderungen gespeichert!
              </Typography>
              <Typography variant="body1">
                Die Daten der Gruppe wurden erfolgreich aktualisiert.
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
              title="Gruppeninformationen"
              helpTitle="Allgemeine Informationen"
              helpText={
                <>
                  <Typography variant="body2">
                    Bearbeiten Sie die grundlegenden Informationen der Arbeitsgruppe:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Der <strong>Name</strong> sollte kurz und prägnant sein.</li>
                    <li>Die <strong>Beschreibung</strong> sollte die Ziele, Aktivitäten und Schwerpunkte der Gruppe erläutern.</li>
                  </Box>
                </>
              }
            />

            <Box sx={{ mb: 3 }}>
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

            <Box sx={{ mb: 3 }}>
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
              {errors.description && (
                <Typography variant="caption" color="error">
                  {errors.description.message}
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
              title="Gruppenlogo"
              helpTitle="Logo bearbeiten"
              helpText={
                <>
                  <Typography variant="body2">
                    Hier können Sie das Gruppenlogo bearbeiten oder austauschen:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Laden Sie ein <strong>quadratisches Logo</strong> hoch für optimale Darstellung.</li>
                    <li>Unterstützt werden <strong>JPEG, PNG und GIF</strong> Dateien bis 2MB.</li>
                    <li>Das Logo wird auf der Gruppenseite angezeigt.</li>
                  </Box>
                </>
              }
            />
            <GroupLogoUpload 
              onImageSelect={handleLogoSelect} 
              initialLogoUrl={originalLogoUrl || group.logoUrl || undefined}
              initialCroppedLogoUrl={group.logoUrl || undefined}
            />
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
              title="Verantwortliche Personen"
              helpTitle="Kontaktpersonen"
              helpText={
                <>
                  <Typography variant="body2">
                    Verwalten Sie die Kontaktdaten für die verantwortlichen Personen:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <li>Mindestens <strong>eine Person</strong> ist erforderlich.</li>
                    <li>Diese Personen werden bei <strong>Änderungen des Gruppenstatus</strong> benachrichtigt.</li>
                    <li>Die Kontaktdaten sind <strong>nicht öffentlich</strong> sichtbar.</li>
                  </Box>
                </>
              }
            />
            <ResponsiblePersonFields form={methods} />
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {onCancel && (
            <Button
              type="button"
              variant="outlined"
              color="inherit"
              onClick={onCancel}
              disabled={submitting}
            >
              Abbrechen
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
            endIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {submitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </Box>
      </Box>
    </FormProvider>
  );
}