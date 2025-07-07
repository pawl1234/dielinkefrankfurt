import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfigurationDialog from '@/components/admin/antraege/ConfigurationDialog';

// Mock fetch
global.fetch = jest.fn();

describe('ConfigurationDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnShowNotification = jest.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    onShowNotification: mockOnShowNotification,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        recipientEmails: 'admin@test.com,kreisvorstand@test.com',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('should render dialog with correct title and content', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByText('E-Mail-Empfänger konfigurieren')).toBeInTheDocument();
      });

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Konfigurieren Sie die E-Mail-Adressen, die bei neuen Anträgen benachrichtigt werden sollen.')).toBeInTheDocument();
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
      });
    });

    it('should not render when closed', () => {
      render(React.createElement(ConfigurationDialog, { ...defaultProps, open: false }));

      expect(screen.queryByText('E-Mail-Empfänger konfigurieren')).not.toBeInTheDocument();
    });

    it('should show close button', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('close')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Loading', () => {
    it('should fetch and display current configuration', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/configuration');
      });

      await waitFor(() => {
        const emailField = screen.getByLabelText('E-Mail-Empfänger');
        expect(emailField).toHaveValue('admin@test.com,kreisvorstand@test.com');
      });
    });

    it('should show loading state while fetching configuration', () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByText('Ein unerwarteter Fehler ist aufgetreten')).toBeInTheDocument();
      });
    });

    it('should use default configuration when none exists (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        const emailField = screen.getByLabelText('E-Mail-Empfänger');
        expect(emailField).toHaveValue('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate email addresses in real-time', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      
      // Clear and enter invalid email
      fireEvent.change(emailField, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(screen.getByText(/Ungültige E-Mail-Adresse: invalid-email/)).toBeInTheDocument();
      });

      // Save button should be disabled
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    });

    it('should show valid emails as chips', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      
      fireEvent.change(emailField, { target: { value: 'test@example.com, admin@test.org' } });

      await waitFor(() => {
        expect(screen.getByText('Gültige E-Mail-Adressen (2):')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('admin@test.org')).toBeInTheDocument();
      });
    });

    it('should require at least one email address', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      
      fireEvent.change(emailField, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
      });
    });

    it('should accept valid email formats', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      
      fireEvent.change(emailField, { target: { value: 'test@example.com, admin@test-domain.org, user+tag@sub.domain.co.uk' } });

      await waitFor(() => {
        expect(screen.getByText('Gültige E-Mail-Adressen (3):')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Speichern' })).not.toBeDisabled();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should call onSave when save button is clicked', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'new@test.com, another@test.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('new@test.com, another@test.com');
      });
    });

    it('should show loading state during save', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      expect(screen.getByText('Wird gespeichert...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should show success message after save', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com, admin@test.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Konfiguration erfolgreich gespeichert!')).toBeInTheDocument();
      });

      expect(mockOnShowNotification).toHaveBeenCalledWith(
        'E-Mail-Konfiguration wurde erfolgreich gespeichert. 2 Empfänger konfiguriert.',
        'success'
      );
    });

    it('should handle save errors', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnShowNotification).toHaveBeenCalledWith('Save failed', 'error');
      });
    });

    it('should not save with validation errors', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'invalid-email' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Actions', () => {
    it('should call onClose when cancel button is clicked', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close icon is clicked', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('close')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent closing during save operation', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      expect(cancelButton).toBeDisabled();

      const closeButton = screen.getByLabelText('close');
      expect(closeButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should reset form state on close', async () => {
      const { rerender } = render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'changed@example.com' } });

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      fireEvent.click(cancelButton);

      // Reopen dialog
      rerender(React.createElement(ConfigurationDialog, { ...defaultProps, open: false }));
      rerender(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        const newEmailField = screen.getByLabelText('E-Mail-Empfänger');
        expect(newEmailField).toHaveValue('admin@test.com,kreisvorstand@test.com');
      });
    });
  });

  describe('Help Text and Information', () => {
    it('should show help text for email input', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByText('Mehrere E-Mail-Adressen durch Kommas trennen')).toBeInTheDocument();
      });
    });

    it('should show information alert', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByText(/Diese E-Mail-Adressen erhalten automatisch eine Benachrichtigung/)).toBeInTheDocument();
      });
    });

    it('should show instructions', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByText(/Geben Sie mehrere E-Mail-Adressen durch Kommas getrennt ein/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper form labels', async () => {
      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });
    });

    it('should prevent escape key close when saving', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(React.createElement(ConfigurationDialog, defaultProps));

      await waitFor(() => {
        expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
      });

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });
});