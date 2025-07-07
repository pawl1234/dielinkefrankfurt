import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';

// Mock all dependencies
jest.mock('../../components/forms/shared/FormBase', () => {
  return function MockFormBase({ 
    children, 
    formMethods,
    onSubmit,
    submitButtonText,
    onCancel
  }: { 
    children: React.ReactNode; 
    formMethods?: any;
    onSubmit?: (data: any) => Promise<void>;
    submitButtonText?: string;
    onCancel?: () => void;
  }) {
    return (
      <form data-testid="form-base" onSubmit={(e) => {
        e.preventDefault();
        if (onSubmit) {
          onSubmit({});
        }
      }}>
        {children}
        <div data-testid="form-controls">
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Abbrechen
            </button>
          )}
          <button type="submit">
            {submitButtonText || 'Antrag einreichen'}
          </button>
        </div>
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

// Import the component
import AntragForm from '../../components/forms/antraege/AntragForm';

const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AntragForm Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Structure', () => {
    it.skip('should render all form sections', () => {
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
  });

  describe('User Information Fields', () => {
    it.skip('should render all user information fields', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByLabelText('Vorname')).toBeInTheDocument();
      expect(screen.getByLabelText('Nachname')).toBeInTheDocument();
      expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    });

    it.skip('should mark user information fields as required', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByLabelText('Vorname')).toBeRequired();
      expect(screen.getByLabelText('Nachname')).toBeRequired();
      expect(screen.getByLabelText('E-Mail')).toBeRequired();
    });

    it.skip('should allow input in user information fields', async () => {
      renderWithTheme(<AntragForm />);
      
      const firstNameField = screen.getByLabelText('Vorname');
      const lastNameField = screen.getByLabelText('Nachname');
      const emailField = screen.getByLabelText('E-Mail');

      fireEvent.change(firstNameField, { target: { value: 'Max' } });
      fireEvent.change(lastNameField, { target: { value: 'Mustermann' } });
      fireEvent.change(emailField, { target: { value: 'max@example.com' } });

      expect(firstNameField).toHaveValue('Max');
      expect(lastNameField).toHaveValue('Mustermann');
      expect(emailField).toHaveValue('max@example.com');
    });
  });

  describe('Antrag Details Fields', () => {
    it.skip('should render title and summary fields', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByLabelText('Titel des Antrags')).toBeInTheDocument();
      expect(screen.getByLabelText('Kurze Zusammenfassung')).toBeInTheDocument();
    });

    it.skip('should mark title and summary fields as required', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByLabelText('Titel des Antrags')).toBeRequired();
      expect(screen.getByLabelText('Kurze Zusammenfassung')).toBeRequired();
    });

    it.skip('should allow input in title and summary fields', async () => {
      renderWithTheme(<AntragForm />);
      
      const titleField = screen.getByLabelText('Titel des Antrags');
      const summaryField = screen.getByLabelText('Kurze Zusammenfassung');

      fireEvent.change(titleField, { target: { value: 'Test Antrag Titel' } });
      fireEvent.change(summaryField, { target: { value: 'Dies ist eine Testzusammenfassung für den Antrag.' } });

      expect(titleField).toHaveValue('Test Antrag Titel');
      expect(summaryField).toHaveValue('Dies ist eine Testzusammenfassung für den Antrag.');
    });
  });

  describe('Character Counters', () => {
    it.skip('should display character counter for title field', async () => {
      renderWithTheme(<AntragForm />);
      
      const titleField = screen.getByLabelText('Titel des Antrags');
      
      // Initially shows 0/200
      expect(screen.getByText('0/200 Zeichen')).toBeInTheDocument();
      
      // Update with text
      fireEvent.change(titleField, { target: { value: 'Test Titel' } });
      
      await waitFor(() => {
        expect(screen.getByText('10/200 Zeichen')).toBeInTheDocument();
      });
    });

    it.skip('should display character counter for summary field', async () => {
      renderWithTheme(<AntragForm />);
      
      const summaryField = screen.getByLabelText('Kurze Zusammenfassung');
      
      // Initially shows 0/300
      expect(screen.getByText('0/300 Zeichen')).toBeInTheDocument();
      
      // Update with text
      fireEvent.change(summaryField, { target: { value: 'Test Zusammenfassung' } });
      
      await waitFor(() => {
        expect(screen.getByText('19/300 Zeichen')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should not show validation errors initially', () => {
      renderWithTheme(<AntragForm />);
      
      // No validation errors should be visible initially
      expect(screen.queryByText('Vorname ist erforderlich')).not.toBeInTheDocument();
      expect(screen.queryByText('Nachname ist erforderlich')).not.toBeInTheDocument();
      expect(screen.queryByText('E-Mail ist erforderlich')).not.toBeInTheDocument();
      expect(screen.queryByText('Titel ist erforderlich')).not.toBeInTheDocument();
      expect(screen.queryByText('Zusammenfassung ist erforderlich')).not.toBeInTheDocument();
    });

    it('should show validation errors after form submission', async () => {
      renderWithTheme(<AntragForm />);
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Vorname ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Nachname ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Zusammenfassung ist erforderlich')).toBeInTheDocument();
      });
    });

    it.skip('should validate email format', async () => {
      renderWithTheme(<AntragForm />);
      
      const emailField = screen.getByLabelText('E-Mail');
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });

      // Enter invalid email
      fireEvent.change(emailField, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Bitte geben Sie eine gültige E-Mail-Adresse ein')).toBeInTheDocument();
      });
    });

    it.skip('should validate title length constraints', async () => {
      renderWithTheme(<AntragForm />);
      
      const titleField = screen.getByLabelText('Titel des Antrags');
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });

      // Test minimum length
      fireEvent.change(titleField, { target: { value: 'ab' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Titel muss mindestens 3 Zeichen lang sein')).toBeInTheDocument();
      });
    });

    it.skip('should validate summary length constraints', async () => {
      renderWithTheme(<AntragForm />);
      
      const summaryField = screen.getByLabelText('Kurze Zusammenfassung');
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });

      // Test minimum length
      fireEvent.change(summaryField, { target: { value: 'zu kurz' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Zusammenfassung muss zwischen 10 und 300 Zeichen lang sein')).toBeInTheDocument();
      });
    });

    it.skip('should validate name fields only contain letters', async () => {
      renderWithTheme(<AntragForm />);
      
      const firstNameField = screen.getByLabelText('Vorname');
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });

      // Enter invalid characters
      fireEvent.change(firstNameField, { target: { value: 'Max123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Bitte nur Buchstaben eingeben')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
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
  });

  describe('Initial Values', () => {
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
      
      expect(screen.getByDisplayValue('Max')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mustermann')).toBeInTheDocument();
      expect(screen.getByDisplayValue('max@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Titel')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Zusammenfassung')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it.skip('should have proper form labels', () => {
      renderWithTheme(<AntragForm />);
      
      // All fields should have proper labels
      expect(screen.getByLabelText('Vorname')).toBeInTheDocument();
      expect(screen.getByLabelText('Nachname')).toBeInTheDocument();
      expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Titel des Antrags')).toBeInTheDocument();
      expect(screen.getByLabelText('Kurze Zusammenfassung')).toBeInTheDocument();
    });

    it('should have proper placeholders', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByPlaceholderText('Vorname')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nachname')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ihre.email@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('z.B. Förderung für Jugendevent, Raumnutzung für Workshop')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Beschreiben Sie kurz, worum es in Ihrem Antrag geht...')).toBeInTheDocument();
    });
  });

  describe('Placeholder Sections', () => {
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
  });
});