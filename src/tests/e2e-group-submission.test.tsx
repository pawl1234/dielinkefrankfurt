// e2e-group-submission.test.tsx - End-to-end tests for the group request submission flow
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GroupRequestForm from '../components/GroupRequestForm';
import { setupMockBlobStorage, setupMockEmailService, resetMockBlobStorage, resetMockEmailService } from './mock-services';
import { createMockImageFile } from './test-utils';

// Mock fetch API
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock the file upload component
jest.mock('../components/FileUpload', () => {
  return {
    __esModule: true,
    default: ({ onFilesSelect }: { onFilesSelect: (files: any[]) => void }) => {
      return (
        <div data-testid="file-upload">
          <button
            onClick={() => onFilesSelect([createMockImageFile()])}
            data-testid="mock-file-upload-button"
          >
            Upload Logo
          </button>
        </div>
      );
    },
  };
});

// Mock rich text editor if used
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

// Mock the CaptchaField component if used
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

describe('Group Request Submission Flow', () => {
  beforeAll(() => {
    // Setup mock services
    setupMockBlobStorage();
    setupMockEmailService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true, 
        group: {
          id: 'new-group-123',
          name: 'Test Group'
        }
      }),
    });
  });

  afterEach(() => {
    resetMockBlobStorage();
    resetMockEmailService();
  });

  it('renders the group request form correctly', () => {
    render(<GroupRequestForm />);
    
    // Check for essential form sections
    expect(screen.getByText(/Gruppe erstellen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name der Gruppe/i)).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByText(/Verantwortliche Person/i)).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole('button', { name: /anfrage senden/i })).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(<GroupRequestForm />);
    
    // Submit form without filling required fields
    const submitButton = screen.getByRole('button', { name: /anfrage senden/i });
    fireEvent.click(submitButton);
    
    // Wait for validation errors to appear
    await waitFor(() => {
      // Check for error messages
      expect(document.querySelector('[role="alert"]')).toBeInTheDocument();
      expect(screen.getByText(/name ist erforderlich/i)).toBeInTheDocument();
    });
  });

  it('successfully submits the form with valid data', async () => {
    render(<GroupRequestForm />);
    
    // Fill out the form
    // Group name
    const nameInput = screen.getByLabelText(/Name der Gruppe/i);
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });
    
    // Description
    const descriptionInput = screen.getByTestId('rich-text-input');
    fireEvent.change(descriptionInput, { target: { value: '<p>This is a test group description</p>' } });
    
    // Responsible person fields
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    const emailInput = screen.getByLabelText(/E-Mail/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    
    // Upload logo (using mock button)
    const uploadButton = screen.getByTestId('mock-file-upload-button');
    fireEvent.click(uploadButton);
    
    // Complete captcha if required
    const captchaButton = screen.queryByTestId('mock-captcha-button');
    if (captchaButton) {
      fireEvent.click(captchaButton);
    }
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /anfrage senden/i });
    fireEvent.click(submitButton);
    
    // Wait for form submission
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/groups/submit', 
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
    
    // Verify the payload contains the correct data
    const fetchCalls = mockFetch.mock.calls[0];
    const requestOptions = fetchCalls[1];
    const requestBody = JSON.parse(requestOptions.body);
    
    expect(requestBody.name).toBe('Test Group');
    expect(requestBody.description).toBe('<p>This is a test group description</p>');
    expect(requestBody.responsiblePersons).toHaveLength(1);
    expect(requestBody.responsiblePersons[0].firstName).toBe('John');
    expect(requestBody.responsiblePersons[0].lastName).toBe('Doe');
    expect(requestBody.responsiblePersons[0].email).toBe('john.doe@example.com');
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/anfrage erfolgreich gesendet/i)).toBeInTheDocument();
    });
    
    // Check if form was reset
    expect(nameInput).toHaveValue('');
  });

  it('handles API errors correctly', async () => {
    // Mock a failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ 
        success: false, 
        error: 'Ein Serverfehler ist aufgetreten' 
      }),
    });
    
    render(<GroupRequestForm />);
    
    // Fill minimum required fields
    const nameInput = screen.getByLabelText(/Name der Gruppe/i);
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });
    
    const descriptionInput = screen.getByTestId('rich-text-input');
    fireEvent.change(descriptionInput, { target: { value: '<p>This is a test group description</p>' } });
    
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    const emailInput = screen.getByLabelText(/E-Mail/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /anfrage senden/i });
    fireEvent.click(submitButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/fehler beim absenden/i)).toBeInTheDocument();
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
            json: async () => ({ 
              success: true, 
              group: {
                id: 'new-group-123',
                name: 'Test Group'
              }
            }),
          });
        }, 100);
      });
    });
    
    render(<GroupRequestForm />);
    
    // Fill minimum required fields
    const nameInput = screen.getByLabelText(/Name der Gruppe/i);
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });
    
    const descriptionInput = screen.getByTestId('rich-text-input');
    fireEvent.change(descriptionInput, { target: { value: '<p>This is a test group description</p>' } });
    
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    const emailInput = screen.getByLabelText(/E-Mail/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /anfrage senden/i });
    fireEvent.click(submitButton);
    
    // Check for loading state
    expect(screen.getByText(/wird gesendet/i)).toBeInTheDocument();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText(/anfrage erfolgreich gesendet/i)).toBeInTheDocument();
    });
  });

  it('validates email format for responsible person', async () => {
    render(<GroupRequestForm />);
    
    // Fill out the form with invalid email
    const nameInput = screen.getByLabelText(/Name der Gruppe/i);
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });
    
    const descriptionInput = screen.getByTestId('rich-text-input');
    fireEvent.change(descriptionInput, { target: { value: '<p>This is a test group description</p>' } });
    
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    const emailInput = screen.getByLabelText(/E-Mail/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } }); // Invalid email format
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /anfrage senden/i });
    fireEvent.click(submitButton);
    
    // Check for email validation error
    await waitFor(() => {
      expect(screen.getByText(/ungültige e-mail-adresse/i)).toBeInTheDocument();
    });
    
    // Fix the email
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    
    // Submit again
    fireEvent.click(submitButton);
    
    // Should not show email validation error
    await waitFor(() => {
      expect(screen.queryByText(/ungültige e-mail-adresse/i)).not.toBeInTheDocument();
    });
  });
});