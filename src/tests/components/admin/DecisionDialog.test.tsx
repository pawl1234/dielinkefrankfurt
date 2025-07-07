import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DecisionDialog from '@/components/admin/antraege/DecisionDialog';

describe('DecisionDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    antragTitle: 'Test Antrag',
    mode: 'accept' as const,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('Accept Mode', () => {
    it('should render accept dialog with correct title and content', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      expect(screen.getByText('Antrag annehmen')).toBeInTheDocument();
      expect(screen.getByText('Sind Sie sicher, dass Sie folgenden Antrag annehmen möchten?')).toBeInTheDocument();
      expect(screen.getByText('Test Antrag')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annehmen/i })).toBeInTheDocument();
    });

    it('should show correct placeholder and labels for accept mode', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      expect(screen.getByLabelText('Kommentar (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Vielversprechender Antrag/)).toBeInTheDocument();
      expect(screen.getByText(/wird per E-Mail über die Annahme informiert/)).toBeInTheDocument();
    });

    it('should show accept icon and success color', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      const acceptButton = screen.getByRole('button', { name: /Annehmen/i });
      expect(acceptButton.closest('.MuiButton-root')).toHaveClass('MuiButton-containedSuccess');
    });
  });

  describe('Reject Mode', () => {
    const rejectProps = { ...defaultProps, mode: 'reject' as const };

    it('should render reject dialog with correct title and content', () => {
      render(React.createElement(DecisionDialog, rejectProps));

      expect(screen.getByText('Antrag ablehnen')).toBeInTheDocument();
      expect(screen.getByText('Sind Sie sicher, dass Sie folgenden Antrag ablehnen möchten?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ablehnen/i })).toBeInTheDocument();
    });

    it('should show correct placeholder and labels for reject mode', () => {
      render(React.createElement(DecisionDialog, rejectProps));

      expect(screen.getByLabelText('Begründung (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Leider können wir aufgrund/)).toBeInTheDocument();
      expect(screen.getByText(/wird per E-Mail über die Ablehnung informiert/)).toBeInTheDocument();
    });

    it('should show reject icon and error color', () => {
      render(React.createElement(DecisionDialog, rejectProps));

      const rejectButton = screen.getByRole('button', { name: /Ablehnen/i });
      expect(rejectButton.closest('.MuiButton-root')).toHaveClass('MuiButton-containedError');
    });
  });

  describe('Comment Handling', () => {
    it('should allow entering and updating comment', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      const commentField = screen.getByLabelText('Kommentar (optional)');
      fireEvent.change(commentField, { target: { value: 'Great proposal!' } });

      expect(commentField).toHaveValue('Great proposal!');
    });

    it('should show comment in email notification info when comment is entered', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      const commentField = screen.getByLabelText('Kommentar (optional)');
      fireEvent.change(commentField, { target: { value: 'Test comment' } });

      expect(screen.getByText(/Ihr Kommentar wird in der E-Mail enthalten sein/)).toBeInTheDocument();
    });

    it('should not show comment notification when no comment is entered', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      expect(screen.queryByText(/Ihr Kommentar wird in der E-Mail enthalten sein/)).not.toBeInTheDocument();
    });
  });

  describe('Dialog Actions', () => {
    it('should call onConfirm with comment when confirm button is clicked', async () => {
      render(React.createElement(DecisionDialog, defaultProps));

      const commentField = screen.getByLabelText('Kommentar (optional)');
      fireEvent.change(commentField, { target: { value: 'Test comment' } });

      const confirmButton = screen.getByRole('button', { name: /Annehmen/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('Test comment');
      });
    });

    it('should call onConfirm with undefined when no comment is entered', async () => {
      render(React.createElement(DecisionDialog, defaultProps));

      const confirmButton = screen.getByRole('button', { name: /Annehmen/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(undefined);
      });
    });

    it('should call onClose when cancel button is clicked', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should clear comment when dialog is closed', () => {
      const { rerender } = render(React.createElement(DecisionDialog, defaultProps));

      const commentField = screen.getByLabelText('Kommentar (optional)');
      fireEvent.change(commentField, { target: { value: 'Test comment' } });

      const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
      fireEvent.click(cancelButton);

      // Reopen dialog
      rerender(React.createElement(DecisionDialog, { ...defaultProps, open: false }));
      rerender(React.createElement(DecisionDialog, defaultProps));

      expect(screen.getByLabelText('Kommentar (optional)')).toHaveValue('');
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(React.createElement(DecisionDialog, { ...defaultProps, isLoading: true }));

      expect(screen.getAllByText('Wird angenommen...')).toHaveLength(2); // Text appears in status area and button
      expect(screen.getAllByRole('progressbar')).toHaveLength(2); // Progress indicator in status area and button
    });

    it('should disable buttons when loading', () => {
      render(React.createElement(DecisionDialog, { ...defaultProps, isLoading: true }));

      expect(screen.getByRole('button', { name: /Wird angenommen/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Abbrechen/i })).toBeDisabled();
    });

    it('should prevent dialog close when loading', () => {
      render(React.createElement(DecisionDialog, { ...defaultProps, isLoading: true }));

      // Try to close via cancel button (should not work)
      const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show internal loading state during submission', async () => {
      mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(React.createElement(DecisionDialog, defaultProps));

      const confirmButton = screen.getByRole('button', { name: /Annehmen/i });
      fireEvent.click(confirmButton);

      // Should show loading immediately
      expect(screen.getAllByText('Wird angenommen...')).toHaveLength(2);
      expect(confirmButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(React.createElement(DecisionDialog, { 
        ...defaultProps, 
        error: 'Something went wrong' 
      }));

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      const errorAlert = screen.getByText('Something went wrong').closest('.MuiAlert-root');
      expect(errorAlert).toHaveClass('MuiAlert-colorError');
    });

    it('should handle onConfirm errors gracefully', async () => {
      mockOnConfirm.mockRejectedValue(new Error('API Error'));
      
      render(React.createElement(DecisionDialog, defaultProps));

      const confirmButton = screen.getByRole('button', { name: /Annehmen/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // Should restore button state after error
      expect(confirmButton).not.toBeDisabled();
      expect(screen.queryByText('Wird angenommen...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Antrag annehmen')).toBeInTheDocument();
    });

    it('should prevent escape key close when loading', () => {
      render(React.createElement(DecisionDialog, { ...defaultProps, isLoading: true }));

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should have proper form labels', () => {
      render(React.createElement(DecisionDialog, defaultProps));

      expect(screen.getByLabelText('Kommentar (optional)')).toBeInTheDocument();
    });
  });

  describe('Without Antrag Title', () => {
    it('should render without antrag title section when not provided', () => {
      render(React.createElement(DecisionDialog, { 
        ...defaultProps, 
        antragTitle: undefined 
      }));

      expect(screen.queryByText('Antrag:')).not.toBeInTheDocument();
      expect(screen.getByText('Sind Sie sicher, dass Sie folgenden Antrag annehmen möchten?')).toBeInTheDocument();
    });
  });

  describe('Mode-specific Loading Text', () => {
    it('should show correct loading text for reject mode', () => {
      render(React.createElement(DecisionDialog, { 
        ...defaultProps, 
        mode: 'reject',
        isLoading: true 
      }));

      expect(screen.getAllByText('Wird abgelehnt...')).toHaveLength(2); // Text appears in status area and button
    });
  });
});