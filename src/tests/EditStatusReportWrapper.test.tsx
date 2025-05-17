import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditStatusReportWrapper from '../components/EditStatusReportWrapper';
import { act } from 'react-dom/test-utils';

// Mock fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
  })
) as jest.Mock;

// Mock setTimeout
jest.useFakeTimers();

// Mock the EditStatusReportForm component
jest.mock('../components/EditStatusReportForm', () => {
  return function MockEditStatusReportForm({ 
    statusReport, 
    onSubmit,
    onCancel 
  }) {
    return (
      <div data-testid="edit-status-report-form">
        <button 
          data-testid="mock-submit" 
          onClick={() => onSubmit({
            title: 'Updated Title',
            content: 'Updated Content',
            groupId: statusReport.groupId,
            reporterFirstName: statusReport.reporterFirstName,
            reporterLastName: statusReport.reporterLastName,
            status: 'published'
          }, [])}
        >
          Submit
        </button>
        <button 
          data-testid="mock-cancel" 
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    );
  };
});

const mockStatusReport = {
  id: 1,
  groupId: 'group1',
  title: 'Test Report',
  content: '<p>Test content</p>',
  reporterFirstName: 'John',
  reporterLastName: 'Doe',
  status: 'draft' as const,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  fileUrls: JSON.stringify(['https://example.com/file1.jpg'])
};

const mockComponent = <div data-testid="status-report-view">Status Report View</div>;
const mockOnEditComplete = jest.fn();

describe('EditStatusReportWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the status report component by default', () => {
    render(
      <EditStatusReportWrapper 
        statusReport={mockStatusReport} 
        onEditComplete={mockOnEditComplete}
        statusReportComponent={mockComponent}
      />
    );

    // Check if the status report view component is rendered
    expect(screen.getByTestId('status-report-view')).toBeInTheDocument();
    
    // Check if the edit button is rendered
    expect(screen.getByRole('button', { name: 'Bearbeiten' })).toBeInTheDocument();
    
    // Edit form should not be visible
    expect(screen.queryByTestId('edit-status-report-form')).not.toBeInTheDocument();
  });

  it('shows the edit form when edit button is clicked', () => {
    render(
      <EditStatusReportWrapper 
        statusReport={mockStatusReport} 
        onEditComplete={mockOnEditComplete}
        statusReportComponent={mockComponent}
      />
    );

    // Click the edit button
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    
    // Edit form should now be visible
    expect(screen.getByTestId('edit-status-report-form')).toBeInTheDocument();
    
    // Status report view component should not be visible
    expect(screen.queryByTestId('status-report-view')).not.toBeInTheDocument();
  });

  it('handles form submission correctly', async () => {
    render(
      <EditStatusReportWrapper 
        statusReport={mockStatusReport} 
        onEditComplete={mockOnEditComplete}
        statusReportComponent={mockComponent}
      />
    );

    // Click the edit button
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    
    // Submit the form
    fireEvent.click(screen.getByTestId('mock-submit'));
    
    // Check if fetch was called with correct data
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/status-reports',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.any(FormData)
      })
    );
    
    // Fast-forward timers to trigger onEditComplete
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Check if onEditComplete was called
    expect(mockOnEditComplete).toHaveBeenCalled();
  });

  it('handles form cancellation correctly', () => {
    render(
      <EditStatusReportWrapper 
        statusReport={mockStatusReport} 
        onEditComplete={mockOnEditComplete}
        statusReportComponent={mockComponent}
      />
    );

    // Click the edit button
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    
    // Cancel the form
    fireEvent.click(screen.getByTestId('mock-cancel'));
    
    // Check if the status report view component is rendered again
    expect(screen.getByTestId('status-report-view')).toBeInTheDocument();
    
    // Edit form should not be visible
    expect(screen.queryByTestId('edit-status-report-form')).not.toBeInTheDocument();
  });

  it('handles API errors correctly', async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      })
    );

    render(
      <EditStatusReportWrapper 
        statusReport={mockStatusReport} 
        onEditComplete={mockOnEditComplete}
        statusReportComponent={mockComponent}
      />
    );

    // Click the edit button
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));
    
    // Submit the form
    fireEvent.click(screen.getByTestId('mock-submit'));
    
    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
    
    // Edit form should still be visible
    expect(screen.getByTestId('edit-status-report-form')).toBeInTheDocument();
  });
});