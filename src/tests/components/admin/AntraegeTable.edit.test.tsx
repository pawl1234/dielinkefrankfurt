import React from 'react';
import { render, screen } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';

// Mock all dialog components to avoid complex rendering
jest.mock('@/components/admin/antraege/EditAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/ViewAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/DeleteAntragDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/admin/antraege/DecisionDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AntraegeTable - Edit Functionality', () => {
  const mockOnArchive = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockOnShowNotification = jest.fn();

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
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have one edit button (only for NEU status)
    const editIcons = screen.getAllByTitle('Bearbeiten');
    expect(editIcons).toHaveLength(1);
  });

  it('should not show edit button for non-NEU status anträge', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[1]], // Only AKZEPTIERT status antrag
      currentView: 'approved',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should not have edit button for non-NEU status
    const editIcons = screen.queryAllByTitle('Bearbeiten');
    expect(editIcons).toHaveLength(0);
  });

  it('should display correct action buttons for NEU status', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[0]], // Only NEU status antrag
      currentView: 'pending',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have edit button and view button
    expect(screen.getByTitle('Bearbeiten')).toBeInTheDocument();
    expect(screen.getByTitle('Details ansehen')).toBeInTheDocument();
  });

  it('should display correct action buttons for AKZEPTIERT status', () => {
    render(React.createElement(AntraegeTable, {
      antraege: [mockAntraege[1]], // Only AKZEPTIERT status antrag
      currentView: 'approved',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have view button but no edit button
    expect(screen.getByTitle('Details ansehen')).toBeInTheDocument();
    expect(screen.queryByTitle('Bearbeiten')).not.toBeInTheDocument();
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
      currentView: 'all',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have edit buttons only for NEU status anträge
    const editButtons = screen.getAllByTitle('Bearbeiten');
    expect(editButtons).toHaveLength(2); // Two NEU status anträge
  });
});