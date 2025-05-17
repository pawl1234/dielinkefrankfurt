// e2e-status-report-submission.test.tsx - End-to-end tests for the status report submission flow
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import StatusReportForm from '../components/StatusReportForm';
import { setupMockBlobStorage, setupMockEmailService, resetMockBlobStorage, resetMockEmailService } from './mock-services';
import { createMockPdfFile, createMockImageFile, createMockGroup } from './test-utils';

// Mock groups for selector
const mockGroups = [
  createMockGroup({ id: 'group-1', name: 'Group 1', status: 'ACTIVE' }),
  createMockGroup({ id: 'group-2', name: 'Group 2', status: 'ACTIVE' })
];

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
            onClick={() => onFilesSelect([
              createMockPdfFile('report.pdf'),
              createMockImageFile('photo.jpg')
            ])}
            data-testid="mock-file-upload-button"
          >
            Upload Files
          </button>
        </div>
      );
    },
  };
});

// Mock the rich text editor component
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

// Mock the group selector component
jest.mock('../components/GroupSelector', () => {
  return {
    __esModule: true,
    default: ({ onGroupSelect }: { onGroupSelect: (groupId: string) => void }) => {
      return (
        <div data-testid="group-selector">
          <select
            data-testid="group-select"
            onChange={(e) => onGroupSelect(e.target.value)}
          >
            <option value="">Select a group</option>
            {mockGroups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
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

describe('Status Report Submission Flow', () => {
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
        statusReport: {
          id: 'report-123',
          title: 'Test Report'
        }
      }),
    });

    // Mock the getGroups API call for the initial load
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/groups')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ groups: mockGroups })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: async () => ({ 
          success: true, 
          statusReport: {
            id: 'report-123',
            title: 'Test Report'
          }
        })
      });
    });
  });

  afterEach(() => {
    resetMockBlobStorage();
    resetMockEmailService();
  });

  it('renders the status report form correctly', () => {
    render(<StatusReportForm />);
    
    // Check for essential form sections
    expect(screen.getByText(/Gruppen-Statusbericht/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Titel des Berichts/i)).toBeInTheDocument();
    expect(screen.getByTestId('group-selector')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole('button', { name: /bericht einreichen/i })).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    render(<StatusReportForm />);
    
    // Submit form without filling required fields
    const submitButton = screen.getByRole('button', { name: /bericht einreichen/i });
    fireEvent.click(submitButton);
    
    // Wait for validation errors to appear
    await waitFor(() => {
      // Check for error messages
      expect(document.querySelector('[role="alert"]')).toBeInTheDocument();
      expect(screen.getByText(/titel ist erforderlich/i)).toBeInTheDocument();
      expect(screen.getByText(/gruppe ist erforderlich/i)).toBeInTheDocument();
    });
  });

  it('successfully submits the form with valid data', async () => {
    render(<StatusReportForm />);
    
    // Fill out the form
    // Report title
    const titleInput = screen.getByLabelText(/Titel des Berichts/i);
    fireEvent.change(titleInput, { target: { value: 'Monthly Update Report' } });
    
    // Select group
    const groupSelect = screen.getByTestId('group-select');
    fireEvent.change(groupSelect, { target: { value: 'group-1' } });
    
    // Report content
    const contentInput = screen.getByTestId('rich-text-input');
    fireEvent.change(contentInput, { target: { value: '<p>This is a detailed status report.</p>' } });
    
    // Reporter information
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    
    // Upload files (using mock button)
    const uploadButton = screen.getByTestId('mock-file-upload-button');
    fireEvent.click(uploadButton);
    
    // Complete captcha if required
    const captchaButton = screen.queryByTestId('mock-captcha-button');
    if (captchaButton) {
      fireEvent.click(captchaButton);
    }
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /bericht einreichen/i });
    fireEvent.click(submitButton);
    
    // Wait for form submission
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/status-reports/submit', 
        expect.any(Object)
      );
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/bericht erfolgreich eingereicht/i)).toBeInTheDocument();
    });
    
    // Check if form was reset
    expect(titleInput).toHaveValue('');
  });

  it('handles API errors correctly', async () => {
    // Mock a failed API response for the specific test
    mockFetch.mockImplementationOnce((url) => {
      if (url.includes('/api/groups')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ groups: mockGroups })
        });
      }
      
      return Promise.resolve({
        ok: false,
        json: async () => ({ 
          success: false, 
          error: 'Ein Serverfehler ist aufgetreten' 
        })
      });
    });
    
    render(<StatusReportForm />);
    
    // Fill minimum required fields
    const titleInput = screen.getByLabelText(/Titel des Berichts/i);
    fireEvent.change(titleInput, { target: { value: 'Test Report' } });
    
    const groupSelect = screen.getByTestId('group-select');
    fireEvent.change(groupSelect, { target: { value: 'group-1' } });
    
    const contentInput = screen.getByTestId('rich-text-input');
    fireEvent.change(contentInput, { target: { value: '<p>Report content</p>' } });
    
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /bericht einreichen/i });
    fireEvent.click(submitButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/fehler beim absenden/i)).toBeInTheDocument();
      expect(screen.getByText('Ein Serverfehler ist aufgetreten')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    // Custom implementation for this test
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/groups')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ groups: mockGroups })
        });
      }
      
      // Delay the response for status report submission
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ 
              success: true, 
              statusReport: {
                id: 'report-123',
                title: 'Test Report'
              }
            })
          });
        }, 100);
      });
    });
    
    render(<StatusReportForm />);
    
    // Fill minimum required fields
    const titleInput = screen.getByLabelText(/Titel des Berichts/i);
    fireEvent.change(titleInput, { target: { value: 'Test Report' } });
    
    const groupSelect = screen.getByTestId('group-select');
    fireEvent.change(groupSelect, { target: { value: 'group-1' } });
    
    const contentInput = screen.getByTestId('rich-text-input');
    fireEvent.change(contentInput, { target: { value: '<p>Report content</p>' } });
    
    const firstNameInput = screen.getByLabelText(/Vorname/i);
    const lastNameInput = screen.getByLabelText(/Nachname/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /bericht einreichen/i });
    fireEvent.click(submitButton);
    
    // Check for loading state
    expect(screen.getByText(/wird gesendet/i)).toBeInTheDocument();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText(/bericht erfolgreich eingereicht/i)).toBeInTheDocument();
    });
  });
});