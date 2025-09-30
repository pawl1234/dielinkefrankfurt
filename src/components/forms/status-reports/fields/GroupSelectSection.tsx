'use client';

import { Controller, Control, FormState, FieldValues, Path } from 'react-hook-form';
import { Select, MenuItem } from '@mui/material';
import FormSection from '../../shared/FormSection';
import { Group } from '@/types/api-types';

interface GroupSelectSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  groups: Group[];
  formState: FormState<TFormValues>;
  name?: Path<TFormValues>;
}

export function GroupSelectSection<TFormValues extends FieldValues>({
  control,
  groups,
  formState,
  name = "groupId" as Path<TFormValues>
}: GroupSelectSectionProps<TFormValues>) {
  const helpText = `Wählen Sie die Gruppe aus, für die Sie einen Bericht einreichen möchten.`;

  return (
    <FormSection title="Gruppe auswählen" helpTitle="Gruppe auswählen" helpText={helpText}>
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
            <MenuItem value="">
              Bitte wählen Sie eine Gruppe
            </MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        )}
      />
    </FormSection>
  );
}