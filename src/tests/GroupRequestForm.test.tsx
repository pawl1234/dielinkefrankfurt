import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GroupRequestForm from '@/components/GroupRequestForm';
import '@testing-library/jest-dom';

// Mock the rich text editor
jest.mock('@/components/RichTextEditor', () => ({
  __esModule: true,
  default: ({ value, onChange, maxLength, placeholder }: { value: string; onChange: (value: string) => void; maxLength?: number; placeholder?: string }) => (
    <div data-testid="rich-text-editor">
      <textarea
        data-testid="mock-rich-text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </div>
  ),
}));

// Mock the group logo upload
jest.mock('@/components/GroupLogoUpload', () => ({
  __esModule: true,
  default: ({ onImageSelect }: { onImageSelect: (file: File, croppedFile: File) => void }) => (
    <div data-testid="group-logo-upload">
      <button
        type="button"
        data-testid="mock-upload-btn"
        onClick={() => {
          // Create mock image objects
          const originalImage = new File(['mock'], 'test-logo.png', { type: 'image/png' });
          const croppedImage = new File(['mock'], 'test-logo-cropped.png', { type: 'image/png' });
          onImageSelect(originalImage, croppedImage);
        }}
      >
        Upload Logo
      </button>
      <button
        type="button"
        data-testid="mock-remove-btn"
        onClick={() => {
          // Create empty blobs to simulate removal
          onImageSelect(new Blob([''], { type: 'text/plain' }), new Blob([''], { type: 'text/plain' }));
        }}
      >
        Remove Logo
      </button>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('GroupRequestForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, group: { id: '123', name: 'Test Group' } }),
    });
  });

  it('renders the form with all required fields', () => {
    render(<GroupRequestForm />);
    
    // Check that all major sections are rendered
    expect(screen.getByRole('heading', { name: 'Gruppeninformationen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gruppenlogo' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading')).toHaveLength(5); // Check we have 5 headings total
    
    // Check for form fields
    expect(screen.getByPlaceholderText('z.B. AG Klimagerechtigkeit')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('group-logo-upload')).toBeInTheDocument();
    
    // Check for responsible persons fields
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByText('Weitere Person hinzufügen')).toBeInTheDocument();
    expect(screen.getByText('Zurücksetzen')).toBeInTheDocument();
    expect(screen.getByText('Gruppenvorschlag senden')).toBeInTheDocument();
  });

  it('validates form fields on submission', async () => {
    render(<GroupRequestForm />);
    
    // Submit with empty form
    fireEvent.click(screen.getByText('Gruppenvorschlag senden'));
    
    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Gruppenname ist erforderlich/i)).toBeInTheDocument();
      // More validation errors should be visible
    });
  });

  it('allows adding and removing responsible persons', async () => {
    render(<GroupRequestForm />);
    
    // Add another person
    fireEvent.click(screen.getByText('Weitere Person hinzufügen'));
    
    // Check that both persons are now visible
    await waitFor(() => {
      expect(screen.getByText('Person 1')).toBeInTheDocument();
      expect(screen.getByText('Person 2')).toBeInTheDocument();
    });
    
    // Check we have multiple form fields
    const firstNameInputs = screen.getAllByLabelText(/Vorname/i);
    expect(firstNameInputs.length).toBe(2);
    
    // Remove a person
    const removeButtons = screen.getAllByRole('button', { name: '' }); // Delete icons don't have accessible names
    fireEvent.click(removeButtons[0]); // Click the first delete button
    
    // Verify one person is removed
    await waitFor(() => {
      expect(screen.queryByText('Person 2')).toBeNull();
    });
  });

  it('successfully submits the form with valid data', async () => {
    render(<GroupRequestForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('z.B. AG Klimagerechtigkeit'), {
      target: { value: 'Test Group' },
    });
    
    // Fill rich text editor
    fireEvent.change(screen.getByTestId('mock-rich-text'), {
      target: { value: 'This is a test description that is longer than 50 characters to pass validation.' },
    });
    
    // Add logo
    fireEvent.click(screen.getByTestId('mock-upload-btn'));
    
    // Fill responsible person details
    const firstNameInput = screen.getByLabelText('Vorname');
    const lastNameInput = screen.getByLabelText('Nachname');
    const emailInput = screen.getByLabelText('E-Mail');
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Gruppenvorschlag senden'));
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/groups/submit', expect.any(Object));
      expect(screen.getByText(/Vielen Dank für Ihren Vorschlag!/i)).toBeInTheDocument();
    });
  });

  it('shows error message on submission failure', async () => {
    // Mock fetch to return an error
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'Server error' }),
    });
    
    render(<GroupRequestForm />);
    
    // Fill in the form with valid data
    fireEvent.change(screen.getByPlaceholderText('z.B. AG Klimagerechtigkeit'), {
      target: { value: 'Test Group' },
    });
    
    fireEvent.change(screen.getByTestId('mock-rich-text'), {
      target: { value: 'This is a test description that is longer than 50 characters to pass validation.' },
    });
    
    const firstNameInput = screen.getByLabelText('Vorname');
    const lastNameInput = screen.getByLabelText('Nachname');
    const emailInput = screen.getByLabelText('E-Mail');
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Gruppenvorschlag senden'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Fehler beim Absenden/i)).toBeInTheDocument();
    });
  });

  it('resets the form when reset button is clicked', async () => {
    render(<GroupRequestForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('z.B. AG Klimagerechtigkeit'), {
      target: { value: 'Test Group' },
    });
    
    // Click reset button
    fireEvent.click(screen.getByText('Zurücksetzen'));
    
    // Verify form is reset
    await waitFor(() => {
      expect(screen.getByPlaceholderText('z.B. AG Klimagerechtigkeit')).toHaveValue('');
    });
  });
});