import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';

// Mock EditAntragDialog to avoid complex rendering
jest.mock('@/components/admin/antraege/EditAntragDialog', () => ({
  __esModule: true,
  default: ({ 
    open, 
    onClose, 
    antragId, 
    onSuccess 
  }: { 
    open: boolean; 
    onClose: () => void; 
    antragId: string | null; 
    onSuccess?: () => void;
  }) => {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'edit-dialog' }, 
      React.createElement('div', null, `Editing Antrag: ${antragId}`),
      React.createElement('button', { onClick: onClose }, 'Close Edit Dialog'),
      React.createElement('button', { 
        onClick: () => {
          if (onSuccess) onSuccess();
          onClose();
        }
      }, 'Save Changes')
    );
  },
}));

// Mock ViewAntragDialog
jest.mock('@/components/admin/antraege/ViewAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AntraegeTable - Edit Functionality', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnArchive = jest.fn();
  const mockOnRefresh = jest.fn();

  const mockAntraege = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      title: 'Editable Antrag',
      summary: 'This can be edited',
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
      title: 'Non-Editable Antrag',
      summary: 'This cannot be edited',
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
  });

  it('should show edit button only for NEU status anträge', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Should have one edit button (only for NEU status)
    const editIcons = screen.getAllByTitle('Bearbeiten');
    expect(editIcons).toHaveLength(1);

    // Check that it's associated with the first antrag (NEU status)
    const firstAccordion = screen.getByText('Editable Antrag').closest('.MuiAccordion-root');
    const editButton = firstAccordion?.querySelector('[title="Bearbeiten"]');
    expect(editButton).toBeInTheDocument();

    // Second antrag should not have edit button
    const secondAccordion = screen.getByText('Non-Editable Antrag').closest('.MuiAccordion-root');
    const secondEditButton = secondAccordion?.querySelector('[title="Bearbeiten"]');
    expect(secondEditButton).not.toBeInTheDocument();
  });

  it('should open edit dialog when edit button is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Click edit button
    const editButton = screen.getByTitle('Bearbeiten');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
      expect(screen.getByText('Editing Antrag: 1')).toBeInTheDocument();
    });
  });

  it('should close edit dialog when close is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Open dialog
    const editButton = screen.getByTitle('Bearbeiten');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByText('Close Edit Dialog');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
    });
  });

  it('should call onRefresh when edit is successful', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Open dialog
    const editButton = screen.getByTitle('Bearbeiten');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
      expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
    });
  });

  it('should show edit button in expanded view for NEU status', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]], // Only NEU status antrag
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Expand first accordion
    const accordionSummary = screen.getByText('Editable Antrag');
    fireEvent.click(accordionSummary);

    // Should see "Bearbeiten" button in expanded content
    const editButton = screen.getByRole('button', { name: /Bearbeiten/i });
    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveTextContent('Bearbeiten');
  });

  it('should not show edit button in expanded view for non-NEU status', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[1]], // Only AKZEPTIERT status antrag
      currentView: 'approved',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Expand accordion
    const accordionSummary = screen.getByText('Non-Editable Antrag');
    fireEvent.click(accordionSummary);

    // Should not see "Bearbeiten" button
    const editButton = screen.queryByRole('button', { name: /Bearbeiten/i });
    expect(editButton).not.toBeInTheDocument();
  });

  it('should not propagate click event when edit button is clicked', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]],
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Get accordion summary
    const accordionSummary = screen.getByText('Editable Antrag').closest('.MuiAccordionSummary-root');
    
    // Mock expand behavior
    let expanded = false;
    accordionSummary?.addEventListener('click', () => { expanded = true; });

    // Click edit button
    const editButton = screen.getByTitle('Bearbeiten');
    fireEvent.click(editButton);

    // Accordion should not expand
    expect(expanded).toBe(false);
  });

  it('should handle multiple anträge with mixed statuses', () => {
    const mixedAntraege = [
      { ...mockAntraege[0], status: 'NEU' as const },
      { ...mockAntraege[1], status: 'AKZEPTIERT' as const },
      { ...mockAntraege[0], id: '3', status: 'ABGELEHNT' as const },
      { ...mockAntraege[0], id: '4', status: 'NEU' as const },
    ];

    render(React.createElement(AntraegeTable, {
      antraege: mixedAntraege,
      currentView: 'archived',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Should have edit buttons only for NEU status anträge
    const editButtons = screen.getAllByTitle('Bearbeiten');
    expect(editButtons).toHaveLength(2); // Two NEU status anträge
  });

  it('should handle edit for different antrag IDs', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: [
        { ...mockAntraege[0], id: '1' },
        { ...mockAntraege[0], id: '2', title: 'Second Antrag' },
      ],
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Click first edit button
    const editButtons = screen.getAllByTitle('Bearbeiten');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Editing Antrag: 1')).toBeInTheDocument();
    });

    // Close dialog
    fireEvent.click(screen.getByText('Close Edit Dialog'));

    await waitFor(() => {
      expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
    });

    // Click second edit button
    fireEvent.click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Editing Antrag: 2')).toBeInTheDocument();
    });
  });

  it('should render edit button alongside other action buttons', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]], // NEU status
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      timestamp: Date.now(),
    }));

    // Should have edit button and action buttons in summary
    expect(screen.getByTitle('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByTitle('Details ansehen')).toBeInTheDocument();
    expect(screen.getByText('Annehmen')).toBeInTheDocument();
    expect(screen.getByText('Ablehnen')).toBeInTheDocument();
  });

  it('should not call onRefresh if not provided', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      // onRefresh not provided
      timestamp: Date.now(),
    }));

    // Open dialog and save
    const editButton = screen.getByTitle('Bearbeiten');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should not throw error even without onRefresh
    await waitFor(() => {
      expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
    });
  });
});