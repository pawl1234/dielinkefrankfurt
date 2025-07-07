import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../theme/theme';
import AntraegeTable from '../../../../components/admin/antraege/AntraegeTable';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPP') return '1. Januar 2024';
    if (formatStr === 'dd.MM.yyyy') return '01.01.2024';
    if (formatStr === 'PPPp') return '1. Januar 2024 um 12:00';
    return 'Mocked Date';
  }),
}));

jest.mock('date-fns/locale', () => ({
  de: {},
}));

describe('AntraegeTable', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnArchive = jest.fn();

  const mockAntrag = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    title: 'Test Antrag',
    summary: 'This is a test summary',
    purposes: JSON.stringify({
      zuschuss: {
        enabled: true,
        amount: 500
      },
      personelleUnterstuetzung: {
        enabled: false,
        details: ''
      },
      raumbuchung: {
        enabled: false,
        location: '',
        numberOfPeople: 0,
        details: ''
      },
      weiteres: {
        enabled: false,
        details: ''
      }
    }),
    fileUrls: JSON.stringify(['file1.pdf', 'file2.jpg']),
    status: 'NEU' as const,
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z'
  };

  const defaultProps = {
    antraege: [mockAntrag],
    currentView: 'pending' as const,
    onApprove: mockOnApprove,
    onReject: mockOnReject,
    onArchive: mockOnArchive,
    timestamp: Date.now()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderAntraegeTable = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <AntraegeTable {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders antrag information correctly', () => {
      renderAntraegeTable();

      // Check table row content
      expect(screen.getByText('Test Antrag')).toBeInTheDocument();
      // Use getAllByText since name and date might appear multiple times due to responsive design
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
      expect(screen.getAllByText('01.01.2024').length).toBeGreaterThan(0);
    });

    it('displays status correctly', () => {
      renderAntraegeTable();

      expect(screen.getByText('Neu')).toBeInTheDocument();
    });

    it('does not show file attachment count in table view', () => {
      renderAntraegeTable();

      // File attachments are not shown in the table view
      expect(screen.queryByText(/Datei\(en\) angehängt/)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons - Pending View', () => {
    it('shows action buttons for pending view', () => {
      renderAntraegeTable({ currentView: 'pending' });

      // Check for icon buttons by title
      expect(screen.getByTitle('Details ansehen')).toBeInTheDocument();
      expect(screen.getByTitle('Bearbeiten')).toBeInTheDocument();
      expect(screen.getByTitle('Annehmen')).toBeInTheDocument();
      expect(screen.getByTitle('Ablehnen')).toBeInTheDocument();
      expect(screen.getByTitle('Löschen')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('shows correct status for approved antrag', () => {
      const approvedAntrag = { ...mockAntrag, status: 'AKZEPTIERT' as const };
      renderAntraegeTable({ antraege: [approvedAntrag] });

      expect(screen.getByText('Angenommen')).toBeInTheDocument();
    });

    it('shows correct status for rejected antrag', () => {
      const rejectedAntrag = { ...mockAntrag, status: 'ABGELEHNT' as const };
      renderAntraegeTable({ antraege: [rejectedAntrag] });

      expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
    });
  });



  describe('Empty State', () => {
    it('renders nothing when no anträge provided', () => {
      renderAntraegeTable({ antraege: [] });

      expect(screen.queryByText('Test Antrag')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Anträge', () => {
    it('renders multiple anträge correctly', () => {
      const multipleAntraege = [
        mockAntrag,
        { ...mockAntrag, id: '2', title: 'Second Antrag', firstName: 'Jane', lastName: 'Smith' }
      ];

      renderAntraegeTable({ antraege: multipleAntraege });

      expect(screen.getByText('Test Antrag')).toBeInTheDocument();
      expect(screen.getByText('Second Antrag')).toBeInTheDocument();
      expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('renders table headers correctly', () => {
      renderAntraegeTable();

      expect(screen.getByText('Datum')).toBeInTheDocument();
      expect(screen.getByText('Titel')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Antragsteller')).toBeInTheDocument();
      expect(screen.getByText('Aktionen')).toBeInTheDocument();
    });
  });
});