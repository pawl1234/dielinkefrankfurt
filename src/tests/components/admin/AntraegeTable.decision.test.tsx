import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';

// Mock fetch
global.fetch = jest.fn();

// Mock DecisionDialog to avoid complex rendering
jest.mock('@/components/admin/antraege/DecisionDialog', () => ({
  __esModule: true,
  default: ({ 
    open, 
    onClose, 
    onConfirm, 
    antragTitle, 
    mode,
    isLoading, 
    error 
  }: { 
    open: boolean; 
    onClose: () => void; 
    onConfirm: (comment?: string) => Promise<void>;
    antragTitle?: string;
    mode: 'accept' | 'reject';
    isLoading?: boolean;
    error?: string | null;
  }) => {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'decision-dialog' }, 
      React.createElement('div', null, `Mode: ${mode}`),
      React.createElement('div', null, `Title: ${antragTitle}`),
      React.createElement('div', null, `Loading: ${isLoading}`),
      error && React.createElement('div', null, `Error: ${error}`),
      React.createElement('button', { onClick: onClose }, 'Cancel Decision'),
      React.createElement('button', { 
        onClick: () => onConfirm('Test comment') 
      }, 'Confirm Decision')
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

jest.mock('@/components/admin/antraege/DeleteAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AntraegeTable - Decision Functionality', () => {
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
      decisionComment: 'Approved for good reasons',
      decidedAt: '2024-01-03T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true, 
        message: 'Decision processed successfully'
      }),
    });
  });

  describe('Decision Buttons Visibility', () => {
    it('should show accept and reject buttons for NEU status anträge', () => {
      render(React.createElement(AntraegeTable, {
        antraege: [mockAntraege[0]], // NEU status
        currentView: 'pending',
        onApprove: mockOnApprove,
        onReject: mockOnReject,
        onArchive: mockOnArchive,
        onRefresh: mockOnRefresh,
        onShowNotification: mockOnShowNotification,
        timestamp: Date.now(),
      }));

      // Expand the accordion to see buttons
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);

      // Should have 3 buttons: accordion summary, icon button in summary, and button in details
      expect(screen.getAllByRole('button', { name: /Annehmen/i })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: /Ablehnen/i })).toHaveLength(3);
    });

    it('should not show decision buttons for already decided anträge', () => {
      render(React.createElement(AntraegeTable, {
        antraege: [mockAntraege[1]], // AKZEPTIERT status
        currentView: 'approved',
        onApprove: mockOnApprove,
        onReject: mockOnReject,
        onArchive: mockOnArchive,
        onRefresh: mockOnRefresh,
        onShowNotification: mockOnShowNotification,
        timestamp: Date.now(),
      }));

      // Expand the accordion
      const accordionSummary = screen.getByText('Second Antrag');
      fireEvent.click(accordionSummary);

      expect(screen.queryByRole('button', { name: /Annehmen/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ablehnen/i })).not.toBeInTheDocument();
    });
  });

  describe('Accept Functionality', () => {
    it('should open accept decision dialog when accept button is clicked', async () => {
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

      // Expand accordion and click accept
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);

      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
        expect(screen.getByText('Mode: accept')).toBeInTheDocument();
        expect(screen.getByText('Title: First Antrag')).toBeInTheDocument();
      });
    });

    it('should call accept API when decision is confirmed', async () => {
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

      // Open dialog
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      // Confirm decision
      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decisionComment: 'Test comment' }),
        });
      });
    });

    it('should show success message and refresh after successful accept', async () => {
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

      // Open dialog and confirm
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnShowNotification).toHaveBeenCalledWith(
          'Antrag "First Antrag" wurde erfolgreich angenommen.',
          'success'
        );
        expect(mockOnRefresh).toHaveBeenCalled();
        expect(screen.queryByTestId('decision-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Reject Functionality', () => {
    it('should open reject decision dialog when reject button is clicked', async () => {
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

      // Expand accordion and click reject
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);

      // Use the detailed reject button (variant="outlined")
      const rejectButtons = screen.getAllByRole('button', { name: 'Ablehnen' });
      const rejectButton = rejectButtons.find(button => 
        button.closest('.MuiButton-outlined') || 
        button.className.includes('MuiButton-outlined')
      ) || rejectButtons[rejectButtons.length - 1];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
        expect(screen.getByText('Mode: reject')).toBeInTheDocument();
        expect(screen.getByText('Title: First Antrag')).toBeInTheDocument();
      });
    });

    it('should call reject API when decision is confirmed', async () => {
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

      // Open dialog
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed reject button (variant="outlined")
      const rejectButtons = screen.getAllByRole('button', { name: 'Ablehnen' });
      const rejectButton = rejectButtons.find(button => 
        button.closest('.MuiButton-outlined') || 
        button.className.includes('MuiButton-outlined')
      ) || rejectButtons[rejectButtons.length - 1];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      // Confirm decision
      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1/reject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ decisionComment: 'Test comment' }),
        });
      });
    });

    it('should show success message and refresh after successful reject', async () => {
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

      // Open dialog and confirm
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed reject button (variant="outlined")
      const rejectButtons = screen.getAllByRole('button', { name: 'Ablehnen' });
      const rejectButton = rejectButtons.find(button => 
        button.closest('.MuiButton-outlined') || 
        button.className.includes('MuiButton-outlined')
      ) || rejectButtons[rejectButtons.length - 1];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnShowNotification).toHaveBeenCalledWith(
          'Antrag "First Antrag" wurde erfolgreich abgelehnt.',
          'success'
        );
        expect(mockOnRefresh).toHaveBeenCalled();
        expect(screen.queryByTestId('decision-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API Error occurred' }),
      });

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

      // Open dialog and confirm
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnShowNotification).toHaveBeenCalledWith(
          'API Error occurred',
          'error'
        );
        expect(mockOnRefresh).not.toHaveBeenCalled();
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

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

      // Open dialog and confirm
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnShowNotification).toHaveBeenCalledWith(
          'Network error',
          'error'
        );
      });
    });
  });

  describe('Dialog State Management', () => {
    it('should close dialog when cancel is clicked', async () => {
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

      // Open dialog
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      // Cancel dialog
      const cancelButton = screen.getByText('Cancel Decision');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('decision-dialog')).not.toBeInTheDocument();
      });
    });

    it('should switch between accept and reject modes correctly', async () => {
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

      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);

      // Test accept mode
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByText('Mode: accept')).toBeInTheDocument();
      });

      // Close and test reject mode
      const cancelButton = screen.getByText('Cancel Decision');
      fireEvent.click(cancelButton);

      // Use the detailed reject button (variant="outlined")
      const rejectButtons = screen.getAllByRole('button', { name: 'Ablehnen' });
      const rejectButton = rejectButtons.find(button => 
        button.closest('.MuiButton-outlined') || 
        button.className.includes('MuiButton-outlined')
      ) || rejectButtons[rejectButtons.length - 1];
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText('Mode: reject')).toBeInTheDocument();
      });
    });
  });

  describe('Without Callbacks', () => {
    it('should work without onRefresh callback', async () => {
      render(React.createElement(AntraegeTable, {
        antraege: [mockAntraege[0]],
        currentView: 'pending',
        onApprove: mockOnApprove,
        onReject: mockOnReject,
        onArchive: mockOnArchive,
        // onRefresh not provided
        onShowNotification: mockOnShowNotification,
        timestamp: Date.now(),
      }));

      // Complete accept flow
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      // Should not throw error even without onRefresh
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(screen.queryByTestId('decision-dialog')).not.toBeInTheDocument();
      });
    });

    it('should work without onShowNotification callback', async () => {
      render(React.createElement(AntraegeTable, {
        antraege: [mockAntraege[0]],
        currentView: 'pending',
        onApprove: mockOnApprove,
        onReject: mockOnReject,
        onArchive: mockOnArchive,
        onRefresh: mockOnRefresh,
        // onShowNotification not provided
        timestamp: Date.now(),
      }));

      // Complete accept flow
      const accordionSummary = screen.getByText('First Antrag');
      fireEvent.click(accordionSummary);
      
      // Use the detailed accept button (variant="contained")
      const acceptButtons = screen.getAllByRole('button', { name: 'Annehmen' });
      const acceptButton = acceptButtons.find(button => 
        button.closest('.MuiButton-containedSuccess') || 
        button.className.includes('MuiButton-contained')
      ) || acceptButtons[acceptButtons.length - 1];
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Decision');
      fireEvent.click(confirmButton);

      // Should not throw error even without onShowNotification
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });
});