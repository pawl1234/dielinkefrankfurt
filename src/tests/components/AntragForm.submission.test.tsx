import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';
import AntragForm from '../../components/forms/antraege/AntragForm';

// Mock FormBase to capture submission calls
const mockFormBaseOnSubmit = jest.fn();
const mockFormBaseOnReset = jest.fn();
let mockIsSubmitting = false;
let mockSubmissionError: string | null = null;
let mockSubmissionSuccess = false;

jest.mock('../../components/forms/shared/FormBase', () => {
  return function MockFormBase({ 
    onSubmit,
    onReset,
    files,
    successTitle,
    successMessage,
    children 
  }: {
    onSubmit: (data: any) => void;
    onReset?: () => void;
    files?: (File | Blob)[];
    successTitle?: string;
    successMessage?: React.ReactNode;
    children: React.ReactNode;
  }) {
    // Store callbacks for testing
    mockFormBaseOnSubmit.mockImplementation(onSubmit);
    if (onReset) mockFormBaseOnReset.mockImplementation(onReset);
    
    return React.createElement('div', { 'data-testid': 'form-base' },
      // Show submission state
      React.createElement('div', { 'data-testid': 'is-submitting' }, mockIsSubmitting ? 'true' : 'false'),
      React.createElement('div', { 'data-testid': 'files-count' }, files?.length || 0),
      
      // Show error state
      mockSubmissionError && React.createElement('div', { 
        'data-testid': 'submission-error' 
      }, mockSubmissionError),
      
      // Show success state
      mockSubmissionSuccess && React.createElement('div', { 'data-testid': 'submission-success' },
        React.createElement('h2', {}, successTitle),
        successMessage
      ),
      
      // Form content
      !mockSubmissionSuccess && children,
      
      // Submit button
      !mockSubmissionSuccess && React.createElement('button', {
        'data-testid': 'submit-button',
        onClick: async () => {
          const mockData = {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            title: 'Test Title',
            summary: 'Test summary with enough characters',
            purposes: { zuschuss: { enabled: true, amount: 500 } }
          };
          
          mockIsSubmitting = true;
          try {
            await onSubmit(mockData);
            mockSubmissionSuccess = true;
            mockSubmissionError = null;
          } catch (error) {
            mockSubmissionError = error instanceof Error ? error.message : 'Unknown error';
            mockSubmissionSuccess = false;
          } finally {
            mockIsSubmitting = false;
          }
        }
      }, 'Submit'),
      
      // Reset button (shown in success state)
      mockSubmissionSuccess && React.createElement('button', {
        'data-testid': 'reset-button',
        onClick: () => {
          mockSubmissionSuccess = false;
          mockSubmissionError = null;
          onReset?.();
        }
      }, 'Reset')
    );
  };
});

// Mock FileUpload
const mockOnFilesSelect = jest.fn();
jest.mock('../../components/upload/FileUpload', () => {
  return function MockFileUpload({ onFilesSelect }: { onFilesSelect?: (files: (File | Blob)[]) => void }) {
    mockOnFilesSelect.mockImplementation(onFilesSelect || jest.fn());
    
    return React.createElement('div', { 'data-testid': 'file-upload' },
      React.createElement('button', {
        'data-testid': 'select-files',
        onClick: () => {
          const mockFiles = [
            new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
            new File(['image content'], 'image.jpg', { type: 'image/jpeg' })
          ];
          onFilesSelect?.(mockFiles);
        }
      }, 'Select Files')
    );
  };
});

// Mock FormSection
jest.mock('../../components/forms/shared/FormSection', () => {
  return function MockFormSection({ children }: { children: React.ReactNode }) {
    return React.createElement('div', { 'data-testid': 'form-section' }, children);
  };
});

