import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AntraegeFilters from '@/components/admin/antraege/AntraegeFilters';

// Mock the useDebounce hook
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value, // Return value immediately for testing
}));

describe('AntraegeFilters', () => {
  const mockOnSearchChange = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnClearFilters = jest.fn();

  const defaultProps = {
    onSearchChange: mockOnSearchChange,
    onStatusChange: mockOnStatusChange,
    onClearFilters: mockOnClearFilters,
    currentSearch: '',
    currentStatus: 'all',
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input and status dropdown', () => {
    render(React.createElement(AntraegeFilters, defaultProps));

    expect(screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('should show current search value', () => {
    render(React.createElement(AntraegeFilters, { ...defaultProps, currentSearch: 'test search' }));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    expect(searchInput).toHaveValue('test search');
  });

  it('should show current status value', () => {
    render(React.createElement(AntraegeFilters, { ...defaultProps, currentStatus: 'NEU' }));

    const statusSelect = screen.getByLabelText('Status');
    expect(statusSelect).toHaveTextContent('Neu');
  });

  it('should call onSearchChange when search input changes', async () => {
    render(React.createElement(AntraegeFilters, defaultProps));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    await userEvent.type(searchInput, 'test');

    // Due to debouncing mock, this should be called immediately
    await waitFor(() => {
      expect(mockOnSearchChange).toHaveBeenCalledWith('test');
    });
  });

  it('should call onStatusChange when status dropdown changes', async () => {
    render(React.createElement(AntraegeFilters, defaultProps));

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);

    const neuOption = await screen.findByText('Neu');
    fireEvent.click(neuOption);

    expect(mockOnStatusChange).toHaveBeenCalledWith('NEU');
  });

  it('should show clear filters button when filters are active', () => {
    render(React.createElement(AntraegeFilters, { ...defaultProps, currentSearch: 'test' }));

    expect(screen.getByText('Filter zurücksetzen')).toBeInTheDocument();
  });

  it('should not show clear filters button when no filters are active', () => {
    render(React.createElement(AntraegeFilters, defaultProps));

    expect(screen.queryByText('Filter zurücksetzen')).not.toBeInTheDocument();
  });

  it('should call onClearFilters when clear button is clicked', () => {
    render(React.createElement(AntraegeFilters, { ...defaultProps, currentSearch: 'test' }));

    const clearButton = screen.getByText('Filter zurücksetzen');
    fireEvent.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('should display active filter chips', () => {
    render(React.createElement(AntraegeFilters, { 
      ...defaultProps, 
      currentSearch: 'John', 
      currentStatus: 'AKZEPTIERT' 
    }));

    expect(screen.getByText('Aktive Filter:')).toBeInTheDocument();
    expect(screen.getByText('Suche: "John"')).toBeInTheDocument();
    expect(screen.getByText('Status: Akzeptiert')).toBeInTheDocument();
  });

  it('should disable inputs when isLoading is true', () => {
    render(React.createElement(AntraegeFilters, { ...defaultProps, isLoading: true }));

    const searchInput = screen.getByPlaceholderText('Suche nach Titel, Zusammenfassung, Name oder E-Mail...');
    const statusSelect = screen.getByLabelText('Status');

    expect(searchInput).toBeDisabled();
    expect(statusSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
  });

  it('should render all status options', async () => {
    render(React.createElement(AntraegeFilters, defaultProps));

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);

    await waitFor(() => {
      expect(screen.getAllByText('Alle Status')).toHaveLength(2); // Select field + dropdown option
      expect(screen.getByText('Neu')).toBeInTheDocument();
      expect(screen.getByText('Akzeptiert')).toBeInTheDocument();
      expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
    });
  });
});