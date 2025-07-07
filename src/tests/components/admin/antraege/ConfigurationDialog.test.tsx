import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConfigurationDialog from '@/components/admin/antraege/ConfigurationDialog';

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

  const renderDialog = (props = {}) => {
    return render(React.createElement(ConfigurationDialog, { ...defaultProps, ...props }));
  };

  const waitForDialogLoad = async () => {
    await waitFor(() => {
      expect(screen.getByLabelText('E-Mail-Empfänger')).toBeInTheDocument();
    });
  };

  describe('Core Functionality', () => {
    it('should render dialog when open', async () => {
      renderDialog();
      
      await waitFor(() => {
        expect(screen.getByText('E-Mail-Empfänger konfigurieren')).toBeInTheDocument();
      });
      
      await waitForDialogLoad();
    });

    it('should not render when closed', () => {
      renderDialog({ open: false });
      
      expect(screen.queryByText('E-Mail-Empfänger konfigurieren')).not.toBeInTheDocument();
    });

    it('should load and display configuration', async () => {
      renderDialog();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/configuration');
      });

      await waitFor(() => {
        const emailField = screen.getByLabelText('E-Mail-Empfänger');
        expect(emailField).toHaveValue('admin@test.com,kreisvorstand@test.com');
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderDialog();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should use defaults when no configuration exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      renderDialog();

      await waitFor(() => {
        const emailField = screen.getByLabelText('E-Mail-Empfänger');
        expect(emailField).toHaveValue('admin@die-linke-frankfurt.de,kreisvorstand@die-linke-frankfurt.de');
      });
    });

    it('should validate email addresses', async () => {
      renderDialog();
      await waitForDialogLoad();

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      
      // Test invalid email
      fireEvent.change(emailField, { target: { value: 'invalid-email' } });

      await waitFor(() => {
        expect(screen.getByText(/Ungültige E-Mail-Adresse: invalid-email/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
      });

      // Test valid emails
      fireEvent.change(emailField, { target: { value: 'test@example.com, admin@test.org' } });

      await waitFor(() => {
        expect(screen.getByText('Gültige E-Mail-Adressen (2):')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Speichern' })).not.toBeDisabled();
      });
    });

    it('should save configuration', async () => {
      renderDialog();
      await waitForDialogLoad();

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'new@test.com, another@test.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('new@test.com, another@test.com');
      });
    });

    it('should handle save errors', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      renderDialog();
      await waitForDialogLoad();

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnShowNotification).toHaveBeenCalledWith('Save failed', 'error');
      });
    });

    it('should close dialog when cancel clicked', async () => {
      renderDialog();
      await waitForDialogLoad();

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent closing during save', async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderDialog();
      await waitForDialogLoad();

      const emailField = screen.getByLabelText('E-Mail-Empfänger');
      fireEvent.change(emailField, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(saveButton);

      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

  });
});