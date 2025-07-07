import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminAntraegePage from '@/app/admin/antraege/page';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation');

// Mock admin state hook
const mockSetPage = jest.fn();
const mockSetPageSize = jest.fn();
const mockSetItems = jest.fn();
const mockSetPaginationData = jest.fn();
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();
const mockShowNotification = jest.fn();
const mockRefreshTimestamp = jest.fn();

jest.mock('@/hooks/useAdminState', () => ({
  useAdminState: () => ({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    items: [],
    loading: false,
    error: null,
    notification: null,
    timestamp: Date.now(),
    setPage: mockSetPage,
    setPageSize: mockSetPageSize,
    setItems: mockSetItems,
    setPaginationData: mockSetPaginationData,
    setLoading: mockSetLoading,
    setError: mockSetError,
    showNotification: mockShowNotification,
    refreshTimestamp: mockRefreshTimestamp,
    closeNotification: jest.fn(),
  }),
}));

// Mock debounce hook to make tests faster
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminAntraegePage with Filters', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({ status: 'authenticated' });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
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
    render(React.createElement(AdminAntraegePage));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });
  });

  it('should fetch data with search parameter', async () => {
    render(React.createElement(AdminAntraegePage));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test+search')
      );
    });
  });

  it('should fetch data with status filter', async () => {
    render(React.createElement(AdminAntraegePage));

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    
    const neuOption = await screen.findByText('Neu');
    fireEvent.click(neuOption);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=NEU')
      );
    });
  });

  it('should reset page to 1 when filters change', async () => {
    render(React.createElement(AdminAntraegePage));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockSetPage).toHaveBeenCalledWith(1);
    });
  });

  it('should clear all filters when clear button is clicked', async () => {
    render(React.createElement(AdminAntraegePage));

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Filter zurücksetzen')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Filter zurücksetzen');
    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(mockSetPage).toHaveBeenCalledWith(1);
  });

  it('should update URL with filter parameters', async () => {
    const mockReplaceState = jest.fn();
    window.history.replaceState = mockReplaceState;

    render(React.createElement(AdminAntraegePage));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('search=test')
      );
    });
  });

  it('should show appropriate empty state message with filters', async () => {
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

    render(React.createElement(AdminAntraegePage));

    // Apply a filter
    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('Keine Anträge gefunden, die Ihren Filterkriterien entsprechen.')).toBeInTheDocument();
    });
  });


  it('should handle combined filters correctly', async () => {
    render(React.createElement(AdminAntraegePage));

    // Set search filter
    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Set status filter
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    const akzeptiertOption = await screen.findByText('Akzeptiert');
    fireEvent.click(akzeptiertOption);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=John&status=AKZEPTIERT')
      );
    });

    // Should show both filter chips
    expect(screen.getByText('Suche: "John"')).toBeInTheDocument();
    expect(screen.getByText('Status: Akzeptiert')).toBeInTheDocument();
  });

  it('should disable filters while loading', async () => {
    // Mock loading state
    jest.unmock('@/hooks/useAdminState');
    jest.mock('@/hooks/useAdminState', () => ({
      useAdminState: () => ({
            page: 1,
        pageSize: 10,
        totalPages: 1,
        items: [],
        loading: true, // Loading state
        error: null,
        notification: null,
        timestamp: Date.now(),
        setPage: jest.fn(),
        setPageSize: jest.fn(),
        setItems: jest.fn(),
        setPaginationData: jest.fn(),
        setLoading: jest.fn(),
        setError: jest.fn(),
        showNotification: jest.fn(),
        refreshTimestamp: jest.fn(),
        closeNotification: jest.fn(),
      }),
    }));

    render(React.createElement(AdminAntraegePage));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    expect(searchInput).toBeDisabled();
  });
});