// Mock ReCaptcha
const mockOnRecaptchaVerify = jest.fn();
jest.mock('../../components/shared/ReCaptcha', () => {
  return function MockReCaptcha({ onVerify }: { onVerify: (token: string | null) => void }) {
    mockOnRecaptchaVerify.mockImplementation(onVerify);
    
    return React.createElement('div', { 'data-testid': 'recaptcha' },
      React.createElement('button', {
        'data-testid': 'verify-recaptcha',
        onClick: () => {
          onVerify('mock-recaptcha-token');
        }
      }, 'Verify reCAPTCHA')
    );
  };
});

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (fn: any) => fn,
    formState: { errors: {} },
    reset: jest.fn(),
    setValue: jest.fn(),
    watch: jest.fn(() => '')
  })
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment variable
const originalEnv = process.env;

describe('AntragForm - Complete Submission Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormBaseOnSubmit.mockClear();
    mockFormBaseOnReset.mockClear();
    mockOnFilesSelect.mockClear();
    mockOnRecaptchaVerify.mockClear();
    (global.fetch as jest.Mock).mockClear();
    
    // Reset mock states
    mockIsSubmitting = false;
    mockSubmissionError = null;
    mockSubmissionSuccess = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  const renderAntragForm = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <AntragForm {...props} />
      </ThemeProvider>
    );
  };

  describe('Successful Submission Flow', () => {
    it.skip('completes full submission flow with files and success message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Antrag erfolgreich übermittelt',
          antrag: {
            id: 'test-id',
            title: 'Test Title',
            summary: 'Test summary',
            status: 'NEW',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });

      renderAntragForm();
      
      // Select files
      const selectFilesButton = screen.getByTestId('select-files');
      await act(async () => {
        fireEvent.click(selectFilesButton);
      });
      
      // Verify files are selected
      expect(screen.getByTestId('files-count')).toHaveTextContent('2');
      
      // Submit form
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Verify API call was made with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/antraege/submit', {
          method: 'POST',
          body: expect.any(FormData)
        });
      });
      
      // Verify FormData contents
      const formDataCall = (global.fetch as jest.Mock).mock.calls[0];
      const formData = formDataCall[1].body as FormData;
      
      expect(formData.get('firstName')).toBe('Test');
      expect(formData.get('lastName')).toBe('User');
      expect(formData.get('email')).toBe('test@example.com');
      expect(formData.get('title')).toBe('Test Title');
      expect(formData.get('summary')).toBe('Test summary with enough characters');
      expect(formData.get('purposes')).toBe(JSON.stringify({ zuschuss: { enabled: true, amount: 500 } }));
      expect(formData.get('fileCount')).toBe('2');
      expect(formData.get('file-0')).toBeInstanceOf(File);
      expect(formData.get('file-1')).toBeInstanceOf(File);
      
      // Verify success message is shown
      expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      expect(screen.getByText('Antrag erfolgreich eingereicht!')).toBeInTheDocument();
      expect(screen.getByText('Vielen Dank für Ihren Antrag. Dieser wird zeitnah vom Kreisvorstand geprüft und bearbeitet.')).toBeInTheDocument();
    });

    it.skip('completes submission without files', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderAntragForm();
      
      // Submit form without selecting files
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Verify API call was made
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/antraege/submit', {
          method: 'POST',
          body: expect.any(FormData)
        });
      });
      
      // Verify no file data in FormData
      const formDataCall = (global.fetch as jest.Mock).mock.calls[0];
      const formData = formDataCall[1].body as FormData;
      
      expect(formData.get('fileCount')).toBeNull();
      expect(formData.get('file-0')).toBeNull();
    });
  });

  describe('reCAPTCHA Integration', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
    });

    it.skip('includes reCAPTCHA token in submission when verified', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderAntragForm();
      
      // Verify reCAPTCHA component is rendered
      expect(screen.getByTestId('recaptcha')).toBeInTheDocument();
      
      // Verify reCAPTCHA
      const verifyButton = screen.getByTestId('verify-recaptcha');
      await act(async () => {
        fireEvent.click(verifyButton);
      });
      
      // Submit form
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Verify reCAPTCHA token is included
      const formDataCall = (global.fetch as jest.Mock).mock.calls[0];
      const formData = formDataCall[1].body as FormData;
      
      expect(formData.get('recaptchaToken')).toBe('mock-recaptcha-token');
    });

    it('does not show reCAPTCHA when site key is not configured', () => {
      delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      
      renderAntragForm();
      
      expect(screen.queryByTestId('recaptcha')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it.skip('handles API validation errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Validierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.',
          fieldErrors: { email: 'Invalid email format' }
        })
      });

      renderAntragForm();
      
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toHaveTextContent(
          'Validierung fehlgeschlagen. Bitte überprüfen Sie Ihre Eingaben.'
        );
      });
    });

    it.skip('handles file upload size errors (413)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 413
      });

      renderAntragForm();
      
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toHaveTextContent(
          'Die hochgeladenen Dateien sind zu groß. Bitte reduzieren Sie die Dateigröße oder Anzahl der Anhänge und versuchen Sie es erneut.'
        );
      });
    });

    it.skip('handles server errors (500)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Parse error'); }
      });

      renderAntragForm();
      
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toHaveTextContent(
          'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
        );
      });
    });

    it.skip('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderAntragForm();
      
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toHaveTextContent('Network error');
      });
    });

    it.skip('handles reCAPTCHA errors', async () => {
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'reCAPTCHA-Überprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.'
        })
      });

      renderAntragForm();
      
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toHaveTextContent(
          'reCAPTCHA-Überprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.'
        );
      });
    });
  });

  describe('Form Reset and Recovery', () => {
    it.skip('resets form state after successful submission', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderAntragForm();
      
      // Select files first
      const selectFilesButton = screen.getByTestId('select-files');
      await act(async () => {
        fireEvent.click(selectFilesButton);
      });
      
      // Submit form
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Wait for success
      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });
      
      // Reset form
      const resetButton = screen.getByTestId('reset-button');
      await act(async () => {
        fireEvent.click(resetButton);
      });
      
      // Verify reset was called
      expect(mockFormBaseOnReset).toHaveBeenCalled();
    });

    it.skip('allows retry after error', async () => {
      // First call fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      // Second call succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderAntragForm();
      
      // First submission fails
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-error')).toBeInTheDocument();
      });
      
      // Clear error state for retry
      mockSubmissionError = null;
      
      // Second submission succeeds
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('submission-success')).toBeInTheDocument();
      });
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Custom Submit Handler', () => {
    it.skip('uses custom submit handler when provided', async () => {
      const mockCustomSubmit = jest.fn().mockResolvedValue(undefined);
      
      renderAntragForm({ onSubmit: mockCustomSubmit });
      
      // Select files
      const selectFilesButton = screen.getByTestId('select-files');
      await act(async () => {
        fireEvent.click(selectFilesButton);
      });
      
      // Submit form
      const submitButton = screen.getByTestId('submit-button');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Verify custom handler was called with correct arguments
      await waitFor(() => {
        expect(mockCustomSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com'
          }),
          expect.arrayContaining([
            expect.objectContaining({ name: 'test.pdf' }),
            expect.objectContaining({ name: 'image.jpg' })
          ])
        );
      });
      
      // Verify API was not called
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it.skip('shows loading state during submission', async () => {
      let resolvePromise: (value: any) => void;
      const submissionPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      (global.fetch as jest.Mock).mockReturnValue(submissionPromise);

      renderAntragForm();
      
      const submitButton = screen.getByTestId('submit-button');
      
      // Start submission
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      // Should show loading state
      expect(screen.getByTestId('is-submitting')).toHaveTextContent('true');
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true })
        });
      });
      
      // Should no longer be loading
      expect(screen.getByTestId('is-submitting')).toHaveTextContent('false');
    });
  });
});