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
  LinearProgress,
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
  onComplete?: () => void; // Called when newsletter sending is completed
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
  totalChunks?: number;
  completedChunks?: number;
  isComplete?: boolean;
  finalFailedEmails?: string[];
}

/**
 * Multi-step form for newsletter sending workflow
 */
export default function NewsletterSendingForm({ newsletterHtml, subject, newsletterId, onComplete }: NewsletterSendingFormProps) {
  // Step management state
  const [currentStep, setCurrentStep] = useState<'input' | 'validation' | 'sending' | 'retrying' | 'complete'>('input');
  
  // Chunked sending state
  const [emailChunks, setEmailChunks] = useState<string[][]>([]);
  const [sendingProgress, setSendingProgress] = useState({
    completedChunks: 0,
    totalChunks: 0,
    totalSent: 0,
    totalFailed: 0
  });
  
  // Retry progress state
  const [retryProgress, setRetryProgress] = useState({
    stage: 0,
    totalStages: 0,
    processedEmails: 0,
    remainingFailedEmails: [] as string[]
  });
  
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
    setIsModalOpen(false);
    setCurrentStep('sending');

    try {
      // Step 1: Prepare newsletter for chunked sending
      const prepareResponse = await fetch('/api/admin/newsletter/send', {
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
            fromEmail: settings.fromEmail,
            fromName: settings.fromName,
            replyToEmail: settings.replyToEmail,
            batchSize: settings.batchSize,
            batchDelay: settings.batchDelay
          }
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || 'Fehler beim Vorbereiten des Newsletters');
      }

      const prepareData = await prepareResponse.json();
      
      if (!prepareData.success) {
        throw new Error(prepareData.message || 'Fehler beim Vorbereiten des Newsletters');
      }

      // Store email chunks and initialize progress
      const chunks = prepareData.emailChunks;
      setEmailChunks(chunks);
      setSendingProgress({
        completedChunks: 0,
        totalChunks: chunks.length,
        totalSent: 0,
        totalFailed: 0
      });

      // Step 2: Process each chunk
      await processEmailChunks(chunks, prepareData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten';
      console.log('=== SETTING ERROR (SEND PROCESS) ===');
      console.log('Error:', err);
      console.log('Error message:', errorMessage);
      console.log('====================================');
      setError(errorMessage);
      console.error('Sending error:', err);
      setCurrentStep('validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Process email chunks one by one
   */
  const processEmailChunks = async (chunks: string[][], prepareData: any) => {
    let totalSent = 0;
    let totalFailed = 0;
    let hasError = false;
    let lastChunkData: any = null;

    for (let i = 0; i < chunks.length; i++) {
      try {
        // Send current chunk
        const chunkResponse = await fetch('/api/admin/newsletter/send-chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newsletterId,
            html: prepareData.html,
            subject: prepareData.subject,
            emails: chunks[i],
            chunkIndex: i,
            totalChunks: chunks.length,
            settings: prepareData.settings
          }),
        });

        if (!chunkResponse.ok) {
          const errorData = await chunkResponse.json();
          throw new Error(errorData.error || `Fehler beim Senden von Chunk ${i + 1}`);
        }

        const chunkData = await chunkResponse.json();
        lastChunkData = chunkData;
        
        if (!chunkData.success) {
          throw new Error(chunkData.error || `Fehler beim Senden von Chunk ${i + 1}`);
        }

        // DEBUG: Log chunk results
        console.log(`=== CHUNK ${i + 1} RESULTS ===`);
        console.log('chunkData:', JSON.stringify(chunkData, null, 2));
        console.log('chunkData.sentCount:', chunkData.sentCount);
        console.log('chunkData.failedCount:', chunkData.failedCount);
        console.log('totalSent before:', totalSent);
        console.log('totalFailed before:', totalFailed);

        // Update progress
        totalSent += chunkData.sentCount;
        totalFailed += chunkData.failedCount;
        
        console.log('totalSent after:', totalSent);
        console.log('totalFailed after:', totalFailed);
        console.log('========================');
        
        setSendingProgress({
          completedChunks: i + 1,
          totalChunks: chunks.length,
          totalSent,
          totalFailed
        });

        // Use configured delay between chunks  
        if (i < chunks.length - 1) {
          const chunkDelay = prepareData.settings?.chunkDelay || 500;
          await new Promise(resolve => setTimeout(resolve, chunkDelay));
        }

      } catch (err) {
        console.error(`Error processing chunk ${i + 1}:`, err);
        hasError = true;
        totalFailed += chunks[i].length;
        
        setSendingProgress({
          completedChunks: i + 1,
          totalChunks: chunks.length,
          totalSent,
          totalFailed
        });
      }
    }

    // Check if retry process was triggered
    if (lastChunkData && lastChunkData.newsletterStatus === 'retrying') {
      setCurrentStep('retrying');
      // Add a small delay to ensure database update is completed
      await new Promise(resolve => setTimeout(resolve, 2000));
      await processRetryStages(prepareData);
    } else {
      // DEBUG: Log before setting final results
      console.log('=== SETTING FINAL RESULTS (NON-RETRY) ===');
      console.log('hasError:', hasError);
      console.log('totalSent:', totalSent);
      console.log('totalFailed:', totalFailed);
      console.log('success will be:', !hasError && totalFailed === 0);
      console.log('Clearing error state...');
      
      // Clear any previous error state
      setError('');
      
      const finalResult = {
        success: !hasError && totalFailed === 0,
        message: hasError ? 'Newsletter mit Fehlern versendet' : 'Newsletter erfolgreich versendet',
        sentCount: totalSent,
        failedCount: totalFailed,
        newsletterId: newsletterId,
        totalChunks: chunks.length,
        completedChunks: chunks.length,
        isComplete: true
      };
      
      console.log('Setting sendResult to:', JSON.stringify(finalResult, null, 2));
      console.log('==========================================');
      
      // Set final results
      setSendResult(finalResult);

      setCurrentStep('complete');
      
      // Call completion callback
      onComplete?.();
    }
  };

  /**
   * Process retry stages automatically
   */
  const processRetryStages = async (prepareData: any) => {
    let retryComplete = false;
    let finalFailedEmails: string[] = [];
    let hasRetryError = false;
    let totalRetrySuccesses = 0; // Track total successful emails during retry
    
    console.log('Starting retry process for newsletter:', newsletterId);
    
    while (!retryComplete) {
      try {
        console.log('Calling retry-chunk API for newsletter:', newsletterId);
        
        const retryResponse = await fetch('/api/admin/newsletter/retry-chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newsletterId,
            html: prepareData.html,
            subject: prepareData.subject,
            settings: prepareData.settings
          }),
        });

        console.log('Retry-chunk API response status:', retryResponse.status);

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json();
          console.error('Retry-chunk API error response:', errorData);
          throw new Error(errorData.error || 'Fehler beim Wiederholen');
        }

        const retryData = await retryResponse.json();
        
        // DEBUG: Log detailed retry response
        console.log('=== RETRY API RESPONSE ===');
        console.log('retryData:', JSON.stringify(retryData, null, 2));
        console.log('stage:', retryData.stage);
        console.log('totalStages:', retryData.totalStages);
        console.log('processedEmails:', retryData.processedEmails);
        console.log('remainingFailedEmails:', retryData.remainingFailedEmails);
        console.log('isComplete:', retryData.isComplete);
        if (retryData.finalFailedEmails) {
          console.log('finalFailedEmails:', retryData.finalFailedEmails);
        }
        console.log('========================');
        
        if (!retryData.success) {
          throw new Error(retryData.error || 'Fehler beim Wiederholen');
        }

        // Accumulate successful emails from this retry stage
        totalRetrySuccesses += retryData.processedEmails || 0;
        
        console.log('Accumulated retry successes so far:', totalRetrySuccesses);

        // Update retry progress
        setRetryProgress({
          stage: retryData.stage,
          totalStages: retryData.totalStages,
          processedEmails: retryData.processedEmails,
          remainingFailedEmails: retryData.remainingFailedEmails
        });

        if (retryData.isComplete) {
          retryComplete = true;
          finalFailedEmails = retryData.finalFailedEmails || [];
        } else {
          // Wait before next retry stage
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (err) {
        console.error('Error during retry process:', err);
        setError(`Fehler beim Wiederholen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
        retryComplete = true;
        hasRetryError = true;
      }
    }

    // Only set success results if there was no error during retry
    if (hasRetryError) {
      setCurrentStep('complete');
      return;
    }

    console.log('Setting final retry results:', {
      finalFailedEmails,
      finalFailedEmailsCount: finalFailedEmails.length,
      success: finalFailedEmails.length === 0
    });

    // Calculate total sent emails: Initial sent + Retry successes
    const actualSentCount = sendingProgress.totalSent + totalRetrySuccesses;

    // DEBUG: Log before setting retry results
    console.log('=== SETTING FINAL RESULTS (RETRY) ===');
    console.log('finalFailedEmails:', finalFailedEmails);
    console.log('finalFailedEmails.length:', finalFailedEmails.length);
    console.log('sendingProgress.totalSent:', sendingProgress.totalSent);
    console.log('sendingProgress.totalFailed:', sendingProgress.totalFailed);
    console.log('totalRetrySuccesses:', totalRetrySuccesses);
    console.log('actualSentCount (calculated):', actualSentCount);
    console.log('success will be:', finalFailedEmails.length === 0);
    console.log('Clearing error state...');
    
    // Clear any error state before setting success results
    setError('');

    const retryResult = {
      success: finalFailedEmails.length === 0,
      message: finalFailedEmails.length === 0 
        ? 'Newsletter erfolgreich versendet (nach Wiederholung)' 
        : 'Newsletter versendet mit einigen nicht zustellbaren E-Mails',
      sentCount: actualSentCount,
      failedCount: finalFailedEmails.length,
      newsletterId: newsletterId,
      totalChunks: sendingProgress.totalChunks,
      completedChunks: sendingProgress.totalChunks,
      isComplete: true,
      finalFailedEmails: finalFailedEmails
    };
    
    console.log('Setting sendResult to:', JSON.stringify(retryResult, null, 2));
    console.log('======================================');

    // Set final results with retry information
    setSendResult(retryResult);

    setCurrentStep('complete');
    
    // Call completion callback
    onComplete?.();
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
    setEmailChunks([]);
    setSendingProgress({
      completedChunks: 0,
      totalChunks: 0,
      totalSent: 0,
      totalFailed: 0
    });
    setRetryProgress({
      stage: 0,
      totalStages: 0,
      processedEmails: 0,
      remainingFailedEmails: []
    });
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
      
      case 'sending':
        return renderSendingStep();
      
      case 'retrying':
        return renderRetryingStep();
      
      case 'complete':
        return renderCompleteStep();
      
      default:
        return null;
    }
  };

  /**
   * Render sending progress step
   */
  const renderSendingStep = () => {
    const progress = sendingProgress.totalChunks > 0 
      ? (sendingProgress.completedChunks / sendingProgress.totalChunks) * 100 
      : 0;

    return (
      <Paper sx={{ p: 3, border: '1px solid', borderColor: 'grey.300', borderRadius: 0 }}>
        <Typography variant="h6" gutterBottom>
          Newsletter wird versendet...
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Fortschritt: {sendingProgress.completedChunks} / {sendingProgress.totalChunks} Pakete
            </Typography>
            <Typography variant="body2">
              {Math.round(progress)}%
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="success.main">
            ✓ Versendet: {sendingProgress.totalSent}
          </Typography>
          {sendingProgress.totalFailed > 0 && (
            <Typography variant="body2" color="error.main">
              ✗ Fehler: {sendingProgress.totalFailed}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
          <CircularProgress size={20} sx={{ mr: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Bitte schließen Sie dieses Fenster nicht. Der Versand läuft automatisch weiter.
          </Typography>
        </Box>
      </Paper>
    );
  };

  /**
   * Render retry progress step
   */
  const renderRetryingStep = () => {
    return (
      <Paper sx={{ p: 3, border: '1px solid', borderColor: 'grey.300', borderRadius: 0 }}>
        <Typography variant="h6" gutterBottom>
          Fehlgeschlagene E-Mails werden wiederholt...
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Wiederholungsstufe: {retryProgress.stage} / {retryProgress.totalStages}
            </Typography>
            <Typography variant="body2">
              Verbleibende E-Mails: {retryProgress.remainingFailedEmails.length}
            </Typography>
          </Box>
          
          <LinearProgress 
            variant={retryProgress.totalStages > 0 ? "determinate" : "indeterminate"}
            value={retryProgress.totalStages > 0 ? (retryProgress.stage / retryProgress.totalStages) * 100 : 0}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="success.main">
            ✓ Ursprünglich versendet: {sendingProgress.totalSent}
          </Typography>
          <Typography variant="body2" color="warning.main">
            ⟳ Wird wiederholt: {retryProgress.processedEmails}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
          <CircularProgress size={20} sx={{ mr: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Fehlgeschlagene E-Mails werden mit kleineren Paketen wiederholt...
          </Typography>
        </Box>
      </Paper>
    );
  };

  /**
   * Render completion step
   */
  const renderCompleteStep = () => {
    if (!sendResult) return null;

    // DEBUG: Log the complete state when rendering
    console.log('=== RENDER COMPLETE STEP DEBUG ===');
    console.log('sendResult:', JSON.stringify(sendResult, null, 2));
    console.log('error state:', error);
    console.log('sendResult.sentCount:', sendResult.sentCount);
    console.log('sendResult.failedCount:', sendResult.failedCount);
    console.log('sendResult.success:', sendResult.success);
    console.log('Will show success alert:', sendResult.sentCount > 0);
    console.log('Will show error alert:', sendResult.sentCount === 0);
    console.log('===================================');

    return (
      <Paper sx={{ p: 3, border: '1px solid', borderColor: 'grey.300', borderRadius: 0 }}>
        {/* Always show success message if any emails were sent */}
        {sendResult.sentCount > 0 && (
          <Alert 
            severity="success" 
            icon={<CheckCircleOutlineIcon fontSize="inherit" />}
            sx={{ mb: 3 }}
          >
            <AlertTitle>Newsletter erfolgreich versendet!</AlertTitle>
            Der Newsletter wurde an {sendResult.sentCount} Empfänger versendet.
          </Alert>
        )}

        {/* Show error alert only if no emails were sent at all */}
        {sendResult.sentCount === 0 && (
          <Alert 
            severity="error" 
            icon={<ErrorOutlineIcon fontSize="inherit" />}
            sx={{ mb: 3 }}
          >
            <AlertTitle>Beim Versenden ist ein Fehler aufgetreten</AlertTitle>
            {sendResult.error || 'Es gab ein Problem beim Versenden des Newsletters.'}
          </Alert>
        )}

        {/* Show failed email list if there are any */}
        {sendResult.finalFailedEmails && sendResult.finalFailedEmails.length > 0 && (
          <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
            <Typography variant="h6" color="error.main" gutterBottom>
              E-Mail konnte nicht zugestellt werden an:
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', mt: 1 }}>
              {sendResult.finalFailedEmails.map((email: string, index: number) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    mb: 0.5,
                    wordBreak: 'break-all'
                  }}
                >
                  • {email}
                </Typography>
              ))}
            </Box>
          </Box>
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
          {(() => {
            // DEBUG: Log when top-level error is displayed
            console.log('=== TOP LEVEL ERROR DISPLAY ===');
            console.log('error:', error);
            console.log('currentStep:', currentStep);
            console.log('sendResult:', sendResult);
            console.log('===============================');
            return error;
          })()}
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