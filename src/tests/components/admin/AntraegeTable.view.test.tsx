import React from 'react';
import { render, screen } from '@testing-library/react';
import AntraegeTable from '@/components/admin/antraege/AntraegeTable';

// Mock all dialog components to avoid complex rendering
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

jest.mock('@/components/admin/antraege/DecisionDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('AntraegeTable - View Functionality', () => {
  const mockOnArchive = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockOnShowNotification = jest.fn();

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
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // Should have view icons in accordion summary
    const viewIcons = screen.getAllByTitle('Details ansehen');
    expect(viewIcons).toHaveLength(2);
  });

  it('should render view button for all antrag statuses', () => {
    const mixedAntraege = [
      { ...mockAntraege[0], status: 'NEU' as const },
      { ...mockAntraege[1], status: 'AKZEPTIERT' as const },
      { ...mockAntraege[0], id: '3', status: 'ABGELEHNT' as const },
    ];

    render(React.createElement(AntraegeTable, {
      antraege: mixedAntraege,
      currentView: 'all',
      onArchive: mockOnArchive,
      onRefresh: mockOnRefresh,
      onShowNotification: mockOnShowNotification,
      timestamp: Date.now(),
    }));

    // All should have view buttons
    const viewButtons = screen.getAllByTitle('Details ansehen');
    expect(viewButtons).toHaveLength(3);
  });
});