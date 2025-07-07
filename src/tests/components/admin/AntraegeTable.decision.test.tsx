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
    mode 
  }: { 
    open: boolean; 
    onClose: () => void; 
    onConfirm: (comment?: string) => Promise<void>;
    mode: 'accept' | 'reject';
  }) => {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'decision-dialog' }, 
      React.createElement('div', null, `Mode: ${mode}`),
      React.createElement('button', { onClick: onClose }, 'Cancel'),
      React.createElement('button', { 
        onClick: () => onConfirm('Test comment') 
      }, 'Confirm')
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

describe('AntraegeTable Decision Functionality', () => {
  const mockOnRefresh = jest.fn();
  const mockOnShowNotification = jest.fn();

  const pendingAntrag = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    title: 'Test Antrag',
    summary: 'Test summary',
    status: 'NEU' as const,
    purposes: JSON.stringify({ zuschuss: { enabled: true, amount: 100 } }),
    fileUrls: null,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  };

  const decidedAntrag = {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    title: 'Decided Antrag',
    summary: 'Decided summary',
    status: 'AKZEPTIERT' as const,
    purposes: JSON.stringify({ raumbuchung: { enabled: true } }),
    fileUrls: null,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    decisionComment: 'Already decided',
    decidedAt: '2024-01-03T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should show decision buttons for pending anträge', () => {
    render(
      <AntraegeTable
        antraege={[pendingAntrag]}
        currentView="pending"
        onRefresh={mockOnRefresh}
        onShowNotification={mockOnShowNotification}
        timestamp={Date.now()}
      />
    );

    // Expand accordion to see action buttons
    fireEvent.click(screen.getByText('Test Antrag'));

    expect(screen.getByRole('button', { name: /Annehmen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ablehnen/i })).toBeInTheDocument();
  });

  it('should not show decision buttons for decided anträge', () => {
    render(
      <AntraegeTable
        antraege={[decidedAntrag]}
        currentView="approved"
        onRefresh={mockOnRefresh}
        onShowNotification={mockOnShowNotification}
        timestamp={Date.now()}
      />
    );

    // Expand accordion
    fireEvent.click(screen.getByText('Decided Antrag'));

    expect(screen.queryByRole('button', { name: /Annehmen/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ablehnen/i })).not.toBeInTheDocument();
  });

  it('should accept an antrag successfully', async () => {
    render(
      <AntraegeTable
        antraege={[pendingAntrag]}
        currentView="pending"
        onRefresh={mockOnRefresh}
        onShowNotification={mockOnShowNotification}
        timestamp={Date.now()}
      />
    );

    // Expand and click accept
    fireEvent.click(screen.getByText('Test Antrag'));
    fireEvent.click(screen.getByRole('button', { name: /Annehmen/i }));

    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      expect(screen.getByText('Mode: accept')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionComment: 'Test comment' }),
      });
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should reject an antrag successfully', async () => {
    render(
      <AntraegeTable
        antraege={[pendingAntrag]}
        currentView="pending"
        onRefresh={mockOnRefresh}
        onShowNotification={mockOnShowNotification}
        timestamp={Date.now()}
      />
    );

    // Expand and click reject
    fireEvent.click(screen.getByText('Test Antrag'));
    fireEvent.click(screen.getByRole('button', { name: /Ablehnen/i }));

    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
      expect(screen.getByText('Mode: reject')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/1/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionComment: 'Test comment' }),
      });
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'API Error' }),
    });

    render(
      <AntraegeTable
        antraege={[pendingAntrag]}
        currentView="pending"
        onRefresh={mockOnRefresh}
        onShowNotification={mockOnShowNotification}
        timestamp={Date.now()}
      />
    );

    // Expand, click accept, and confirm
    fireEvent.click(screen.getByText('Test Antrag'));
    fireEvent.click(screen.getByRole('button', { name: /Annehmen/i }));

    await waitFor(() => {
      expect(screen.getByTestId('decision-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockOnShowNotification).toHaveBeenCalledWith('API Error', 'error');
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });
});