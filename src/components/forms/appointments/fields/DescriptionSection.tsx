'use client';

import { useState } from 'react';
import { Controller, Control, FormState, FieldValues, Path, useWatch } from 'react-hook-form';
import { Box, Typography, TextField, Checkbox, FormControlLabel, Collapse, Paper, Button } from '@mui/material';
import FormSection from '../../shared/FormSection';
import RichTextEditor from '../../../editor/RichTextEditor';

interface DescriptionSectionProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  formState: FormState<TFormValues>;
}

export function DescriptionSection<TFormValues extends FieldValues>({
  control,
  formState
}: DescriptionSectionProps<TFormValues>) {
  const [helpOpen, setHelpOpen] = useState(false);

  const helpText = `In diesem Abschnitt können Sie Ihre Veranstaltung beschreiben:
        - Der Titel der Veranstaltung wird sowohl in der Mittwochsmail als auch auf der Webseite angezeigt. Er sollte sehr kurz und prägnant sein.
        - Die Beschreibung ermöglicht eine detaillierte Beschreibung mit bis zu 5000 Zeichen. Diese Beschreibung wird angezeigt, wenn jemand die Termindetails öffnet.
        - Ein Featured Termin erscheint hervorgehoben in der Mittwochsmail. Dafür benötigt es immer ein Cover-Bild. Dieses können sie im nächsten Schritt hochladen.
  `;

  return (
    <FormSection title="Beschreibung der Veranstaltung" helpTitle="Über die Veranstaltung" helpText={helpText}>
      <Box sx={{ mb: 3 }}>
        <Controller
          control={control}
          name={"title" as Path<TFormValues>}
          render={({ field: { onChange, onBlur, value, name: fieldName }, fieldState: { error } }) => (
            <TextField
              onChange={onChange}
              onBlur={onBlur}
              value={value || ''}
              name={fieldName}
              label="Titel"
              fullWidth
              placeholder="Titel der Veranstaltung..."
              error={!!error && formState.isSubmitted}
              helperText={formState.isSubmitted && error ? error.message : 'Max. 100 Zeichen'}
              inputProps={{ maxLength: 100 }}
            />
          )}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
          Beschreibung <Box component="span" sx={{ color: "primary.main" }}>*</Box>
        </Typography>
        <Typography variant="body2" display="block" gutterBottom sx={{ mb: 2 }}>
          Ausführliche und motivierende Beschreibung des Events. Text kann hier formatiert und Emojis verwendet werden.
        </Typography>
        <Controller
          control={control}
          name={"mainText" as Path<TFormValues>}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <RichTextEditor
                value={value || ''}
                onChange={onChange}
                maxLength={10000}
                placeholder="Ausführliche Beschreibung..."
              />
              {formState.isSubmitted && error && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {error.message}
                </Typography>
              )}
            </>
          )}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <Controller
          control={control}
          name={"featured" as Path<TFormValues>}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  color="primary"
                />
              }
              label="Als Featured Termin markieren (wird im Newsletter hervorgehoben)"
            />
          )}
        />
        <Button
          size="small"
          onClick={() => setHelpOpen(!helpOpen)}
          sx={{ ml: 1, textTransform: 'none' }}
        >
          {helpOpen ? 'Weniger Info' : 'Mehr Info'}
        </Button>
        <Collapse in={helpOpen}>
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Featured Termine
            </Typography>
            <Typography variant="body2">
              Featured Termine werden im Newsletter besonders hervorgehoben. Sie erscheinen mit einem größeren Bild und mehr Platz.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Wenn Sie diese Option aktivieren, können Sie ein Titelbild hochladen, welches im Newsletter verwendet wird. Ein Cover-Bild ist für Featured Termine erforderlich.
            </Typography>
          </Paper>
        </Collapse>
      </Box>
    </FormSection>
  );
}