// src/components/EditGroupForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller, useFieldArray } from 'react-hook-form'; // Import useFieldArray
import {
  Box, Typography, TextField, Button, Card, CardContent, Alert, MenuItem,
  FormControl, InputLabel, Select, FormHelperText, Grid, IconButton // Added IconButton
} from '@mui/material';
import RichTextEditor from '../../editor/RichTextEditor';
import GroupLogoUpload from '../../upload/GroupLogoUpload';
import SectionHeader from '../../layout/SectionHeader';
import { GroupStatus, ResponsiblePerson as PrismaResponsiblePerson } from '@prisma/client'; // Import Prisma types
import PersonAddIcon from '@mui/icons-material/PersonAdd'; // For adding persons
import DeleteIcon from '@mui/icons-material/Delete';     // For removing persons

// Input for a single responsible person in the form
export interface ResponsiblePersonInput {
    firstName: string;
    lastName: string;
    email: string;
}

// Data structure for the form's input fields
export interface EditGroupFormInput {
  name: string;
  slug: string;
  description: string;
  status: GroupStatus;
  responsiblePersons: ResponsiblePersonInput[]; // Array for responsible persons
}

// Data for the group being edited, passed into the form
export interface InitialGroupData {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string | null;
  metadata?: string | null;
  status: GroupStatus;
  responsiblePersons: PrismaResponsiblePerson[]; // Expecting full Prisma type here
}

interface EditGroupFormProps {
  group: InitialGroupData;
  onSubmit: (
    data: EditGroupFormInput,
    newLogoFile: File | Blob | null,
    newCroppedLogoFile: File | Blob | null
  ) => Promise<void>;
  onCancel: () => void;
}

