import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditStatusReportForm from '../components/EditStatusReportForm';
import { act } from 'react-dom/test-utils';

// Mock fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, groups: [] })
  })
) as jest.Mock;

// Mock useForm's implementation from 'react-hook-form'
jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  Controller: ({ name, control, defaultValue, render }) => {
    const props = {
      field: {
        value: defaultValue,
        onChange: jest.fn(),
        onBlur: jest.fn(),
        name
      }
    };
    return render(props);
  }
}));

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock RichTextEditor component
jest.mock('../components/RichTextEditor', () => {
  return function MockRichTextEditor({ value, onChange }) {
    return (
      <div data-testid="rich-text-editor">
        <textarea 
          data-testid="mock-rich-text-editor" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  };
});

// Mock FileUpload component
jest.mock('../components/FileUpload', () => {
  return function MockFileUpload({ onFilesSelect }) {
    return (
      <div data-testid="file-upload">
        <button 
          data-testid="mock-file-select" 
          onClick={() => onFilesSelect([new File(['file content'], 'test.jpg', { type: 'image/jpeg' })])}
        >
          Select Files
        </button>
      </div>
    );
  };
});

const mockStatusReport = {
  id: 1,
  groupId: 'group1',
  title: 'Test Report',
  content: '<p>Test content</p>',
  reporterFirstName: 'John',
  reporterLastName: 'Doe',
  status: 'draft' as const,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  fileUrls: JSON.stringify(['https://example.com/file1.jpg'])
};

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

describe('EditStatusReportForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with initial values', async () => {
    await act(async () => {
      render(
        <EditStatusReportForm 
          statusReport={mockStatusReport} 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );
    });

    // Check if the form renders with the correct initial values
    expect(screen.getByText('Berichtsinformationen')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    
    // Check for status dropdown
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    
    // Check for existing file attachment section
    expect(screen.getByText('Vorhandene Anhänge')).toBeInTheDocument();
  });

  it('handles submit correctly', async () => {
    await act(async () => {
      render(
        <EditStatusReportForm 
          statusReport={mockStatusReport} 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );
    });

    // Click the submit button
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('handles cancel correctly', async () => {
    await act(async () => {
      render(
        <EditStatusReportForm 
          statusReport={mockStatusReport} 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );
    });

    // Click the cancel button
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    // Check if cancel handler was called
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles file attachments correctly', async () => {
    await act(async () => {
      render(
        <EditStatusReportForm 
          statusReport={mockStatusReport} 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );
    });

    // Click on the mock file select button
    fireEvent.click(screen.getByTestId('mock-file-select'));

    // Click the submit button
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    // Wait for the form submission to complete
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([expect.any(File)])
      );
    });
  });

  it('handles removing existing files', async () => {
    await act(async () => {
      render(
        <EditStatusReportForm 
          statusReport={mockStatusReport} 
          onSubmit={mockOnSubmit} 
          onCancel={mockOnCancel} 
        />
      );
    });

    // Find and click the remove button for an existing file
    fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }));

    // Existing files should be removed
    // This can be verified through the DOM or by checking what's passed to onSubmit
    fireEvent.click(screen.getByRole('button', { name: 'Änderungen speichern' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});