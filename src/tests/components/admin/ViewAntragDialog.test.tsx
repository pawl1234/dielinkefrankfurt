import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import ViewAntragDialog from '@/components/admin/antraege/ViewAntragDialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Mock fetch
global.fetch = jest.fn();

describe('ViewAntragDialog', () => {
  const mockOnClose = jest.fn();

  const mockAntragData = {
    id: '123',
    title: 'Test Antrag',
    summary: 'Test Zusammenfassung',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@example.com',
    status: 'NEU',
    purposes: JSON.stringify({
      zuschuss: { enabled: true, amount: 500 },
      personelleUnterstuetzung: { enabled: true, details: 'Hilfe bei Veranstaltung' },
      raumbuchung: { enabled: true, location: 'Großer Saal', numberOfPeople: 100, details: 'Konferenz' },
      weiteres: { enabled: true, details: 'Zusätzliche Anforderungen' }
    }),
    fileUrls: JSON.stringify(['https://example.com/file1.pdf', 'https://example.com/file2.docx']),
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    decisionComment: null,
    decidedBy: null,
    decidedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAntragData,
    });
  });

  it('should not fetch data when closed', () => {
    render(React.createElement(ViewAntragDialog, {
      open: false,
      onClose: mockOnClose,
      antragId: '123',
    }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch and display antrag details when opened', async () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/123');

    await waitFor(() => {
      expect(screen.getByText('Test Antrag')).toBeInTheDocument();
      expect(screen.getByText('Test Zusammenfassung')).toBeInTheDocument();
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('max@example.com')).toBeInTheDocument();
    });
  });

  it('should display all enabled purposes', async () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      // Zuschuss
      expect(screen.getByText('Zuschuss (Finanzielle Unterstützung)')).toBeInTheDocument();
      expect(screen.getByText(/Betrag: 500€/)).toBeInTheDocument();
      
      // Personelle Unterstützung
      expect(screen.getByText('Personelle Unterstützung')).toBeInTheDocument();
      expect(screen.getByText('Hilfe bei Veranstaltung')).toBeInTheDocument();
      
      // Raumbuchung
      expect(screen.getByText('Raumbuchung')).toBeInTheDocument();
      expect(screen.getByText(/Ort: Großer Saal/)).toBeInTheDocument();
      expect(screen.getByText(/Anzahl Personen: 100/)).toBeInTheDocument();
      expect(screen.getByText('Konferenz')).toBeInTheDocument();
      
      // Weiteres
      expect(screen.getByText('Weiteres')).toBeInTheDocument();
      expect(screen.getByText('Zusätzliche Anforderungen')).toBeInTheDocument();
    });
  });

  it('should display file attachments with download links', async () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      expect(screen.getByText('Anhänge (2)')).toBeInTheDocument();
      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.docx')).toBeInTheDocument();
      
      const downloadLinks = screen.getAllByText('Herunterladen');
      expect(downloadLinks).toHaveLength(2);
    });
  });

  it('should display status badge correctly', async () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      const statusChip = screen.getByText('Neu');
      expect(statusChip).toBeInTheDocument();
      expect(statusChip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorWarning');
    });
  });

  it('should display decision information when available', async () => {
    const antragWithDecision = {
      ...mockAntragData,
      status: 'AKZEPTIERT',
      decisionComment: 'Antrag wurde genehmigt',
      decidedBy: 'admin@test.com',
      decidedAt: '2024-01-02T14:00:00Z',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => antragWithDecision,
    });

    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      expect(screen.getByText('Entscheidungsinformationen')).toBeInTheDocument();
      expect(screen.getByText('admin@test.com', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('Antrag wurde genehmigt', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('02.01.2024 15:00', { exact: false })).toBeInTheDocument();
    });
  });

  it('should handle loading state', async () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should handle 404 error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '999',
    }));

    await waitFor(() => {
      expect(screen.getByText('Antrag nicht gefunden')).toBeInTheDocument();
    });
  });

  it.skip('should handle general fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(React.createElement(ViewAntragDialog, {
        open: true,
        onClose: mockOnClose,
        antragId: '123',
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Ein unerwarteter Fehler ist aufgetreten')).toBeInTheDocument();
    });
  });

  it('should close dialog when close button is clicked', () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close dialog when Schließen button is clicked', async () => {
    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      const schliessenButton = screen.getByText('Schließen');
      fireEvent.click(schliessenButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not display file section when no files', async () => {
    const antragWithoutFiles = {
      ...mockAntragData,
      fileUrls: null,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => antragWithoutFiles,
    });

    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      expect(screen.queryByText('Anhänge')).not.toBeInTheDocument();
    });
  });

  it('should handle malformed JSON in purposes', async () => {
    const antragWithBadJson = {
      ...mockAntragData,
      purposes: 'invalid json',
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => antragWithBadJson,
    });

    render(React.createElement(ViewAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
    }));

    await waitFor(() => {
      // Should still render without crashing
      expect(screen.getByText('Test Antrag')).toBeInTheDocument();
      // But purposes section should be empty
      expect(screen.queryByText('💰 Zuschuss')).not.toBeInTheDocument();
    });
  });

  it.skip('should format timestamps correctly', async () => {
    await act(async () => {
      render(React.createElement(ViewAntragDialog, {
        open: true,
        onClose: mockOnClose,
        antragId: '123',
      }));
    });

    await waitFor(() => {
      // The component uses dd.MM.yyyy HH:mm format for dates
      expect(screen.getByText('01.01.2024 11:00', { exact: false })).toBeInTheDocument();
    });
  });

  it('should display correct status for different states', async () => {
    const testCases = [
      { status: 'AKZEPTIERT', label: 'Angenommen', color: 'MuiChip-colorSuccess' },
      { status: 'ABGELEHNT', label: 'Abgelehnt', color: 'MuiChip-colorError' },
    ];

    for (const testCase of testCases) {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockAntragData, status: testCase.status }),
      });

      const { rerender } = render(React.createElement(ViewAntragDialog, {
        open: true,
        onClose: mockOnClose,
        antragId: '123',
      }));

      await waitFor(() => {
        const statusChip = screen.getByText(testCase.label);
        expect(statusChip).toBeInTheDocument();
        expect(statusChip.closest('.MuiChip-root')).toHaveClass(testCase.color);
      });

      rerender(React.createElement(ViewAntragDialog, {
        open: false,
        onClose: mockOnClose,
        antragId: '123',
      }));
    }
  });
});