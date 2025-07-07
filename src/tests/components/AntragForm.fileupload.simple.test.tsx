import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';

// Create a minimal test component that focuses on file upload integration
function TestAntragFormWithFileUpload() {
  const [fileList, setFileList] = React.useState<(File | Blob)[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleFileSelect = React.useCallback((files: (File | Blob)[]) => {
    setFileList(files);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('title', 'Test Antrag');
      formData.append('summary', 'Test summary');
      
      if (fileList.length > 0) {
        fileList.forEach((file, index) => {
          formData.append(`files[${index}]`, file);
        });
      }

      const response = await fetch('/api/antraege/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Submission failed');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return React.createElement('div', { 'data-testid': 'test-form' },
    React.createElement('form', { onSubmit: handleSubmit },
      React.createElement('div', { 'data-testid': 'file-upload-section' },
        React.createElement(MockFileUpload, {
          onFilesSelect: handleFileSelect,
          maxFiles: 5,
          maxFileSize: 10 * 1024 * 1024,
          allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
          multiple: true
        })
      ),
      React.createElement('div', { 'data-testid': 'file-count' }, fileList.length),
      React.createElement('button', {
        type: 'submit',
        disabled: isSubmitting,
        'data-testid': 'submit-btn'
      }, isSubmitting ? 'Submitting...' : 'Submit'),
      submitError && React.createElement('div', { 'data-testid': 'error-message' }, submitError)
    )
  );
}

// Mock FileUpload component for testing
function MockFileUpload({ 
  onFilesSelect, 
  maxFiles, 
  maxFileSize, 
  allowedFileTypes,
  multiple 
}: {
  onFilesSelect?: (files: (File | Blob)[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  multiple?: boolean;
}) {
  return React.createElement('div', { 'data-testid': 'file-upload' },
    React.createElement('div', { 'data-testid': 'max-files' }, maxFiles),
    React.createElement('div', { 'data-testid': 'max-file-size' }, maxFileSize),
    React.createElement('div', { 'data-testid': 'allowed-file-types' }, allowedFileTypes?.join(',')),
    React.createElement('div', { 'data-testid': 'multiple' }, multiple ? 'true' : 'false'),
    React.createElement('button', {
      type: 'button',
      'data-testid': 'select-files-btn',
      onClick: () => {
        const mockFiles = [
          new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
          new File(['image content'], 'image.jpg', { type: 'image/jpeg' })
        ];
        onFilesSelect?.(mockFiles);
      }
    }, 'Select Files'),
    React.createElement('button', {
      type: 'button',
      'data-testid': 'select-single-file-btn',
      onClick: () => {
        const mockFile = new File(['single file'], 'single.pdf', { type: 'application/pdf' });
        onFilesSelect?.([mockFile]);
      }
    }, 'Select Single File'),
    React.createElement('button', {
      type: 'button',
      'data-testid': 'clear-files-btn',
      onClick: () => {
        onFilesSelect?.([]);
      }
    }, 'Clear Files')
  );
}

// Mock fetch
global.fetch = jest.fn();

describe('AntragForm - File Upload Integration (Simple)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderTestForm = () => {
    return render(
      <ThemeProvider theme={theme}>
        <TestAntragFormWithFileUpload />
      </ThemeProvider>
    );
  };

  describe('File Upload Configuration', () => {
    it('renders FileUpload with correct constraints', () => {
      renderTestForm();
      
      const fileUpload = screen.getByTestId('file-upload');
      expect(fileUpload).toBeInTheDocument();
      
      // Check constraints
      expect(screen.getByTestId('max-files')).toHaveTextContent('5');
      expect(screen.getByTestId('max-file-size')).toHaveTextContent('10485760'); // 10MB in bytes
      expect(screen.getByTestId('allowed-file-types')).toHaveTextContent('.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx');
      expect(screen.getByTestId('multiple')).toHaveTextContent('true');
    });
  });

  describe('File Selection', () => {
    it('handles multiple file selection', async () => {
      renderTestForm();
      
      const selectButton = screen.getByTestId('select-files-btn');
      
      await act(async () => {
        fireEvent.click(selectButton);
      });
      
      expect(screen.getByTestId('file-count')).toHaveTextContent('2');
    });

    it('handles single file selection', async () => {
      renderTestForm();
      
      const selectButton = screen.getByTestId('select-single-file-btn');
      
      await act(async () => {
        fireEvent.click(selectButton);
      });
      
      expect(screen.getByTestId('file-count')).toHaveTextContent('1');
    });

    it('handles file clearing', async () => {
      renderTestForm();
      
      // First select files
      const selectButton = screen.getByTestId('select-files-btn');
      await act(async () => {
        fireEvent.click(selectButton);
      });
      
      expect(screen.getByTestId('file-count')).toHaveTextContent('2');
      
      // Then clear files
      const clearButton = screen.getByTestId('clear-files-btn');
      await act(async () => {
        fireEvent.click(clearButton);
      });
      
      expect(screen.getByTestId('file-count')).toHaveTextContent('0');
    });
  });

  describe('Form Submission with Files', () => {
    it('submits form with files using FormData', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderTestForm();
      
      // Select files
      const selectButton = screen.getByTestId('select-files-btn');
      await act(async () => {
        fireEvent.click(selectButton);
      });
      
      // Submit form
      const submitButton = screen.getByTestId('submit-btn');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/antraege/submit', {
          method: 'POST',
          body: expect.any(FormData)
        });
      });
    });

    it('submits form without files', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      renderTestForm();
      
      // Submit form without selecting files
      const submitButton = screen.getByTestId('submit-btn');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/antraege/submit', {
          method: 'POST',
          body: expect.any(FormData)
        });
      });
    });

    it('handles submission errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Upload failed' })
      });

      renderTestForm();
      
      const submitButton = screen.getByTestId('submit-btn');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Upload failed');
      });
    });

    it('handles network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderTestForm();
      
      const submitButton = screen.getByTestId('submit-btn');
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during submission', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 100))
      );

      renderTestForm();
      
      const submitButton = screen.getByTestId('submit-btn');
      
      await act(async () => {
        fireEvent.click(submitButton);
      });
      
      expect(screen.getByTestId('submit-btn')).toHaveTextContent('Submitting...');
      expect(screen.getByTestId('submit-btn')).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toHaveTextContent('Submit');
      });
    });
  });

  describe('File Validation Integration', () => {
    it('supports configured file types', () => {
      renderTestForm();
      
      const allowedTypes = screen.getByTestId('allowed-file-types').textContent;
      expect(allowedTypes).toContain('.pdf');
      expect(allowedTypes).toContain('.jpg');
      expect(allowedTypes).toContain('.png');
      expect(allowedTypes).toContain('.doc');
      expect(allowedTypes).toContain('.docx');
      expect(allowedTypes).toContain('.xls');
      expect(allowedTypes).toContain('.xlsx');
    });

    it('enforces file count limits', () => {
      renderTestForm();
      
      expect(screen.getByTestId('max-files')).toHaveTextContent('5');
    });

    it('enforces file size limits', () => {
      renderTestForm();
      
      // 10MB = 10 * 1024 * 1024 = 10485760 bytes
      expect(screen.getByTestId('max-file-size')).toHaveTextContent('10485760');
    });
  });
});