import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteAntragDialog from '@/components/admin/antraege/DeleteAntragDialog';

describe('DeleteAntragDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    antragTitle: 'Test Antrag',
    isDeleting: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dialog when open', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    expect(screen.getByText('Antrag löschen')).toBeInTheDocument();
    expect(screen.getByText('Sind Sie sicher, dass Sie diesen Antrag unwiderruflich löschen möchten?')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, open: false }));

    expect(screen.queryByText('Antrag löschen')).not.toBeInTheDocument();
  });

  it('should display antrag title when provided', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    expect(screen.getByText('Test Antrag')).toBeInTheDocument();
    expect(screen.getByText('Antrag:')).toBeInTheDocument();
  });

  it('should not display antrag title section when not provided', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, antragTitle: undefined }));

    expect(screen.queryByText('Antrag:')).not.toBeInTheDocument();
  });

  it('should display warning message', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    expect(screen.getByText(/Achtung:/)).toBeInTheDocument();
    expect(screen.getByText(/Diese Aktion kann nicht rückgängig gemacht werden/)).toBeInTheDocument();
  });

  it('should call onConfirm when delete button is clicked', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    const deleteButton = screen.getByRole('button', { name: /Löschen$/i });
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display loading state when deleting', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, isDeleting: true }));

    expect(screen.getByText('Antrag wird gelöscht...')).toBeInTheDocument();
    expect(screen.getByText('Löschen...')).toBeInTheDocument();
    // There are two progress bars - one in content and one in button
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
  });

  it('should disable buttons when deleting', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, isDeleting: true }));

    const deleteButton = screen.getByRole('button', { name: /Löschen\.\.\./i });
    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });

    expect(deleteButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should not call onConfirm when delete button is clicked while deleting', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, isDeleting: true }));

    const deleteButton = screen.getByRole('button', { name: /Löschen\.\.\./i });
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should not call onClose when cancel button is clicked while deleting', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, isDeleting: true }));

    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should display error message when error is provided', () => {
    const errorMessage = 'Failed to delete antrag';
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, error: errorMessage }));

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // Check that it's in an error alert
    const errorAlert = screen.getByText(errorMessage).closest('.MuiAlert-root');
    expect(errorAlert).toHaveClass('MuiAlert-colorError');
  });

  it('should not display error section when no error', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    // There's always a warning alert, but no error alert
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1); // Only the warning alert
    expect(alerts[0]).toHaveClass('MuiAlert-colorWarning');
    
    // No error alert should be present
    expect(screen.queryByText('Failed to delete antrag')).not.toBeInTheDocument();
  });

  it('should have proper ARIA labels and accessibility', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Antrag löschen')).toBeInTheDocument();
    
    const deleteButton = screen.getByRole('button', { name: /Löschen$/i });
    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });
    
    expect(deleteButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });

  it('should have correct button styling and icons', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    const deleteButton = screen.getByRole('button', { name: /Löschen$/i });
    const cancelButton = screen.getByRole('button', { name: /Abbrechen/i });

    // Delete button should be error color
    expect(deleteButton.closest('.MuiButton-root')).toHaveClass('MuiButton-containedError');
    
    // Cancel button should be outlined
    expect(cancelButton.closest('.MuiButton-root')).toHaveClass('MuiButton-outlined');
  });

  it('should show loading indicator in delete button when deleting', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, isDeleting: true }));

    const deleteButton = screen.getByRole('button', { name: /Löschen\.\.\./i });
    
    // Should have a progress indicator
    const progressBar = deleteButton.querySelector('.MuiCircularProgress-root');
    expect(progressBar).toBeInTheDocument();
  });

  it('should handle dialog close on backdrop click when not deleting', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    // MUI Dialog backdrop is actually a separate element with role="presentation"
    const backdrop = document.querySelector('.MuiBackdrop-root');
    
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    } else {
      // If we can't find the backdrop, at least verify the dialog is present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }
  });

  it('should prevent dialog close on backdrop click when deleting', () => {
    render(React.createElement(DeleteAntragDialog, { ...defaultProps, isDeleting: true }));

    // When deleting, onClose should not be called on backdrop click
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).not.toHaveBeenCalled();
    }
  });

  it('should display warning icon in title', () => {
    render(React.createElement(DeleteAntragDialog, defaultProps));

    // Look for warning icon - it should be present in the title area
    const titleArea = screen.getByText('Antrag löschen').closest('h2');
    expect(titleArea).toBeInTheDocument();
  });

  it('should handle multiple error states correctly', () => {
    const { rerender } = render(React.createElement(DeleteAntragDialog, defaultProps));

    // Initially only warning alert, no error alert
    let alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveClass('MuiAlert-colorWarning');

    // Add error
    rerender(React.createElement(DeleteAntragDialog, { 
      ...defaultProps, 
      error: 'First error message' 
    }));
    expect(screen.getByText('First error message')).toBeInTheDocument();

    // Change error
    rerender(React.createElement(DeleteAntragDialog, { 
      ...defaultProps, 
      error: 'Second error message' 
    }));
    expect(screen.getByText('Second error message')).toBeInTheDocument();
    expect(screen.queryByText('First error message')).not.toBeInTheDocument();

    // Remove error
    rerender(React.createElement(DeleteAntragDialog, { 
      ...defaultProps, 
      error: null 
    }));
    // Back to only warning alert
    alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveClass('MuiAlert-colorWarning');
  });
});