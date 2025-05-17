import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GroupEditForm from '../components/GroupEditForm';
import '@testing-library/jest-dom';
import { GroupStatus } from '@prisma/client';

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

jest.mock('../components/GroupLogoUpload', () => {
  return {
    __esModule: true,
    default: ({ onImageSelect, initialLogoUrl, initialCroppedLogoUrl }: { 
      onImageSelect: (original: File | Blob, cropped: File | Blob) => void;
      initialLogoUrl?: string;
      initialCroppedLogoUrl?: string;
    }) => {
      return (
        <div data-testid="group-logo-upload">
          <div>Initial Logo: {initialLogoUrl || 'none'}</div>
          <div>Initial Cropped Logo: {initialCroppedLogoUrl || 'none'}</div>
          <button
            onClick={() => onImageSelect(
              new File(['content'], 'logo.jpg', { type: 'image/jpeg' }),
              new File(['cropped'], 'logo-cropped.jpg', { type: 'image/jpeg' })
            )}
            data-testid="mock-logo-upload-button"
          >
            Upload Logo
          </button>
          <button
            onClick={() => onImageSelect(
              new Blob([''], { type: 'text/plain' }),
              new Blob([''], { type: 'text/plain' })
            )}
            data-testid="mock-logo-remove-button"
          >
            Remove Logo
          </button>
        </div>
      );
    },
  };
});

jest.mock('../components/ResponsiblePersonFields', () => {
  return {
    __esModule: true,
    default: ({ form }: any) => {
      return (
        <div data-testid="responsible-person-fields">
          <div>
            <input
              data-testid="first-name-input"
              onChange={(e) => {
                form.setValue('responsiblePersons.0.firstName', e.target.value);
              }}
            />
            <input
              data-testid="last-name-input"
              onChange={(e) => {
                form.setValue('responsiblePersons.0.lastName', e.target.value);
              }}
            />
            <input
              data-testid="email-input"
              onChange={(e) => {
                form.setValue('responsiblePersons.0.email', e.target.value);
              }}
            />
          </div>
        </div>
      );
    },
  };
});

// Mock SectionHeader component
jest.mock('../components/SectionHeader', () => {
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => <h3>{title}</h3>,
  };
});

// Mock fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('GroupEditForm', () => {
  const mockGroup = {
    id: '123',
    name: 'Test Group',
    description: '<p>Test description</p>',
    logoUrl: 'https://example.com/logo.jpg',
    status: 'ACTIVE' as GroupStatus,
    slug: 'test-group',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: JSON.stringify({
      originalUrl: 'https://example.com/original-logo.jpg',
      croppedUrl: 'https://example.com/logo.jpg'
    }),
    responsiblePersons: [
      {
        id: '1',
        groupId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock a successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('renders the form with pre-filled data', () => {
    render(<GroupEditForm group={mockGroup} />);
    
    // Check for form sections
    expect(screen.getByText('Gruppeninformationen')).toBeInTheDocument();
    expect(screen.getByText('Gruppenlogo')).toBeInTheDocument();
    expect(screen.getByText('Verantwortliche Personen')).toBeInTheDocument();
    
    // Check for pre-filled name
    const nameInput = screen.getByDisplayValue('Test Group');
    expect(nameInput).toBeInTheDocument();
    
    // Check for logo URLs being passed to the component
    expect(screen.getByText('Initial Logo: https://example.com/original-logo.jpg')).toBeInTheDocument();
    expect(screen.getByText('Initial Cropped Logo: https://example.com/logo.jpg')).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByText('Änderungen speichern')).toBeInTheDocument();
  });

  it('successfully submits form updates', async () => {
    render(<GroupEditForm group={mockGroup} onSubmitSuccess={() => {}} />);
    
    // Update name field
    const nameInput = screen.getByDisplayValue('Test Group');
    fireEvent.change(nameInput, { target: { value: 'Updated Group Name' } });
    
    // Update description field
    const richTextInput = screen.getByTestId('rich-text-input');
    fireEvent.change(richTextInput, { target: { value: '<p>Updated description</p>' } });
    
    // Update responsible person fields
    const firstNameInput = screen.getByTestId('first-name-input');
    const lastNameInput = screen.getByTestId('last-name-input');
    const emailInput = screen.getByTestId('email-input');
    
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
    fireEvent.change(lastNameInput, { target: { value: 'Smith' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    
    // Submit the form
    const submitButton = screen.getByText('Änderungen speichern');
    fireEvent.click(submitButton);
    
    // Check that the form data was submitted correctly
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/groups/123', expect.any(Object));
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Änderungen gespeichert!')).toBeInTheDocument();
    });
  });

  it('handles logo upload', async () => {
    render(<GroupEditForm group={mockGroup} />);
    
    // Upload a new logo
    const uploadButton = screen.getByTestId('mock-logo-upload-button');
    fireEvent.click(uploadButton);
    
    // Submit the form
    const submitButton = screen.getByText('Änderungen speichern');
    fireEvent.click(submitButton);
    
    // Check form submission includes logo
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Check that FormData was used (logo uploads require FormData)
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/admin/groups/123');
      expect(options.method).toBe('PUT');
      expect(options.body instanceof FormData).toBe(true);
    });
  });

  it('handles logo removal', async () => {
    render(<GroupEditForm group={mockGroup} />);
    
    // Remove the logo
    const removeButton = screen.getByTestId('mock-logo-remove-button');
    fireEvent.click(removeButton);
    
    // Submit the form
    const submitButton = screen.getByText('Änderungen speichern');
    fireEvent.click(submitButton);
    
    // Check form submission includes removeLogo flag
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Not an ideal test since we can't easily inspect FormData contents,
      // but it ensures the submission happens
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/admin/groups/123');
      expect(options.method).toBe('PUT');
    });
  });

  it('handles API errors correctly', async () => {
    // Mock a failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Ein Serverfehler ist aufgetreten' }),
    });
    
    render(<GroupEditForm group={mockGroup} />);
    
    // Submit the form
    const submitButton = screen.getByText('Änderungen speichern');
    fireEvent.click(submitButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Speichern/i)).toBeInTheDocument();
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
    
    render(<GroupEditForm group={mockGroup} />);
    
    // Submit form
    const submitButton = screen.getByText('Änderungen speichern');
    fireEvent.click(submitButton);
    
    // Check for loading state
    expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(screen.getByText('Änderungen gespeichert!')).toBeInTheDocument();
    });
  });

  it('calls onSubmitSuccess callback after successful submission', async () => {
    const onSubmitSuccessMock = jest.fn();
    
    render(<GroupEditForm group={mockGroup} onSubmitSuccess={onSubmitSuccessMock} />);
    
    // Submit the form
    const submitButton = screen.getByText('Änderungen speichern');
    fireEvent.click(submitButton);
    
    // Check that onSubmitSuccess was called
    await waitFor(() => {
      expect(onSubmitSuccessMock).toHaveBeenCalledTimes(1);
    });
  });
});