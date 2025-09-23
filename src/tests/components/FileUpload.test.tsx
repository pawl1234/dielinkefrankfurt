import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';
import FileUpload from '../../components/upload/FileUpload';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FileUpload Component', () => {
  const mockOnFilesSelect = jest.fn();
  const mockOnFilesAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload area with correct information', () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        allowedFileTypes={['.pdf', '.jpg']}
      />
    );

    expect(screen.getByText(/dateien hochladen/i)).toBeInTheDocument();
    expect(screen.getByText(/dateien auswählen oder hierher ziehen/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\.pdf, \.jpg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/max\. 10MB/).length).toBeGreaterThan(0);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.pdf,.jpg');
    expect(fileInput).toHaveAttribute('multiple');
  });

  it('handles file selection and displays files', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnFilesSelect).toHaveBeenCalled();
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('allows removing files after processing completes', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file processing to complete
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Wait for processing to finish and remove button to appear
    await waitFor(() => {
      expect(screen.getByText(/entfernen/i)).toBeInTheDocument();
    }, { timeout: 1000 });

    const removeButton = screen.getByText(/entfernen/i);
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnFilesSelect).toHaveBeenCalledWith([]);
    });
  });

  it('validates file count limits', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={2}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.pdf', { type: 'application/pdf' }),
      new File(['content3'], 'test3.pdf', { type: 'application/pdf' })
    ];

    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText(/du kannst maximal.*dateien hochladen/i)).toBeInTheDocument();
    });
  });

  it('shows upload progress when uploading', () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        isUploading={true}
        uploadProgress={50}
      />
    );

    expect(screen.getByText(/upload läuft/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onFilesAdded callback when files are added', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        onFilesAdded={mockOnFilesAdded}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnFilesAdded).toHaveBeenCalledWith([file]);
    });
  });

  it('disables interaction when disabled prop is true', () => {
    renderWithTheme(
      <FileUpload
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        disabled={true}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDisabled();
  });

  it('validates file type and shows error for invalid types', async () => {
    renderWithTheme(
      <FileUpload
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        allowedFileTypes={['.pdf', '.jpg']}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/nicht unterstützter dateityp.*\.pdf, \.jpg/i)).toBeInTheDocument();
    });

    // Ensure onFilesSelect was not called for invalid file
    expect(mockOnFilesSelect).not.toHaveBeenCalled();
  });

  it('validates file size and shows error for oversized files', async () => {
    const maxFileSize = 2 * 1024 * 1024; // 2MB
    renderWithTheme(
      <FileUpload
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={maxFileSize}
        allowedFileTypes={['.pdf', '.jpg']}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Create a file larger than the limit
    const oversizedFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/dateigröße überschreitet.*2.*mb.*limit/i)).toBeInTheDocument();
    });

    // Ensure onFilesSelect was not called for oversized file
    expect(mockOnFilesSelect).not.toHaveBeenCalled();
  });

  it('shows error for first invalid file when multiple files are selected', async () => {
    renderWithTheme(
      <FileUpload
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        allowedFileTypes={['.pdf', '.jpg']}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['content'], 'valid.pdf', { type: 'application/pdf' });
    const invalidFile = new File(['content'], 'invalid.txt', { type: 'text/plain' });

    // Select both files - invalid file should trigger error
    fireEvent.change(fileInput, { target: { files: [validFile, invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/nicht unterstützter dateityp/i)).toBeInTheDocument();
    });

    // Ensure no files were processed due to validation failure
    expect(mockOnFilesSelect).not.toHaveBeenCalled();
  });

  it('clears errors when valid files are uploaded after an error', async () => {
    renderWithTheme(
      <FileUpload
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        allowedFileTypes={['.pdf', '.jpg']}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // First, trigger an error with invalid file type
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/nicht unterstützter dateityp/i)).toBeInTheDocument();
    });

    // Then upload a valid file
    const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      // Error should be cleared
      expect(screen.queryByText(/nicht unterstützter dateityp/i)).not.toBeInTheDocument();
      // Valid file should be displayed
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    expect(mockOnFilesSelect).toHaveBeenCalled();
  });
});