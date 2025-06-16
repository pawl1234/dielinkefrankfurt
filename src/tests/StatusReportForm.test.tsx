import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatusReportForm from '@/components/StatusReportForm';
import '@testing-library/jest-dom';

// Mock fetch API
global.fetch = jest.fn();

// Mock components that are difficult to test
jest.mock('@/components/RichTextEditor', () => ({
  __esModule: true,
  default: ({ value, onChange, maxLength, placeholder }: { value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string }) => (
    <div data-testid="rich-text-editor">
      <textarea 
        data-testid="mock-rich-text-editor" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  ),
}));

jest.mock('@/components/FileUpload', () => ({
  __esModule: true,
  default: ({ onFilesSelect }: { onFilesSelect: (files: File[]) => void }) => (
    <div data-testid="file-upload">
      <button 
        data-testid="mock-file-upload-button"
        onClick={() => onFilesSelect([
          new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        ])}
      >
        Upload Files
      </button>
    </div>
  ),
}));

describe('StatusReportForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for fetch to return active groups
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        groups: [
          { id: 'group1', name: 'Test Group 1', slug: 'test-group-1' },
          { id: 'group2', name: 'Test Group 2', slug: 'test-group-2' }
        ]
      })
    });
  });

  it('renders the form with all required fields', async () => {
    render(<StatusReportForm />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByText('Gruppe auswählen')).toBeInTheDocument();
    });
    
    // Check for main form sections
    expect(screen.getByText('Berichtsinformationen')).toBeInTheDocument();
    expect(screen.getByText('Ansprechpartner')).toBeInTheDocument();
    expect(screen.getByText('Datei Anhänge')).toBeInTheDocument();
    
    // Check for required fields
    expect(screen.getByLabelText(/Gruppe/i)).toBeInTheDocument();
    expect(screen.getByText(/Titel \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Inhalt \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vorname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nachname/i)).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByText('Bericht einreichen')).toBeInTheDocument();
  });

  it('handles failed group fetch', async () => {
    // Mock fetch to fail
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(<StatusReportForm />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Es konnten keine Gruppen geladen werden/i)).toBeInTheDocument();
    });
  });

  it('validates required fields on submission', async () => {
    render(<StatusReportForm />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Gruppe/i)).toBeInTheDocument();
    });
    
    // Submit form without filling required fields
    fireEvent.click(screen.getByText('Bericht einreichen'));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Bitte wählen Sie eine Gruppe aus/i)).toBeInTheDocument();
      expect(screen.getByText(/Titel ist erforderlich/i)).toBeInTheDocument();
      expect(screen.getByText(/Bitte geben Sie einen Inhalt ein/i)).toBeInTheDocument();
      expect(screen.getByText(/Vorname ist erforderlich/i)).toBeInTheDocument();
      expect(screen.getByText(/Nachname ist erforderlich/i)).toBeInTheDocument();
    });
  });

  it('handles successful form submission', async () => {
    // Mock successful form submission
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/groups') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            groups: [
              { id: 'group1', name: 'Test Group 1', slug: 'test-group-1' }
            ]
          })
        });
      } else if (url === '/api/status-reports/submit') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            statusReport: { id: 'report1', title: 'Test Report' }
          })
        });
      }
    });
    
    render(<StatusReportForm />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Gruppe/i)).toBeInTheDocument();
    });
    
    // Fill in the form
    fireEvent.mouseDown(screen.getByLabelText(/Gruppe/i));
    fireEvent.click(screen.getByText('Test Group 1'));
    
    fireEvent.change(screen.getByPlaceholderText(/Titel des Berichts/i), {
      target: { value: 'Test Report Title' }
    });
    
    // Fill in the rich text editor
    fireEvent.change(screen.getByTestId('mock-rich-text-editor'), {
      target: { value: '<p>This is a test report content</p>' }
    });
    
    // Fill in personal info
    fireEvent.change(screen.getByLabelText(/Vorname/i), {
      target: { value: 'John' }
    });
    
    fireEvent.change(screen.getByLabelText(/Nachname/i), {
      target: { value: 'Doe' }
    });
    
    // Upload a file
    fireEvent.click(screen.getByTestId('mock-file-upload-button'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Bericht einreichen'));
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Vielen Dank für Ihren Bericht!/i)).toBeInTheDocument();
    });
    
    // Check that form was reset
    expect(screen.queryByDisplayValue('Test Report Title')).not.toBeInTheDocument();
  });

  it('handles form submission errors', async () => {
    // Mock failed form submission
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/groups') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            groups: [
              { id: 'group1', name: 'Test Group 1', slug: 'test-group-1' }
            ]
          })
        });
      } else if (url === '/api/status-reports/submit') {
        return Promise.resolve({
          ok: false,
          json: async () => ({
            error: 'Failed to submit status report'
          })
        });
      }
    });
    
    render(<StatusReportForm />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByLabelText(/Gruppe/i)).toBeInTheDocument();
    });
    
    // Fill in the form
    fireEvent.mouseDown(screen.getByLabelText(/Gruppe/i));
    fireEvent.click(screen.getByText('Test Group 1'));
    
    fireEvent.change(screen.getByPlaceholderText(/Titel des Berichts/i), {
      target: { value: 'Test Report Title' }
    });
    
    // Fill in the rich text editor
    fireEvent.change(screen.getByTestId('mock-rich-text-editor'), {
      target: { value: '<p>This is a test report content</p>' }
    });
    
    // Fill in personal info
    fireEvent.change(screen.getByLabelText(/Vorname/i), {
      target: { value: 'John' }
    });
    
    fireEvent.change(screen.getByLabelText(/Nachname/i), {
      target: { value: 'Doe' }
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Bericht einreichen'));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Absenden/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to submit status report/i)).toBeInTheDocument();
    });
  });
});