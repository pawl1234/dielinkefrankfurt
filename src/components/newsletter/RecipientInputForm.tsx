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
              Step 1: Add Newsletter Recipients
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Paste email addresses below, one per line. The system will validate and process these emails.
            </Typography>
          </Grid>

          {/* Email textarea */}
          <Grid size={{ xs: 12 }}>
            <Controller
              name="emailList"
              control={control}
              rules={{
                required: "Please enter at least one email address",
                validate: value => 
                  value.trim().length > 0 || "Email list cannot be empty"
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  fullWidth
                  minRows={10}
                  maxRows={20}
                  label="Email Addresses"
                  placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                  error={!!errors.emailList}
                  helperText={errors.emailList?.message || "Enter email addresses, one per line"}
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

          {/* Instructions and notes */}
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2">
                <strong>Instructions:</strong>
                <ul>
                  <li>Each email address should be on a separate line</li>
                  <li>Up to approximately 1,500 recipients are supported per newsletter</li>
                  <li>Emails will be validated in the next step</li>
                  <li>For privacy, emails are stored as secure hashes, not in plain text</li>
                </ul>
              </Typography>
            </Alert>
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
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : 'Next: Validate Emails'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default RecipientInputForm;