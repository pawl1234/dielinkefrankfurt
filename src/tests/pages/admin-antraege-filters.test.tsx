import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import AdminAntraegePage from '@/app/admin/antraege/page';

// Mock dependencies
jest.mock('next-auth/react');

// Mock fetch
global.fetch = jest.fn();

describe('AdminAntraegePage Filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        totalItems: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      }),
    });
  });

  it('should render filter components', async () => {
    render(<AdminAntraegePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });
  });

  it('should show appropriate empty state message with filters', async () => {
    render(<AdminAntraegePage />);

    // Apply a filter
    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('Keine Anträge gefunden, die Ihren Filterkriterien entsprechen.')).toBeInTheDocument();
    });
  });

  it('should clear search filter when clear button is clicked', async () => {
    render(<AdminAntraegePage />);

    // Set a search filter
    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Wait for clear button to appear
    await waitFor(() => {
      expect(screen.getByText('Filter zurücksetzen')).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByText('Filter zurücksetzen');
    fireEvent.click(clearButton);

    // Verify filter is cleared
    expect(searchInput).toHaveValue('');
  });
});