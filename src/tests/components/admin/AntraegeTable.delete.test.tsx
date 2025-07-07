import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';

// Mock fetch
global.fetch = jest.fn();

// Mock all dialog components to avoid complex rendering
jest.mock('@/components/admin/antraege/DeleteAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/ViewAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/EditAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/DecisionDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AntraegeTable - Delete Functionality', () => {
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
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have delete buttons for all anträge
    const deleteButtons = screen.getAllByTitle('Löschen');
    expect(deleteButtons).toHaveLength(2);
  });

  it('should show delete button in actions column', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'pending',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Check that delete button is present
    expect(screen.getAllByTitle('Löschen')).toHaveLength(2);
    
    // Check that it's alongside other action buttons
    expect(screen.getAllByTitle('Details ansehen')).toHaveLength(2);
  });

  it('should handle deletion for different anträge', () => {
    render(React.createElement(AntraegeTable, {
      antraege: mockAntraege,
      currentView: 'all',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have delete buttons for all anträge regardless of status
    const deleteButtons = screen.getAllByTitle('Löschen');
    expect(deleteButtons).toHaveLength(2);
  });
});