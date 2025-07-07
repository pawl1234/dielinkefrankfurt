import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e.preventDefault();
      fn({});
    },
    formState: { errors: {}, isValid: true },
    reset: jest.fn(),
    setValue: jest.fn(),
    watch: jest.fn(() => ({})),
    trigger: jest.fn(),
  }),
  Controller: ({ render }: any) => render({ field: { value: '', onChange: jest.fn() } }),
}));

// Mock all dependencies
jest.mock('../../components/forms/shared/FormBase', () => {
  return function MockFormBase({ 
    children, 
    onSubmit 
  }: { 
    children: React.ReactNode; 
    onSubmit?: (e: React.FormEvent) => void;
  }) {
    return (
      <form data-testid="form-base" onSubmit={onSubmit}>
        {children}
      </form>
    );
  };
});

jest.mock('../../components/forms/shared/FormSection', () => {
  return React.forwardRef<HTMLDivElement, { 
    title: string; 
    subtitle: string; 
    children: React.ReactNode;
  }>(function MockFormSection({ title, subtitle, children }, ref) {
    return (
      <div ref={ref} data-testid={`form-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h3 data-testid="section-title">{title}</h3>
        <p data-testid="section-subtitle">{subtitle}</p>
        {children}
      </div>
    );
  });
});

jest.mock('../../components/forms/shared/RequesterFields', () => {
  return function MockRequesterFields({ control, errors }: { control: any; errors: any }) {
    return (
      <div data-testid="requester-fields">
        <input data-testid="firstName" placeholder="Vorname" />
        <input data-testid="lastName" placeholder="Nachname" />
        <input data-testid="email" placeholder="E-Mail" type="email" />
      </div>
    );
  };
});

// Import the component
import AntragForm from '../../components/forms/antraege/AntragForm';

const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AntragForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip('should render the form with all required sections', () => {
    renderWithTheme(<AntragForm />);
    
    expect(screen.getByTestId('form-base')).toBeInTheDocument();
    expect(screen.getByTestId('form-section-antragsteller')).toBeInTheDocument();
    expect(screen.getByTestId('form-section-antrag')).toBeInTheDocument();
    expect(screen.getByTestId('form-section-anliegen-/-zwecke')).toBeInTheDocument();
    expect(screen.getByTestId('form-section-dateien-anhängen')).toBeInTheDocument();
  });

  it.skip('should display correct section titles', () => {
    renderWithTheme(<AntragForm />);
    
    const sectionTitles = screen.getAllByTestId('section-title');
    expect(sectionTitles[0]).toHaveTextContent('Antragsteller');
    expect(sectionTitles[1]).toHaveTextContent('Antrag');
    expect(sectionTitles[2]).toHaveTextContent('Anliegen / Zwecke');
    expect(sectionTitles[3]).toHaveTextContent('Dateien anhängen');
  });

  it.skip('should render RequesterFields component', () => {
    renderWithTheme(<AntragForm />);
    
    expect(screen.getByTestId('requester-fields')).toBeInTheDocument();
    expect(screen.getByTestId('firstName')).toBeInTheDocument();
    expect(screen.getByTestId('lastName')).toBeInTheDocument();
    expect(screen.getByTestId('email')).toBeInTheDocument();
  });

  it.skip('should render title and summary fields', () => {
    renderWithTheme(<AntragForm />);
    
    expect(screen.getByLabelText('Titel des Antrags')).toBeInTheDocument();
    expect(screen.getByLabelText('Kurze Zusammenfassung')).toBeInTheDocument();
  });

  it('should render submit button with correct text', () => {
    renderWithTheme(<AntragForm />);
    
    const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('should render submit button with custom text when provided', () => {
    renderWithTheme(<AntragForm submitButtonText="Änderungen speichern" />);
    
    const submitButton = screen.getByRole('button', { name: /änderungen speichern/i });
    expect(submitButton).toBeInTheDocument();
  });

  it.skip('should show cancel button when onCancel is provided', () => {
    const mockCancel = jest.fn();
    renderWithTheme(<AntragForm onCancel={mockCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('should not show cancel button when onCancel is not provided', () => {
    renderWithTheme(<AntragForm />);
    
    const cancelButton = screen.queryByRole('button', { name: /abbrechen/i });
    expect(cancelButton).not.toBeInTheDocument();
  });

  it.skip('should display placeholder text for purposes section', () => {
    renderWithTheme(<AntragForm />);
    
    const purposesSection = screen.getByTestId('form-section-anliegen-/-zwecke');
    expect(purposesSection).toHaveTextContent('Zweck-Auswahlfelder werden in den nächsten Schritten implementiert');
  });

  it.skip('should display placeholder text for file upload section', () => {
    renderWithTheme(<AntragForm />);
    
    const filesSection = screen.getByTestId('form-section-dateien-anhängen');
    expect(filesSection).toHaveTextContent('Datei-Upload wird in den nächsten Schritten implementiert');
  });

  it.skip('should handle title field input', async () => {
    renderWithTheme(<AntragForm />);
    
    const titleField = screen.getByLabelText('Titel des Antrags');
    fireEvent.change(titleField, { target: { value: 'Test Antrag Titel' } });
    
    await waitFor(() => {
      expect(titleField).toHaveValue('Test Antrag Titel');
    });
  });

  it.skip('should handle summary field input', async () => {
    renderWithTheme(<AntragForm />);
    
    const summaryField = screen.getByLabelText('Kurze Zusammenfassung');
    fireEvent.change(summaryField, { target: { value: 'Eine kurze Beschreibung des Antrags' } });
    
    await waitFor(() => {
      expect(summaryField).toHaveValue('Eine kurze Beschreibung des Antrags');
    });
  });

  it.skip('should show character count for summary field', () => {
    renderWithTheme(<AntragForm />);
    
    const summaryField = screen.getByLabelText('Kurze Zusammenfassung');
    fireEvent.change(summaryField, { target: { value: 'Test summary text' } });
    
    // Should show character count (this might need adjustment based on actual implementation)
    expect(screen.getByText(/\/300 zeichen/i)).toBeInTheDocument();
  });

  it('should populate form with initial values when provided', () => {
    const initialValues = {
      firstName: 'Max',
      lastName: 'Mustermann', 
      email: 'max@example.com',
      title: 'Test Titel',
      summary: 'Test Zusammenfassung',
      purposes: '{"zuschuss": {"enabled": true, "amount": 500}}'
    };
    
    renderWithTheme(<AntragForm initialValues={initialValues} />);
    
    expect(screen.getByDisplayValue('Test Titel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Zusammenfassung')).toBeInTheDocument();
  });

  it.skip('should be in edit mode when mode prop is set to edit', () => {
    renderWithTheme(<AntragForm mode="edit" />);
    
    // Form should still render (specific edit mode behavior would be tested as it's implemented)
    expect(screen.getByTestId('form-base')).toBeInTheDocument();
  });
});