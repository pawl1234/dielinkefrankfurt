import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';

// Mock fetch
global.fetch = jest.fn();

// Mock DeleteAntragDialog to avoid complex rendering
jest.mock('@/components/admin/antraege/DeleteAntragDialog', () => ({
  __esModule: true,
  default: ({ 
    open, 
    onClose, 
    onConfirm, 
    antragTitle, 
    isDeleting, 
    error 
  }: { 
    open: boolean; 
    onClose: () => void; 
    onConfirm: () => void;
    antragTitle: string;
    isDeleting: boolean;
    error: string | null;
  }) => {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'delete-dialog' }, 
      React.createElement('div', null, `Deleting: ${antragTitle}`),
      React.createElement('div', null, `Is Deleting: ${isDeleting}`),
      error && React.createElement('div', null, `Error: ${error}`),
      React.createElement('button', { onClick: onClose }, 'Cancel Delete'),
      React.createElement('button', { onClick: onConfirm }, 'Confirm Delete')
    );
  },
}));

// Mock other dialogs
jest.mock('@/components/admin/antraege/ViewAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/EditAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AntraegeTable - Delete Functionality', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnArchive = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockOnShowNotification = jest.fn();

  const mockAntraege = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      title: 'First Antrag',
      summary: 'First summary',
      status: 'NEU' as const,
      purposes: JSON.stringify({
        zuschuss: { enabled: true, amount: 100 }
      }),
      fileUrls: null,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      title: 'Second Antrag',
      summary: 'Second summary',
      status: 'AKZEPTIERT' as const,
      purposes: JSON.stringify({
        raumbuchung: { enabled: true, location: 'Room A', numberOfPeople: 20, details: 'Meeting' }
      }),
      fileUrls: null,
      createdAt: '2024-01-02T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true, 
        message: 'Antrag deleted successfully',
        deletedFiles: 0
      }),
    });
  });

  it('should show delete button for all anträge', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have delete buttons for all anträge
    const deleteButtons = screen.getAllByTitle('Löschen');
    expect(deleteButtons).toHaveLength(2);
  });

  it('should open delete dialog when delete button is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Click first delete button
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
      expect(screen.getByText('Deleting: First Antrag')).toBeInTheDocument();
      expect(screen.getByText('Is Deleting: false')).toBeInTheDocument();
    });
  });

  it('should close delete dialog when cancel is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Open dialog
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    // Cancel deletion
    const cancelButton = screen.getByText('Cancel Delete');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    });
  });

  it('should perform deletion when confirmed', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Open dialog
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1', {
        method: 'DELETE',
      });
      expect(mockOnShowNotification).toHaveBeenCalledWith(
        'Antrag "First Antrag" wurde erfolgreich gelöscht.',
        'success'
      );
      expect(mockOnRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    });
  });

  it('should handle deletion error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to delete antrag' }),
    });

    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Open dialog and confirm deletion
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to delete antrag')).toBeInTheDocument();
      expect(mockOnShowNotification).toHaveBeenCalledWith(
        'Failed to delete antrag',
        'error'
      );
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Open dialog and confirm deletion
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      expect(mockOnShowNotification).toHaveBeenCalledWith(
        'Network error',
        'error'
      );
    });
  });

  it('should show loading state during deletion', async () => {
    // Mock a slow response
    let resolveDelete: (value: any) => void;
    const deletePromise = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    (global.fetch as jest.Mock).mockReturnValue(deletePromise);

    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Open dialog and confirm deletion
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Is Deleting: true')).toBeInTheDocument();
    });

    // Resolve the deletion
    resolveDelete!({
      ok: true,
      json: async () => ({ success: true, message: 'Deleted' }),
    });

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should show delete button in expanded view', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]],
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Expand first accordion
    const accordionSummary = screen.getByText('First Antrag');
    fireEvent.click(accordionSummary);

    // Should see "Löschen" button in expanded content
    const deleteButton = screen.getByRole('button', { name: /Löschen/i });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveTextContent('Löschen');
  });

  it('should not propagate click event when delete button is clicked', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]],
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Get accordion summary
    const accordionSummary = screen.getByText('First Antrag').closest('.MuiAccordionSummary-root');
    
    // Mock expand behavior
    let expanded = false;
    accordionSummary?.addEventListener('click', () => { expanded = true; });

    // Click delete button
    const deleteButton = screen.getByTitle('Löschen');
    fireEvent.click(deleteButton);

    // Accordion should not expand
    expect(expanded).toBe(false);
  });

  it('should handle deletion for different anträge', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Delete first antrag
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Deleting: First Antrag')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1', {
        method: 'DELETE',
      });
    });

    // Close dialog
    await waitFor(() => {
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    });

    // Delete second antrag
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Deleting: Second Antrag')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm Delete'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/2', {
        method: 'DELETE',
      });
    });
  });

  it('should work without onRefresh callback', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      // onRefresh not provided
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Open dialog and confirm deletion
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    // Should not throw error even without onRefresh
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1', {
        method: 'DELETE',
      });
      expect(screen.queryByTestId('delete-dialog')).not.toBeInTheDocument();
    });
  });

  it('should work without onShowNotification callback', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      // onShowNotification not provided
      timestamp: Date.now(),
    }));

    // Open dialog and confirm deletion
    const deleteButtons = screen.getAllByTitle('Löschen');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm Delete');
    fireEvent.click(confirmButton);

    // Should not throw error even without onShowNotification
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1', {
        method: 'DELETE',
      });
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });
});