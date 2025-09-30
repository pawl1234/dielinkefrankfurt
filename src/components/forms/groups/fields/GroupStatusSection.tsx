'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import FormSection from '../../shared/FormSection';
import { GroupStatus } from '@prisma/client';

interface GroupStatusSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  name?: Path<TFormValues>;
}

export function GroupStatusSection<TFormValues extends FieldValues>({
  control,
  formState,
  name = "status" as Path<TFormValues>
}: GroupStatusSectionProps<TFormValues>) {
  const helpText = `Wählen Sie den aktuellen Status der Gruppe aus. Dies beeinflusst die Sichtbarkeit und Verwaltung der Gruppe.`;

  return (
    <FormSection title="Status" helpTitle="Gruppenstatus" helpText={helpText}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
          <FormControl fullWidth error={!!error && formState.isSubmitted}>
            <InputLabel id="group-status-select-label">Status</InputLabel>
            <Select
              labelId="group-status-select-label"
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              name={fieldName}
              label="Status"
            >
              <MenuItem value={GroupStatus.NEW}>Neu</MenuItem>
              <MenuItem value={GroupStatus.ACTIVE}>Aktiv</MenuItem>
              <MenuItem value={GroupStatus.ARCHIVED}>Archiviert</MenuItem>
            </Select>
          </FormControl>
        )}
      />
    </FormSection>
  );
}