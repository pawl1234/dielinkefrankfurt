'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  Alert,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { GroupFormInput } from '../groups/GroupRequestForm';

interface ResponsiblePersonFieldsProps {
  form: UseFormReturn<GroupFormInput>;
}

const ResponsiblePersonFields = ({ form }: ResponsiblePersonFieldsProps) => {
  const { control, register, formState: { errors } } = form;
  
  // Use useFieldArray to manage the array of responsible persons
  const { fields, append, remove } = useFieldArray({
    control,
    name: "responsiblePersons"
  });

  const handleAddPerson = () => {
    append({ firstName: '', lastName: '', email: '' });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" component="h3" gutterBottom>
        Verantwortliche Personen
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Bitte geben Sie die Kontaktdaten für mindestens eine verantwortliche Person an.
        Diese Person(en) werden bei Statusänderungen per E-Mail benachrichtigt.
      </Typography>

      {fields.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Bitte fügen Sie mindestens eine verantwortliche Person hinzu.
        </Alert>
      )}

      {fields.map((field, index) => (
        <Card 
          key={field.id} 
          variant="outlined" 
          sx={{ 
            mb: 2,
            borderLeft: 2,
            borderColor: 'primary.light'
          }}
        >
          <CardContent>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="subtitle2">
                Person {index + 1}
              </Typography>
              {fields.length > 1 && (
                <IconButton 
                  color="error" 
                  onClick={() => remove(index)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
              gap: 2,
              mb: 2 
            }}>
              <TextField
                label="Vorname"
                {...register(`responsiblePersons.${index}.firstName` as const, {
                  required: 'Vorname ist erforderlich',
                  minLength: { value: 2, message: 'Mindestens 2 Zeichen' },
                  maxLength: { value: 50, message: 'Maximal 50 Zeichen' }
                })}
                error={!!errors.responsiblePersons?.[index]?.firstName}
                helperText={errors.responsiblePersons?.[index]?.firstName?.message}
                fullWidth
                size="small"
              />
              <TextField
                label="Nachname"
                {...register(`responsiblePersons.${index}.lastName` as const, {
                  required: 'Nachname ist erforderlich',
                  minLength: { value: 2, message: 'Mindestens 2 Zeichen' },
                  maxLength: { value: 50, message: 'Maximal 50 Zeichen' }
                })}
                error={!!errors.responsiblePersons?.[index]?.lastName}
                helperText={errors.responsiblePersons?.[index]?.lastName?.message}
                fullWidth
                size="small"
              />
            </Box>
            <TextField
              label="E-Mail"
              type="email"
              {...register(`responsiblePersons.${index}.email` as const, {
                required: 'E-Mail ist erforderlich',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
                }
              })}
              error={!!errors.responsiblePersons?.[index]?.email}
              helperText={errors.responsiblePersons?.[index]?.email?.message}
              fullWidth
              size="small"
            />
          </CardContent>
        </Card>
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={handleAddPerson}
        variant="outlined"
        color="primary"
        sx={{ mt: 1 }}
      >
        Weitere Person hinzufügen
      </Button>
    </Box>
  );
};

export default ResponsiblePersonFields;