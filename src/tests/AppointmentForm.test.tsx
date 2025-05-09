import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentForm from '../components/AppointmentForm';
import '@testing-library/jest-dom';

// Mock components
jest.mock('../components/RichTextEditor', () => {
  return {
    __esModule: true,
    default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
      return (
        <div data-testid="rich-text-editor">
          <textarea
            data-testid="rich-text-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    },
  };
});

jest.mock('../components/FileUpload', () => {
  return {
    __esModule: true,
    default: ({ onFilesSelect }: { onFilesSelect: (files: any[]) => void }) => {
      return (
        <div data-testid="file-upload">
          <button
            onClick={() => onFilesSelect([new File(['content'], 'test.jpg', { type: 'image/jpeg' })])}
            data-testid="mock-file-upload-button"
          >
            Upload Files
          </button>
        </div>
      );
    },
  };
});

jest.mock('../components/DateTimePicker', () => {
  return {
    __esModule: true,
    default: ({ name, setValue }: { name: string; setValue: any }) => {
      return (
        <div data-testid={`date-picker-${name}`}>
          <input
            type="text"
            data-testid={`date-input-${name}`}
            onChange={() => {
              const date = new Date('2025-05-01T12:00:00Z');
              setValue(name, date);
            }}
          />
        </div>
      );
    },
  };
});

jest.mock('../components/CaptchaField', () => {
  return {
    __esModule: true,
    default: ({ setValue }: { setValue: any }) => {
      return (
        <div data-testid="captcha-field">
          <button
            onClick={() => setValue('captchaToken', 'mock-token')}
            data-testid="mock-captcha-button"
          >
            Verify Captcha
          </button>
        </div>
      );
    },
  };
});

// Mock fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock window.scrollTo
global.scrollTo = jest.fn();

describe('AppointmentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock a successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('renders the form correctly', () => {
    render(<AppointmentForm />);
    
    // Check for required sections
    expect(screen.getByText('Antragsteller')).toBeInTheDocument();
    expect(screen.getByText('Beschreibung der Veranstaltung')).toBeInTheDocument();
    expect(screen.getByText('Datum und Uhrzeit')).toBeInTheDocument();
    expect(screen.getByText('Veranstaltungsort')).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByText('Termin einreichen')).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(<AppointmentForm />);
    
    // Submit form without filling required fields
    const submitButton = screen.getByText('Termin einreichen');
    fireEvent.click(submitButton);
    
    // Wait for validation errors to appear
    await waitFor(() => {
      // Check for error messages (these may vary based on your validation)
      expect(document.querySelector('[role="alert"]')).toBeInTheDocument();
    });
  });

  it('successfully submits the form with valid data', async () => {
    render(<AppointmentForm />);
    
    // Fill out the form
    // Teaser field
    const teaserInput = screen.getByPlaceholderText('Kurze Zusammenfassung der Veranstaltung...');
    fireEvent.change(teaserInput, { target: { value: 'Test Event' } });
    
    // Rich text editor
    const richTextInput = screen.getByTestId('rich-text-input');
    fireEvent.change(richTextInput, { target: { value: '<p>This is a test event description</p>' } });
    
    // Date pickers
    const startDateInput = screen.getByTestId('date-input-startDateTime');
    fireEvent.change(startDateInput, { target: { value: '2025-05-01T12:00:00Z' } });
    
    // Fill out requester fields
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    fireEvent.change(firstNameInput, { target: { value: 'Test' } });
    fireEvent.change(lastNameInput, { target: { value: 'User' } });
    
    // Add a file
    const uploadButton = screen.getByTestId('mock-file-upload-button');
    fireEvent.click(uploadButton);
    
    // Submit the form
    const submitButton = screen.getByText('Termin einreichen');
    fireEvent.click(submitButton);
    
    // Wait for form submission
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/submit-appointment', expect.any(Object));
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Vielen Dank für Ihre Terminanfrage!')).toBeInTheDocument();
    });
    
    // Check if form was reset
    expect(teaserInput).toHaveValue('');
  });

  it('handles API errors correctly', async () => {
    // Mock a failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Ein Serverfehler ist aufgetreten' }),
    });
    
    render(<AppointmentForm />);
    
    // Fill minimum required fields
    const teaserInput = screen.getByPlaceholderText('Kurze Zusammenfassung der Veranstaltung...');
    fireEvent.change(teaserInput, { target: { value: 'Test Event' } });
    
    const richTextInput = screen.getByTestId('rich-text-input');
    fireEvent.change(richTextInput, { target: { value: '<p>This is a test event description</p>' } });
    
    const startDateInput = screen.getByTestId('date-input-startDateTime');
    fireEvent.change(startDateInput, { target: { value: '2025-05-01T12:00:00Z' } });
    
    // Submit form
    const submitButton = screen.getByText('Termin einreichen');
    fireEvent.click(submitButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Absenden/i)).toBeInTheDocument();
      expect(screen.getByText('Ein Serverfehler ist aufgetreten')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    // Delay the mock fetch to observe loading state
    mockFetch.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }, 100);
      });
    });
    
    render(<AppointmentForm />);
    
    // Fill minimum required fields
    const teaserInput = screen.getByPlaceholderText('Kurze Zusammenfassung der Veranstaltung...');
    fireEvent.change(teaserInput, { target: { value: 'Test Event' } });
    
    const richTextInput = screen.getByTestId('rich-text-input');
    fireEvent.change(richTextInput, { target: { value: '<p>This is a test event description</p>' } });
    
    const startDateInput = screen.getByTestId('date-input-startDateTime');
    fireEvent.change(startDateInput, { target: { value: '2025-05-01T12:00:00Z' } });
    
    // Submit form
    const submitButton = screen.getByText('Termin einreichen');
    fireEvent.click(submitButton);
    
    // Check for loading state
    expect(screen.getByText('Wird gesendet...')).toBeInTheDocument();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Vielen Dank für Ihre Terminanfrage!')).toBeInTheDocument();
    });
  });
});