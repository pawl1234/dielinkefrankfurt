// src/components/EditGroupForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { SubmitHandler, Controller, useFieldArray } from 'react-hook-form';
import {
  Box, Typography, TextField, Button, Card, CardContent, Alert, MenuItem,
  FormControl, InputLabel, Select, FormHelperText, Grid, IconButton
} from '@mui/material';
import RichTextEditor from '../../editor/RichTextEditor';
import GroupLogoUpload from '../../upload/GroupLogoUpload';
import SectionHeader from '../../layout/SectionHeader';
import { GroupStatus, ResponsiblePerson as PrismaResponsiblePerson } from '@prisma/client';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { useZodForm } from '@/hooks/useZodForm';
import { groupEditFormSchema, GroupEditFormData } from '@/lib/validation/group';
import ValidatedTextField from '../shared/ValidatedTextField';
import ValidatedController from '../shared/ValidatedController';
import FieldError from '../shared/FieldError';

// Use the Zod-derived type for form data
export type EditGroupFormInput = GroupEditFormData;

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
  const [editorDescription, setEditorDescription] = useState(group.description || '');
  const [newLogo, setNewLogo] = useState<File | Blob | null>(null);
  const [newCroppedLogo, setNewCroppedLogo] = useState<File | Blob | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(group.logoUrl || null);

  // Custom validation for rich text editor
  const customValidations = [
    {
      field: 'description',
      isValid: !!editorDescription &&
               editorDescription.trim() !== '' &&
               editorDescription.trim() !== '<p></p>' &&
               editorDescription.length >= 50,
      message: editorDescription.length > 0 && editorDescription.length < 50
        ? `Beschreibung muss mindestens 50 Zeichen lang sein (aktuell: ${editorDescription.length})`
        : 'Beschreibung ist erforderlich und muss mindestens 50 Zeichen haben.'
    }
  ];

  const form = useZodForm({
    schema: groupEditFormSchema,
    defaultValues: {
      name: group.name,
      slug: group.slug,
      description: editorDescription, // This will be updated via custom validation
      status: group.status,
      responsiblePersons: group.responsiblePersons?.map(rp => ({
          firstName: rp.firstName,
          lastName: rp.lastName,
          email: rp.email
      })) || [{ firstName: '', lastName: '', email: '' }]
    },
    onSubmit: async (data) => {
      // Update data with editor description
      const finalFormData = { ...data, description: editorDescription };
      await onSubmit(finalFormData, newLogo, newCroppedLogo);
    },
    customValidations
  });

  const { control, handleSubmit, watch, reset, isSubmitting, submissionError, submissionSuccess } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "responsiblePersons"
  });
  
  useEffect(() => {
    // Reset form when 'group' prop changes
    reset({
        name: group.name,
        slug: group.slug,
        description: group.description || '',
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
  }, [group, reset]);

  const nameValue = watch('name');
  const slugValue = watch('slug');

  const handleLogoSelected = (originalFile: File | Blob | null, croppedFile: File | Blob | null) => {
    setNewLogo(originalFile);
    setNewCroppedLogo(croppedFile);
    if (!originalFile && !croppedFile && currentLogoUrl) {
      // setCurrentLogoUrl(null); // Visually remove, backend handles actual removal via 'removeLogo' flag
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit((data) => form.onSubmit(data))} sx={{ mt: 1 }}>
      {submissionError && <Alert severity="error" sx={{ mb: 2 }}>{submissionError}</Alert>}
      {submissionSuccess && <Alert severity="success" sx={{ mb: 2 }}>Gruppe erfolgreich aktualisiert!</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <SectionHeader title="Allgemeine Informationen" />
          <ValidatedTextField
            name="name"
            label="Gruppenname"
            fullWidth
            margin="normal"
            showCharacterCount
            helperText={`${nameValue?.length || 0}/100`}
          />
          <ValidatedTextField
            name="slug"
            label="Slug (für URL)"
            fullWidth
            margin="normal"
            helperText={`${slugValue?.length || 0}/100`}
          />
          <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600, display: 'block', mt: 2, mb: 1 }}>
            Beschreibung <Box component="span" sx={{ color: 'error.main' }}>*</Box>
          </Typography>
          <RichTextEditor value={editorDescription} onChange={setEditorDescription} placeholder="Beschreibung der Gruppe..." />
          <FieldError name="description" mode="block" customValidations={customValidations} />
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
                <ValidatedTextField
                  name={`responsiblePersons.${index}.firstName` as any}
                  label="Vorname"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <ValidatedTextField
                  name={`responsiblePersons.${index}.lastName` as any}
                  label="Nachname"
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <ValidatedTextField
                  name={`responsiblePersons.${index}.email` as any}
                  label="E-Mail"
                  type="email"
                  fullWidth
                  size="small"
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
          <ValidatedController
            name="status"
            useFormControl
            formControlProps={{ fullWidth: true, margin: "normal" }}
            render={({ field, hasError }) => (
              <>
                <InputLabel id="group-status-select-label">Status</InputLabel>
                <Select {...field} labelId="group-status-select-label" label="Status" error={hasError}>
                  <MenuItem value={GroupStatus.NEW}>Neu</MenuItem>
                  <MenuItem value={GroupStatus.ACTIVE}>Aktiv</MenuItem>
                  <MenuItem value={GroupStatus.ARCHIVED}>Archiviert</MenuItem>
                </Select>
              </>
            )}
          />
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