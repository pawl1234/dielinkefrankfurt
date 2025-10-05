'use client';

import { Control, FormState, FieldValues, Path, useFieldArray, Controller } from 'react-hook-form';
import { TextField, Button, IconButton, Grid } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import FormSection from '../../shared/FormSection';

interface ResponsiblePersonsSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  fieldName?: Path<TFormValues>;
}

export function ResponsiblePersonsSection<TFormValues extends FieldValues>({
  control,
  formState,
  fieldName = "responsiblePersons" as Path<TFormValues>
}: ResponsiblePersonsSectionProps<TFormValues>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName as any
  });

  const helpText = `Bitte geben Sie Kontaktdaten für die verantwortlichen Personen an:
        - Mindestens eine Person ist erforderlich.
        - Diese Personen werden bei Änderungen des Gruppenstatus benachrichtigt.
        - Die Kontaktdaten sind nicht öffentlich sichtbar.`

  return (
    <FormSection
      title="Verantwortliche Personen"
      helpTitle="Kontaktpersonen"
      helpText={helpText}
    >
      {fields.map((item, index) => {
        // Build field paths for each person
        const firstNamePath = `${fieldName}.${index}.firstName` as Path<TFormValues>;
        const lastNamePath = `${fieldName}.${index}.lastName` as Path<TFormValues>;
        const emailPath = `${fieldName}.${index}.email` as Path<TFormValues>;

        return (
          <Grid
            container
            spacing={1}
            key={item.id}
            sx={{
              mb: index === fields.length - 1 ? 0 : 1.5,
              pt: index === 0 ? 0 : 1.5,
              borderTop: index === 0 ? 'none' : '1px dashed #eee'
            }}
          >
            <Grid size={{ xs: 12, md: 3 }}>
              <Controller
                control={control}
                name={firstNamePath}
                render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
                  <TextField
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    name={name}
                    label="Vorname"
                    fullWidth
                    size="small"
                    error={!!error && formState.isSubmitted}
                    helperText={formState.isSubmitted && error ? error.message : undefined}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Controller
                control={control}
                name={lastNamePath}
                render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
                  <TextField
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    name={name}
                    label="Nachname"
                    fullWidth
                    size="small"
                    error={!!error && formState.isSubmitted}
                    helperText={formState.isSubmitted && error ? error.message : undefined}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Controller
                control={control}
                name={emailPath}
                render={({ field: { onChange, onBlur, value, name }, fieldState: { error } }) => (
                  <TextField
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    name={name}
                    label="E-Mail"
                    type="email"
                    fullWidth
                    size="small"
                    error={!!error && formState.isSubmitted}
                    helperText={formState.isSubmitted && error ? error.message : undefined}
                  />
                )}
              />
            </Grid>
            <Grid
              size={{ xs: 12, md: 2 }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'flex-end', md: 'center' }
              }}
            >
              {fields.length > 1 && (
                <IconButton
                  onClick={() => remove(index)}
                  color="error"
                  size="small"
                  title="Diese Person entfernen"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </Grid>
        );
      })}

      <Button
        type="button"
        onClick={() => append({ firstName: '', lastName: '', email: '' } as any)}
        variant="outlined"
        startIcon={<PersonAddIcon />}
        sx={{ mt: 2 }}
      >
        Person hinzufügen
      </Button>
    </FormSection>
  );
}