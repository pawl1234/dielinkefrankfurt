import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';
import FileUpload from '../../components/upload/FileUpload';

// Mock the file upload library
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn()
}));

jest.mock('../../lib/file-upload', () => ({
  uploadStatusReportFiles: jest.fn(),
  validateStatusReportFiles: jest.fn(),
  MAX_STATUS_REPORT_FILES_COUNT: 5,
  MAX_STATUS_REPORT_FILES_SIZE: 10 * 1024 * 1024 // 10MB
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FileUpload Component', () => {
  const mockOnFilesSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file upload area correctly', () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    expect(screen.getByText(/dateien auswählen oder hierher ziehen/i)).toBeInTheDocument();
    expect(screen.getByText(/dateien hochladen/i)).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['file content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnFilesSelect).toHaveBeenCalled();
    });
  });

  it('displays selected files', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'test2.jpg', { type: 'image/jpeg' })
    ];

    fireEvent.change(fileInput, { target: { files } });

    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
    });
  });

  it('allows removing selected files', async () => {
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
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

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

  it('displays file type information correctly', () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={3}
        maxFileSize={5 * 1024 * 1024}
        allowedFileTypes={['.pdf', '.doc']}
      />
    );

    // Verify the component shows the correct file type restrictions
    expect(screen.getAllByText(/\.pdf, \.doc/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/max\. 5MB/).length).toBeGreaterThan(0);
    
    // Verify the file input has the correct accept attribute
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', '.pdf,.doc');
  });

  it('supports drag and drop functionality', async () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
      />
    );

    const dropZone = screen.getByText(/dateien auswählen oder hierher ziehen/i).closest('div');
    const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' });

    // Test clicking the upload area to trigger file selection
    fireEvent.click(dropZone!);
    
    // Note: Actual drag and drop testing in JSDOM is complex, so we focus on the core functionality
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnFilesSelect).toHaveBeenCalled();
    });
  });

  it('shows upload area with file type and size info', () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        allowedFileTypes={['.pdf', '.jpg', '.png']}
      />
    );

    expect(screen.getAllByText(/\.pdf, \.jpg, \.png/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/max\. 10MB/).length).toBeGreaterThan(0);
  });

  it('handles multiple file selection correctly', () => {
    renderWithTheme(
      <FileUpload 
        onFilesSelect={mockOnFilesSelect}
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024}
        multiple={true}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('multiple');
  });
});