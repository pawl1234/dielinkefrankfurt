import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Alert
} from '@mui/material';

/**
 * Props for the RecipientInputForm component
 */
interface RecipientInputFormProps {
  onSubmit: (emailText: string) => void;
  onBack?: () => void; // Optional for first step
  isSubmitting?: boolean;
}

/**
 * Form data type
 */
interface RecipientFormData {
  emailList: string;
}

/**
 * Component for inputting email recipients in the newsletter workflow
 */
const RecipientInputForm: React.FC<RecipientInputFormProps> = ({
  onSubmit,
  onBack,
  isSubmitting = false
}) => {
  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<RecipientFormData>({
    defaultValues: {
      emailList: ''
    }
  });

  // Handle form submission
  const submitHandler = (data: RecipientFormData) => {
    onSubmit(data.emailList);
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        border: '1px solid', 
        borderColor: 'grey.300', 
        borderRadius: 0 
      }}
    >
      <form onSubmit={handleSubmit(submitHandler)}>
        <Grid container spacing={3}>
          {/* Form header */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h5" component="h1" gutterBottom>
              Schritt 1: Newsletter Empfänger
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Füge eine Liste mit einer EMail-Adresse pro Zeile ein. Das System wird im nächsten Schritt die eingegebenen Email Adressen überprüfen, bevor der Newsletter verschickt wird.
            </Typography>
          </Grid>

          {/* Email textarea */}
          <Grid size={{ xs: 12 }}>
            <Controller
              name="emailList"
              control={control}
              rules={{
                required: "Mindestens eine Email-Adresse eingeben.",
                validate: value => 
                  value.trim().length > 0 || "Email List kann nicht leer sein. "
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  fullWidth
                  minRows={10}
                  maxRows={20}
                  label="Email Addresses"
                  placeholder=""
                  error={!!errors.emailList}
                  helperText={errors.emailList?.message || "Eine Email-Adresse pro Zeile!"}
                  disabled={isSubmitting}
                  InputProps={{
                    sx: { 
                      fontFamily: 'monospace',
                      fontSize: '0.9rem'
                    }
                  }}
                />
              )}
            />
          </Grid>

          {/* Action buttons */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={onBack}
                disabled={!onBack || isSubmitting}
              >
                Zurück
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Prüfen...' : 'Weiter'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default RecipientInputForm;