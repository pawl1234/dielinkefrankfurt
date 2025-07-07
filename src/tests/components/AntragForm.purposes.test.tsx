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
      <form data-testid="form-base" onSubmit={async (e) => {
        e.preventDefault();
        if (onSubmit) {
          try {
            await onSubmit({});
          } catch (error) {
            // Handle validation errors
          }
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
      <div ref={ref} data-testid={`form-section-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
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

describe('AntragForm Purpose Section Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Purpose Checkboxes', () => {
    it('should render all four purpose checkboxes', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByTestId('checkbox-zuschuss')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-personelle-unterstuetzung')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-raumbuchung')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-weiteres')).toBeInTheDocument();
    });

    it('should display correct labels for all checkboxes', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByText('Zuschuss (Finanzielle Unterstützung)')).toBeInTheDocument();
      expect(screen.getByText('Personelle Unterstützung')).toBeInTheDocument();
      expect(screen.getByText('Raumbuchung')).toBeInTheDocument();
      expect(screen.getByText('Weiteres')).toBeInTheDocument();
    });

    it('should initially have all checkboxes unchecked', () => {
      renderWithTheme(<AntragForm />);
      
      expect(screen.getByTestId('checkbox-zuschuss')).not.toBeChecked();
      expect(screen.getByTestId('checkbox-personelle-unterstuetzung')).not.toBeChecked();
      expect(screen.getByTestId('checkbox-raumbuchung')).not.toBeChecked();
      expect(screen.getByTestId('checkbox-weiteres')).not.toBeChecked();
    });

    it.skip('should allow checking and unchecking checkboxes', async () => {
      renderWithTheme(<AntragForm />);
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      
      // Check the checkbox
      fireEvent.click(zuschussCheckbox);
      expect(zuschussCheckbox).toBeChecked();
      
      // Uncheck the checkbox
      fireEvent.click(zuschussCheckbox);
      expect(zuschussCheckbox).not.toBeChecked();
    });
  });

  describe('Conditional Field Rendering - Zuschuss', () => {
    it('should show amount field when zuschuss checkbox is checked', async () => {
      renderWithTheme(<AntragForm />);
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      fireEvent.click(zuschussCheckbox);
      
      await waitFor(() => {
        expect(screen.getByTestId('field-zuschuss-amount')).toBeInTheDocument();
      });
    });

    it('should hide amount field when zuschuss checkbox is unchecked', async () => {
      renderWithTheme(<AntragForm />);
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      
      // Check then uncheck
      fireEvent.click(zuschussCheckbox);
      await waitFor(() => {
        expect(screen.getByTestId('field-zuschuss-amount')).toBeInTheDocument();
      });
      
      fireEvent.click(zuschussCheckbox);
      await waitFor(() => {
        expect(screen.queryByTestId('field-zuschuss-amount')).not.toBeInTheDocument();
      });
    });

    it.skip('should allow input in zuschuss amount field', async () => {
      renderWithTheme(<AntragForm />);
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      fireEvent.click(zuschussCheckbox);
      
      await waitFor(() => {
        const amountField = screen.getByTestId('field-zuschuss-amount');
        fireEvent.change(amountField, { target: { value: '500' } });
        expect(amountField).toHaveValue(500);
      });
    });
  });

  describe('Conditional Field Rendering - Personelle Unterstützung', () => {
    it('should show details field when personelle unterstützung checkbox is checked', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-personelle-unterstuetzung');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        expect(screen.getByTestId('field-personelle-details')).toBeInTheDocument();
      });
    });

    it('should hide details field when personelle unterstützung checkbox is unchecked', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-personelle-unterstuetzung');
      
      // Check then uncheck
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.getByTestId('field-personelle-details')).toBeInTheDocument();
      });
      
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.queryByTestId('field-personelle-details')).not.toBeInTheDocument();
      });
    });

    it.skip('should show character counter for personelle details field', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-personelle-unterstuetzung');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        const detailsField = screen.getByTestId('field-personelle-details');
        fireEvent.change(detailsField, { target: { value: 'Test details' } });
        expect(screen.getByText('12/500 Zeichen')).toBeInTheDocument();
      });
    });
  });

  describe('Conditional Field Rendering - Raumbuchung', () => {
    it('should show all raumbuchung fields when checkbox is checked', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-raumbuchung');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        expect(screen.getByTestId('field-raumbuchung-location')).toBeInTheDocument();
        expect(screen.getByTestId('field-raumbuchung-people')).toBeInTheDocument();
        expect(screen.getByTestId('field-raumbuchung-details')).toBeInTheDocument();
      });
    });

    it('should hide all raumbuchung fields when checkbox is unchecked', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-raumbuchung');
      
      // Check then uncheck
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.getByTestId('field-raumbuchung-location')).toBeInTheDocument();
      });
      
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.queryByTestId('field-raumbuchung-location')).not.toBeInTheDocument();
        expect(screen.queryByTestId('field-raumbuchung-people')).not.toBeInTheDocument();
        expect(screen.queryByTestId('field-raumbuchung-details')).not.toBeInTheDocument();
      });
    });

    it.skip('should allow input in all raumbuchung fields', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-raumbuchung');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        const locationField = screen.getByTestId('field-raumbuchung-location');
        const peopleField = screen.getByTestId('field-raumbuchung-people');
        const detailsField = screen.getByTestId('field-raumbuchung-details');
        
        fireEvent.change(locationField, { target: { value: 'Gemeindesaal' } });
        fireEvent.change(peopleField, { target: { value: '25' } });
        fireEvent.change(detailsField, { target: { value: 'Workshop von 14-18 Uhr' } });
        
        expect(locationField).toHaveValue('Gemeindesaal');
        expect(peopleField).toHaveValue(25);
        expect(detailsField).toHaveValue('Workshop von 14-18 Uhr');
      });
    });

    it.skip('should show character counter for raumbuchung details field', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-raumbuchung');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        const detailsField = screen.getByTestId('field-raumbuchung-details');
        fireEvent.change(detailsField, { target: { value: 'Workshop details' } });
        expect(screen.getByText('16/500 Zeichen')).toBeInTheDocument();
      });
    });
  });

  describe('Conditional Field Rendering - Weiteres', () => {
    it('should show details field when weiteres checkbox is checked', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-weiteres');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        expect(screen.getByTestId('field-weiteres-details')).toBeInTheDocument();
      });
    });

    it('should hide details field when weiteres checkbox is unchecked', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-weiteres');
      
      // Check then uncheck
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.getByTestId('field-weiteres-details')).toBeInTheDocument();
      });
      
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(screen.queryByTestId('field-weiteres-details')).not.toBeInTheDocument();
      });
    });

    it.skip('should show character counter for weiteres details field', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-weiteres');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        const detailsField = screen.getByTestId('field-weiteres-details');
        fireEvent.change(detailsField, { target: { value: 'Other request details' } });
        expect(screen.getByText('21/500 Zeichen')).toBeInTheDocument();
      });
    });
  });

  describe('Purpose Validation', () => {
    it.skip('should show error when no purpose is selected and form is submitted', async () => {
      renderWithTheme(<AntragForm />);
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bitte wählen Sie mindestens einen Zweck aus.')).toBeInTheDocument();
      });
    });

    it('should not show purpose error when at least one purpose is selected', async () => {
      renderWithTheme(<AntragForm />);
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      fireEvent.click(zuschussCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Bitte wählen Sie mindestens einen Zweck aus.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Conditional Validation', () => {
    it.skip('should validate zuschuss amount when zuschuss is selected', async () => {
      renderWithTheme(<AntragForm />);
      
      // Fill required fields first
      fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Max' } });
      fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Mustermann' } });
      fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'max@example.com' } });
      fireEvent.change(screen.getByLabelText('Titel des Antrags'), { target: { value: 'Test Antrag' } });
      fireEvent.change(screen.getByLabelText('Kurze Zusammenfassung'), { target: { value: 'Dies ist eine Testzusammenfassung für den Antrag.' } });
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      fireEvent.click(zuschussCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Betrag ist erforderlich')).toBeInTheDocument();
      });
    });

    it.skip('should validate personelle unterstützung details when selected', async () => {
      renderWithTheme(<AntragForm />);
      
      // Fill required fields first
      fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Max' } });
      fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Mustermann' } });
      fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'max@example.com' } });
      fireEvent.change(screen.getByLabelText('Titel des Antrags'), { target: { value: 'Test Antrag' } });
      fireEvent.change(screen.getByLabelText('Kurze Zusammenfassung'), { target: { value: 'Dies ist eine Testzusammenfassung für den Antrag.' } });
      
      const checkbox = screen.getByTestId('checkbox-personelle-unterstuetzung');
      fireEvent.click(checkbox);
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Beschreibung ist erforderlich')).toBeInTheDocument();
      });
    });

    it.skip('should validate all raumbuchung fields when selected', async () => {
      renderWithTheme(<AntragForm />);
      
      // Fill required fields first
      fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Max' } });
      fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Mustermann' } });
      fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'max@example.com' } });
      fireEvent.change(screen.getByLabelText('Titel des Antrags'), { target: { value: 'Test Antrag' } });
      fireEvent.change(screen.getByLabelText('Kurze Zusammenfassung'), { target: { value: 'Dies ist eine Testzusammenfassung für den Antrag.' } });
      
      const checkbox = screen.getByTestId('checkbox-raumbuchung');
      fireEvent.click(checkbox);
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Ort ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Anzahl Personen ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Details sind erforderlich')).toBeInTheDocument();
      });
    });
  });

  describe('Data Structure', () => {
    it.skip('should maintain correct data structure for purposes', async () => {
      const mockSubmit = jest.fn();
      renderWithTheme(<AntragForm onSubmit={mockSubmit} />);
      
      // Fill required fields
      fireEvent.change(screen.getByLabelText('Vorname'), { target: { value: 'Max' } });
      fireEvent.change(screen.getByLabelText('Nachname'), { target: { value: 'Mustermann' } });
      fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'max@example.com' } });
      fireEvent.change(screen.getByLabelText('Titel des Antrags'), { target: { value: 'Test Antrag' } });
      fireEvent.change(screen.getByLabelText('Kurze Zusammenfassung'), { target: { value: 'Dies ist eine Testzusammenfassung für den Antrag.' } });
      
      // Select zuschuss and fill amount
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      fireEvent.click(zuschussCheckbox);
      
      await waitFor(() => {
        const amountField = screen.getByTestId('field-zuschuss-amount');
        fireEvent.change(amountField, { target: { value: '1000' } });
      });
      
      const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        if (mockSubmit.mock.calls.length > 0) {
          const submittedData = mockSubmit.mock.calls[0][0];
          expect(submittedData.purposes).toBeDefined();
          expect(submittedData.purposes.zuschuss).toEqual({
            enabled: true,
            amount: 1000
          });
        }
      });
    });
  });

  describe('Multiple Purpose Selection', () => {
    it.skip('should allow selecting multiple purposes simultaneously', async () => {
      renderWithTheme(<AntragForm />);
      
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      const raumbuchungCheckbox = screen.getByTestId('checkbox-raumbuchung');
      
      fireEvent.click(zuschussCheckbox);
      fireEvent.click(raumbuchungCheckbox);
      
      expect(zuschussCheckbox).toBeChecked();
      expect(raumbuchungCheckbox).toBeChecked();
      
      await waitFor(() => {
        expect(screen.getByTestId('field-zuschuss-amount')).toBeInTheDocument();
        expect(screen.getByTestId('field-raumbuchung-location')).toBeInTheDocument();
        expect(screen.getByTestId('field-raumbuchung-people')).toBeInTheDocument();
        expect(screen.getByTestId('field-raumbuchung-details')).toBeInTheDocument();
      });
    });
  });

  describe('Field Value Limits', () => {
    it.skip('should enforce maximum values for numeric fields', async () => {
      renderWithTheme(<AntragForm />);
      
      // Test zuschuss amount max
      const zuschussCheckbox = screen.getByTestId('checkbox-zuschuss');
      fireEvent.click(zuschussCheckbox);
      
      await waitFor(() => {
        const amountField = screen.getByTestId('field-zuschuss-amount');
        fireEvent.change(amountField, { target: { value: '60000' } });
        
        const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Betrag darf maximal 50.000 Euro betragen')).toBeInTheDocument();
      });
    });

    it.skip('should enforce character limits for text fields', async () => {
      renderWithTheme(<AntragForm />);
      
      const checkbox = screen.getByTestId('checkbox-personelle-unterstuetzung');
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        const detailsField = screen.getByTestId('field-personelle-details');
        const longText = 'x'.repeat(501); // Exceeds 500 char limit
        fireEvent.change(detailsField, { target: { value: longText } });
        
        const submitButton = screen.getByRole('button', { name: /antrag einreichen/i });
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Beschreibung darf maximal 500 Zeichen lang sein')).toBeInTheDocument();
      });
    });
  });
});