export default function EditGroupForm({ group, onSubmit, onCancel }: EditGroupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [editorDescription, setEditorDescription] = useState(group.description || '');
  const [newLogo, setNewLogo] = useState<File | Blob | null>(null);
  const [newCroppedLogo, setNewCroppedLogo] = useState<File | Blob | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(group.logoUrl || null);

  const methods = useForm<EditGroupFormInput>({
    defaultValues: {
      name: group.name,
      slug: group.slug,
      status: group.status,
      // description is handled by editorDescription state directly
      responsiblePersons: group.responsiblePersons?.map(rp => ({ 
          firstName: rp.firstName, 
          lastName: rp.lastName, 
          email: rp.email 
      })) || [{ firstName: '', lastName: '', email: '' }] // Start with one if none
    },
  });

  const { control, handleSubmit, formState: { errors }, watch, setValue, reset } = methods;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "responsiblePersons"
  });
  
  useEffect(() => {
    // Reset form when 'group' prop changes
    reset({
        name: group.name,
        slug: group.slug,
        status: group.status,
        responsiblePersons: group.responsiblePersons?.map(rp => ({
            firstName: rp.firstName,
            lastName: rp.lastName,
            email: rp.email
        })) || [{ firstName: '', lastName: '', email: '' }]
    });
    setEditorDescription(group.description || '');
    setCurrentLogoUrl(group.logoUrl || null);
    setNewLogo(null);
    setNewCroppedLogo(null);
    setSubmissionSuccess(false);
    setSubmissionError(null);
  }, [group, reset, setEditorDescription, setCurrentLogoUrl, setNewLogo, setNewCroppedLogo]);


  const nameValue = watch('name', group.name);
  const slugValue = watch('slug', group.slug);

  const handleLogoSelected = (originalFile: File | Blob | null, croppedFile: File | Blob | null) => {
    setNewLogo(originalFile);
    setNewCroppedLogo(croppedFile);
    if (!originalFile && !croppedFile && currentLogoUrl) { 
      // setCurrentLogoUrl(null); // Visually remove, backend handles actual removal via 'removeLogo' flag
    }
  };
  
  const handleActualFormSubmit: SubmitHandler<EditGroupFormInput> = async (dataFromRHF) => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);

    if (!editorDescription || editorDescription.trim() === '<p></p>' || editorDescription.trim() === '') {
      setSubmissionError('Bitte geben Sie eine Beschreibung ein.');
      setIsSubmitting(false);
      return;
    }

    const finalFormData = { ...dataFromRHF, description: editorDescription };

    try {
      await onSubmit(finalFormData, newLogo, newCroppedLogo);
      setSubmissionSuccess(true);
    } catch (error) {
      console.error('Group form submission error:', error);
      setSubmissionError(error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(handleActualFormSubmit)} sx={{ mt: 1 }}>
      {submissionError && <Alert severity="error" sx={{ mb: 2 }}>{submissionError}</Alert>}
      {submissionSuccess && <Alert severity="success" sx={{ mb: 2 }}>Gruppe erfolgreich aktualisiert!</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Allgemeine Informationen" />
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Gruppenname ist erforderlich', maxLength: { value: 100, message: 'Maximal 100 Zeichen'} }}
            render={({ field }) => (
              <TextField {...field} label="Gruppenname" fullWidth margin="normal" error={!!errors.name} helperText={errors.name?.message || `${nameValue?.length || 0}/100`} />
            )}
          />
          <Controller
            name="slug"
            control={control}
            rules={{ required: 'Slug ist erforderlich', pattern: { value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Ungültiger Slug (nur Kleinbuchstaben, Zahlen, Bindestriche)'} }}
            render={({ field }) => (
              <TextField {...field} label="Slug (für URL)" fullWidth margin="normal" error={!!errors.slug} helperText={errors.slug?.message || `${slugValue?.length || 0}/100`} />
            )}
          />
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
            Beschreibung <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <RichTextEditor value={editorDescription} onChange={setEditorDescription} placeholder="Beschreibung der Gruppe..." />
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Gruppenlogo" />
          <GroupLogoUpload 
            onImageSelect={handleLogoSelected} 
            initialImageUrl={currentLogoUrl}
          />
           <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Laden Sie ein neues Logo hoch, um das aktuelle zu ersetzen. Um das Logo zu entfernen, leeren Sie die Auswahl im Upload-Feld (dies signalisiert die Entfernungsabsicht).
          </Typography>
        </CardContent>
      </Card>
      
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Verantwortliche Personen" />
          {fields.map((item, index) => (
            <Grid container spacing={1} key={item.id} sx={{ mb: index === fields.length - 1 ? 0 : 1.5 , pt: index === 0 ? 0 : 1.5, borderTop: index === 0 ? 'none' : '1px dashed #eee' }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Controller
                  name={`responsiblePersons.${index}.firstName`}
                  control={control}
                  rules={{ required: 'Vorname benötigt' }}
                  render={({ field }) => (
                    <TextField {...field} label="Vorname" fullWidth size="small" error={!!errors.responsiblePersons?.[index]?.firstName} helperText={errors.responsiblePersons?.[index]?.firstName?.message} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                 <Controller
                  name={`responsiblePersons.${index}.lastName`}
                  control={control}
                  rules={{ required: 'Nachname benötigt' }}
                  render={({ field }) => (
                    <TextField {...field} label="Nachname" fullWidth size="small" error={!!errors.responsiblePersons?.[index]?.lastName} helperText={errors.responsiblePersons?.[index]?.lastName?.message} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Controller
                  name={`responsiblePersons.${index}.email`}
                  control={control}
                  rules={{ required: 'E-Mail benötigt', pattern: {value: /^\S+@\S+\.\S+$/, message: 'Ungültige E-Mail'} }}
                  render={({ field }) => (
                    <TextField {...field} label="E-Mail" type="email" fullWidth size="small" error={!!errors.responsiblePersons?.[index]?.email} helperText={errors.responsiblePersons?.[index]?.email?.message} />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-end', md: 'center' }}}>
                {fields.length > 0 ? ( // Allow removing even the last one if desired by backend logic (e.g. count 0)
                  <IconButton onClick={() => remove(index)} color="error" size="small" title="Diese Person entfernen">
                    <DeleteIcon />
                  </IconButton>
                ) : (
                  <Box sx={{width: 40, height: 40}} /> 
                )}
              </Grid>
            </Grid>
          ))}
          <Button
            type="button"
            onClick={() => append({ firstName: '', lastName: '', email: '' })}
            variant="outlined"
            startIcon={<PersonAddIcon />}
            sx={{ mt: 2 }}
          >
            Person hinzufügen
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Status" />
          <FormControl fullWidth error={!!errors.status} margin="normal">
            <InputLabel id="group-status-select-label">Status</InputLabel>
            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status ist erforderlich' }}
              render={({ field }) => (
                <Select {...field} labelId="group-status-select-label" label="Status">
                  <MenuItem value={GroupStatus.NEW}>Neu</MenuItem>
                  <MenuItem value={GroupStatus.ACTIVE}>Aktiv</MenuItem>
                  <MenuItem value={GroupStatus.ARCHIVED}>Archiviert</MenuItem>
                </Select>
              )}
            />
            {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
          </FormControl>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={isSubmitting}>Abbrechen</Button>
        <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </Button>
      </Box>
    </Box>
  );
}