import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';
import type { AntragPurposes } from '@/types/api-types';

// Mock fetch
global.fetch = jest.fn();

// Mock ViewAntragDialog to avoid complex rendering
jest.mock('@/components/admin/antraege/ViewAntragDialog', () => ({
  __esModule: true,
  default: ({ open, onClose, antragId }: { open: boolean; onClose: () => void; antragId: string | null }) => {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'view-dialog' }, 
      React.createElement('div', null, `Viewing Antrag: ${antragId}`),
      React.createElement('button', { onClick: onClose }, 'Close Dialog')
    );
  },
}));

describe('AntraegeTable - View Functionality', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnArchive = jest.fn();

  const mockAntraege = [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      title: 'Test Antrag 1',
      summary: 'Test summary 1',
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
      title: 'Test Antrag 2',
      summary: 'Test summary 2',
      status: 'AKZEPTIERT' as const,
      purposes: JSON.stringify({
        raumbuchung: { enabled: true, location: 'Conference Room', numberOfPeople: 20, details: 'Meeting' }
      }),
      fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
      createdAt: '2024-01-02T10:00:00Z',
      updatedAt: '2024-01-02T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render view button for each antrag', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // Should have view icons in accordion summary
    const viewIcons = screen.getAllByTitle('Details ansehen');
    expect(viewIcons).toHaveLength(2);
  });

  it('should show view dialog when view button is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // Click first view button
    const viewButtons = screen.getAllByTitle('Details ansehen');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('view-dialog')).toBeInTheDocument();
      expect(screen.getByText('Viewing Antrag: 1')).toBeInTheDocument();
    });
  });

  it('should close view dialog when close is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // Open dialog
    const viewButtons = screen.getAllByTitle('Details ansehen');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('view-dialog')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByText('Close Dialog');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('view-dialog')).not.toBeInTheDocument();
    });
  });

  it('should not propagate click event when view button is clicked', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // Get accordion summary
    const accordionSummary = screen.getByText('Test Antrag 1').closest('.MuiAccordionSummary-root');
    
    // Mock expand behavior
    let expanded = false;
    accordionSummary?.addEventListener('click', () => { expanded = true; });

    // Click view button
    const viewButton = screen.getAllByTitle('Details ansehen')[0];
    fireEvent.click(viewButton);

    // Accordion should not expand
    expect(expanded).toBe(false);
  });

  it('should show "Details ansehen" button in expanded view', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // Expand first accordion
    const accordionSummary = screen.getByText('Test Antrag 1');
    fireEvent.click(accordionSummary);

    // Should see "Details ansehen" button in expanded content
    const detailsButton = screen.getByRole('button', { name: /Details ansehen/i });
    expect(detailsButton).toBeInTheDocument();
    expect(detailsButton).toHaveTextContent('Details ansehen');
  });

  it('should handle view for different antrag statuses', async () => {
    const mixedAntraege = [
      { ...mockAntraege[0], status: 'NEU' as const },
      { ...mockAntraege[1], status: 'AKZEPTIERT' as const },
      { ...mockAntraege[0], id: '3', status: 'ABGELEHNT' as const },
    ];

    render(React.createElement(AntraegeTable, {
      antraege: mixedAntraege,
      currentView: 'archived',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // All should have view buttons
    const viewButtons = screen.getAllByTitle('Details ansehen');
    expect(viewButtons).toHaveLength(3);

    // Click on rejected antrag
    fireEvent.click(viewButtons[2]);

    await waitFor(() => {
      expect(screen.getByText('Viewing Antrag: 3')).toBeInTheDocument();
    });
  });

  it('should update selected antrag when different view button is clicked', async () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: Date.now(),
    }));

    // Click first antrag
    const viewButtons = screen.getAllByTitle('Details ansehen');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Viewing Antrag: 1')).toBeInTheDocument();
    });

    // Close dialog
    fireEvent.click(screen.getByText('Close Dialog'));

    await waitFor(() => {
      expect(screen.queryByTestId('view-dialog')).not.toBeInTheDocument();
    });

    // Click second antrag
    fireEvent.click(viewButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Viewing Antrag: 2')).toBeInTheDocument();
    });
  });

  it.skip('should render view button alongside other action buttons', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]], // NEU status
      currentView: 'pending',
      onApprove: mockOnApprove,
      onReject: mockOnReject,
      onArchive: mockOnArchive,
      timestamp: '2024-01-01T00:00:00.000Z',
    }));

    // Should have view button and action buttons in summary
    expect(screen.getByTitle('Details ansehen')).toBeInTheDocument();
    expect(screen.getByText('Annehmen')).toBeInTheDocument();
    expect(screen.getByText('Ablehnen')).toBeInTheDocument();
  });
});