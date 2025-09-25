'use client';

import { Control } from 'react-hook-form';
import { Box, Typography, Checkbox, FormControlLabel, Collapse, Paper, Button } from '@mui/material';
import FormSection from '../../shared/FormSection';
import ValidatedTextField from '../../shared/ValidatedTextField';
import FieldError from '../../shared/FieldError';
import RichTextEditor from '../../../editor/RichTextEditor';
import { CustomValidationEntry } from '../../shared/FormBase';

interface DescriptionSectionProps {
  control: Control<any>;
  titleRef: React.RefObject<HTMLDivElement>;
  mainTextRef: React.RefObject<HTMLDivElement>;
  helpText: React.ReactNode;
  mainTextEditorContent: string;
  handleMainTextChange: (value: string) => void;
  isFeatured: boolean;
  setIsFeatured: (featured: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  customValidations: CustomValidationEntry[];
}

export default function DescriptionSection({
  control,
  titleRef,
  mainTextRef,
  helpText,
  mainTextEditorContent,
  handleMainTextChange,
  isFeatured,
  setIsFeatured,
  helpOpen,
  setHelpOpen,
  customValidations
}: DescriptionSectionProps) {
  return (
    <FormSection title="Beschreibung der Veranstaltung" helpTitle="Über die Veranstaltung" helpText={helpText}>
      <Box sx={{ mb: 3 }} ref={titleRef}>
        <ValidatedTextField
          name="title"
          label="Titel"
          fullWidth
          margin="normal"
          placeholder="Titel der Veranstaltung..."
          showCharacterCount
          helperText="100"
        />
      </Box>

      <Box sx={{ mb: 3 }} ref={mainTextRef}>
        <Typography variant="subtitle1" component="label" sx={{ fontWeight: 600 }}>
          Beschreibung <Box component="span" sx={{ color: "primary.main" }}>*</Box>
        </Typography>
        <Typography variant="body2" display="block" gutterBottom sx={{ mb: 2 }}>
          Ausführliche und motivierende Beschreibung des Events. Text kann hier formatiert und Emojis verwendet werden.
        </Typography>
        <RichTextEditor
          value={mainTextEditorContent}
          onChange={handleMainTextChange}
          maxLength={10000}
          placeholder="Ausführliche Beschreibung..."
        />
        <FieldError name="mainText" mode="block" customValidations={customValidations} />
      </Box>

      <Box sx={{ mt: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              color="primary"
            />
          }
          label="Als Featured Termin markieren (wird im Newsletter hervorgehoben)"
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