'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Select, MenuItem } from '@mui/material';
import FormSection from '../../shared/FormSection';

interface StatusSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
  name?: Path<TFormValues>;
}

export function StatusSection<TFormValues extends FieldValues>({
  control,
  formState,
  name = "status" as Path<TFormValues>
}: StatusSectionProps<TFormValues>) {
  const helpText = `Setzen Sie den Status des Berichts. Veröffentlichte Berichte werden öffentlich angezeigt.`;

  return (
    <FormSection title="Status" helpTitle="Berichtsstatus" helpText={helpText}>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
          <Select
            onChange={onChange}
            onBlur={onBlur}
            value={value}
            name={fieldName}
            fullWidth
            displayEmpty
            error={!!error && formState.isSubmitted}
          >
            <MenuItem value="NEW">Neu</MenuItem>
            <MenuItem value="ACTIVE">Aktiv (Veröffentlicht)</MenuItem>
            <MenuItem value="ARCHIVED">Archiviert</MenuItem>
            <MenuItem value="REJECTED">Abgelehnt</MenuItem>
          </Select>
        )}
      />
    </FormSection>
  );
}