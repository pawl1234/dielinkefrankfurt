import React from 'react';
import {
  Paper,
  Grid,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

/**
 * Props for the ValidationResultsDisplay component
 */
interface ValidationResultsDisplayProps {
  validationResults: {
    totalValid: number;
    newRecipients: number;
    existingRecipients: number;
    invalidEmails: string[];
  };
  onBack: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
}

/**
 * Component to display email validation results in the newsletter workflow
 */
const ValidationResultsDisplay: React.FC<ValidationResultsDisplayProps> = ({
  validationResults,
  onBack,
  onNext,
  isSubmitting = false
}) => {
  const { totalValid, newRecipients, existingRecipients, invalidEmails } = validationResults;
  const hasInvalidEmails = invalidEmails.length > 0;
  const totalInvalid = invalidEmails.length;
  const totalRecipients = totalValid + totalInvalid;

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
      <Grid container spacing={3}>
        {/* Header */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h5" component="h1" gutterBottom>
             Schritt 2: Empfänger überprüfen
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Überprüfe die gesammelten Email-Adressen auf offensichtliche Fehler.
          </Typography>
        </Grid>

        {/* Summary statistics */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Validation Summary
            </Typography>
            <Grid container spacing={2}>
              {/* Valid emails */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%', borderRadius: 0 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        Gültige Email Adressen
                      </Typography>
                    </Box>
                    <Typography variant="h4" component="div" color="success.main">
                      {totalValid}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round((totalValid / totalRecipients) * 100)}% von allen
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* New recipients */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%', borderRadius: 0 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AddCircleOutlineIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        Neue Empfänger
                      </Typography>
                    </Box>
                    <Typography variant="h4" component="div" color="primary.main">
                      {newRecipients}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round((newRecipients / totalValid) * 100)}% of valid emails
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Existing recipients */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%', borderRadius: 0 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonOutlineIcon color="info" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        Existierende Empfänger
                      </Typography>
                    </Box>
                    <Typography variant="h4" component="div" color="info.main">
                      {existingRecipients}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round((existingRecipients / totalValid) * 100)}% of valid emails
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Invalid emails */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ height: '100%', borderRadius: 0 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ErrorOutlineIcon color={hasInvalidEmails ? "error" : "disabled"} sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" color="text.secondary">
                        Ungültige Email Adressen
                      </Typography>
                    </Box>
                    <Typography 
                      variant="h4" 
                      component="div" 
                      color={hasInvalidEmails ? "error.main" : "text.disabled"}
                    >
                      {totalInvalid}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {hasInvalidEmails 
                        ? `${Math.round((totalInvalid / totalRecipients) * 100)}% von allen` 
                        : "Alle Email Adressen sind gültig"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Invalid emails list - only shown if there are invalid emails */}
        {hasInvalidEmails && (
          <Grid size={{ xs: 12 }}>
            <Alert 
              severity="warning" 
              sx={{ mb: 2 }}
              action={
                <Chip 
                  label={`${invalidEmails.length} invalid`} 
                  color="warning" 
                  size="small" 
                  variant="outlined"
                />
              }
            >
              <Typography variant="subtitle1" component="div" sx={{ mb: 1 }}>
                Die folgenden Email Adressen sind nicht gültig und werden übersprungen:
              </Typography>
              <List dense sx={{ bgcolor: 'background.paper', maxHeight: '200px', overflow: 'auto' }}>
                {invalidEmails.map((email, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText 
                        primary={email} 
                        primaryTypographyProps={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.9rem'
                        }}
                      />
                    </ListItem>
                    {index < invalidEmails.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Alert>
          </Grid>
        )}

        {/* Additional information 
        <Grid size={{ xs: 12 }}>
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2">
              <strong>What happens next:</strong>
              <ul>
                <li>You'll be able to customize the newsletter content and settings</li>
                <li>All {totalValid} valid recipients will receive the newsletter</li>
                <li>For privacy, emails are stored as secure hashes, not in plain text</li>
                <li>Batch sending will be used to avoid email service limits</li>
              </ul>
            </Typography>
          </Alert>
        </Grid>*/}

        {/* Action buttons */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Zurück
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onNext}
              disabled={isSubmitting || totalValid === 0}
            >
              {isSubmitting ? 'Bearbeite...' : 'Weiter'}
            </Button>
          </Box>
          {totalValid === 0 && (
            <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: 'right' }}>
              Mindestens ein gültiger Empfänger muss angegeben werden!
            </Typography>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ValidationResultsDisplay;