'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Alert, 
  AlertTitle, 
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import RecipientInputForm from './RecipientInputForm';
import ValidationResultsDisplay from './ValidationResultsDisplay';
import SendConfirmationModal from './SendConfirmationModal';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Props for the NewsletterSendingForm component
 */
interface NewsletterSendingFormProps {
  newsletterHtml: string; // The generated newsletter HTML
  subject: string; // Email subject
  newsletterId?: string; // The newsletter ID for updating existing draft
}

/**
 * Interface for validation results
 */
interface ValidationResult {
  totalValid: number;
  newRecipients: number;
  existingRecipients: number;
  invalidEmails: string[];
}

/**
 * Interface for send result
 */
interface SendResult {
  success: boolean;
  message?: string;
  error?: string;
  sentCount: number;
  failedCount: number;
  newsletterId?: string;
}

/**
 * Multi-step form for newsletter sending workflow
 */
export default function NewsletterSendingForm({ newsletterHtml, subject, newsletterId }: NewsletterSendingFormProps) {
  // Step management state
  const [currentStep, setCurrentStep] = useState<'input' | 'validation' | 'sending' | 'complete'>('input');
  
  // Form data state
  const [emailText, setEmailText] = useState('');
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  
  // Fetch newsletter settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/newsletter/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching newsletter settings:', error);
      }
    };
    
    fetchSettings();
  }, []);

  /**
   * Step 1: Handle recipient input submission
   */
  const handleRecipientSubmit = async (emailTextInput: string) => {
    setEmailText(emailTextInput);
    setIsSubmitting(true);
    setError('');

    try {
      // Call API to validate emails
      const response = await fetch('/api/admin/newsletter/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailText: emailTextInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler bei der Validierung der E-Mail-Adressen');
      }

      const data = await response.json();
      
      // Format validation results
      setValidationResults({
        totalValid: data.valid,
        newRecipients: data.new,
        existingRecipients: data.existing,
        invalidEmails: data.invalidEmails || []
      });

      // Move to next step
      setCurrentStep('validation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
      console.error('Validation error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Step 2: Handle validation review
   */
  const handleValidationBack = () => {
    setCurrentStep('input');
  };

  const handleValidationNext = () => {
    if (!validationResults || validationResults.totalValid === 0) {
      setError('Es wurden keine gültigen E-Mail-Adressen gefunden');
      return;
    }

    // Open confirmation modal
    setIsModalOpen(true);
  };

  /**
   * Step 3: Handle confirmation and sending
   */
  const handleCancelSend = () => {
    setIsModalOpen(false);
  };

  const handleConfirmSend = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Call API to send newsletter
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newsletterId,
          html: newsletterHtml,
          subject,
          emailText,
          settings: {
            // Include email sending settings
            fromEmail: settings.fromEmail,
            fromName: settings.fromName,
            replyToEmail: settings.replyToEmail,
            batchSize: settings.batchSize,
            batchDelay: settings.batchDelay
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Versenden des Newsletters');
      }

      const data = await response.json();
      
      // Set send result
      setSendResult({
        success: data.success,
        message: data.message,
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
        newsletterId: newsletterId
      });

      // Close modal and move to complete step
      setIsModalOpen(false);
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
      console.error('Sending error:', err);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset the form to start over
   */
  const handleReset = () => {
    setCurrentStep('input');
    setEmailText('');
    setValidationResults(null);
    setIsModalOpen(false);
    setError('');
    setSendResult(null);
  };

  /**
   * View the sent newsletter
   */
  const handleViewNewsletter = () => {
    if (sendResult?.newsletterId) {
      window.open(`/newsletter/${sendResult.newsletterId}`, '_blank');
    }
  };

  /**
   * Render stepper
   */
  const renderStepper = () => {
    const steps = ['E-Mail-Adressen eingeben', 'Validierung prüfen', 'Newsletter versenden'];
    
    let activeStep = 0;
    if (currentStep === 'validation') activeStep = 1;
    if (currentStep === 'sending' || currentStep === 'complete') activeStep = 2;
    
    return (
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    );
  };

  /**
   * Render appropriate component based on current step
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'input':
        return (
          <RecipientInputForm
            onSubmit={handleRecipientSubmit}
            isSubmitting={isSubmitting}
          />
        );
      
      case 'validation':
        return validationResults ? (
          <ValidationResultsDisplay
            validationResults={validationResults}
            onBack={handleValidationBack}
            onNext={handleValidationNext}
            isSubmitting={isSubmitting}
          />
        ) : null;
      
      case 'complete':
        return renderCompleteStep();
      
      default:
        return null;
    }
  };

  /**
   * Render completion step
   */
  const renderCompleteStep = () => {
    if (!sendResult) return null;

    return (
      <Paper sx={{ p: 3, border: '1px solid', borderColor: 'grey.300', borderRadius: 0 }}>
        {sendResult.success ? (
          <Alert 
            severity="success" 
            icon={<CheckCircleOutlineIcon fontSize="inherit" />}
            sx={{ mb: 3 }}
          >
            <AlertTitle>Newsletter erfolgreich versendet!</AlertTitle>
            Der Newsletter wurde an {sendResult.sentCount} Empfänger versendet.
            {sendResult.failedCount > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Bei {sendResult.failedCount} Empfängern ist ein Fehler aufgetreten.
              </Typography>
            )}
          </Alert>
        ) : (
          <Alert 
            severity="error" 
            icon={<ErrorOutlineIcon fontSize="inherit" />}
            sx={{ mb: 3 }}
          >
            <AlertTitle>Beim Versenden ist ein Fehler aufgetreten</AlertTitle>
            {sendResult.error || 'Es gab ein Problem beim Versenden des Newsletters.'}
            {sendResult.sentCount > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Der Newsletter wurde an {sendResult.sentCount} von {(sendResult.sentCount + sendResult.failedCount)} Empfängern versendet.
              </Typography>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={handleReset}
          >
            Neuen Newsletter versenden
          </Button>
          
          {sendResult.newsletterId && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleViewNewsletter}
            >
              Newsletter ansehen
            </Button>
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Progress stepper */}
      {renderStepper()}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Current step component */}
      {renderCurrentStep()}
      
      {/* Confirmation modal */}
      <SendConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCancelSend}
        onConfirm={handleConfirmSend}
        recipientCount={validationResults?.totalValid || 0}
        isSubmitting={isSubmitting}
        subject={subject}
        settings={{
          fromName: settings.fromName,
          fromEmail: settings.fromEmail,
          replyToEmail: settings.replyToEmail
        }}
      />
    </Box>
  );
}