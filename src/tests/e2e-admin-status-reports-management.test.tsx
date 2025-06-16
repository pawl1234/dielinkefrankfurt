// e2e-admin-status-reports-management.test.tsx - End-to-end tests for admin status reports management workflows
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminStatusReportsPage from '../components/AdminStatusReportsPage';
import StatusReportEditForm from '../components/StatusReportEditForm';
import { setupMockBlobStorage, setupMockEmailService, setupMockNextAuth, resetMockBlobStorage, resetMockEmailService } from './mock-services';
import { createMockGroup, createMockStatusReport, createMockPdfFile, createMockImageFile } from './test-utils';

// Mock React hooks
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return '/admin/status-reports';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock fetch API
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock the file upload component
jest.mock('../components/FileUpload', () => {
  return {
    __esModule: true,
    default: ({ onFilesSelect }: { onFilesSelect: (files: File[]) => void }) => {
      return (
        <div data-testid="file-upload">
          <button
            onClick={() => onFilesSelect([
              createMockPdfFile('report.pdf'),
              createMockImageFile('photo.jpg')
            ])}
            data-testid="mock-file-upload-button"
          >
            Upload Files
          </button>
        </div>
      );
    },
  };
});

// Mock rich text editor if used
jest.mock('../components/RichTextEditor', () => {
  return {
    __esModule: true,
    default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
      return (
        <div data-testid="rich-text-editor">
          <textarea
            data-testid="rich-text-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    },
  };
});

// Mock data
const mockGroup1 = createMockGroup({ 
  id: 'group-1', 
  name: 'Test Group 1', 
  status: 'ACTIVE'
});

const mockGroup2 = createMockGroup({ 
  id: 'group-2', 
  name: 'Test Group 2', 
  status: 'ACTIVE'
});

const mockStatusReports = [
  createMockStatusReport({ 
    id: 'report-1', 
    title: 'Monthly Update - June', 
    status: 'NEW',
    groupId: 'group-1',
    group: mockGroup1
  }),
  createMockStatusReport({ 
    id: 'report-2', 
    title: 'Quarterly Report', 
    status: 'ACTIVE',
    groupId: 'group-1',
    group: mockGroup1
  }),
  createMockStatusReport({ 
    id: 'report-3', 
    title: 'Special Event Report', 
    status: 'REJECTED',
    groupId: 'group-2',
    group: mockGroup2
  })
];

describe('Admin Status Report Management Workflows', () => {
  beforeAll(() => {
    // Setup mock services
    setupMockBlobStorage();
    setupMockEmailService();
    setupMockNextAuth();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the fetch responses
    mockFetch.mockImplementation((url) => {
      // For fetching status reports list
      if (url.includes('/api/admin/status-reports') && !url.includes('/api/admin/status-reports/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ statusReports: mockStatusReports })
        });
      }
      
      // For fetching groups list (used in filters)
      if (url.includes('/api/admin/groups') && !url.includes('/api/admin/groups/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ groups: [mockGroup1, mockGroup2] })
        });
      }
      
      // For fetching a specific status report
      if (url.match(/\/api\/admin\/status-reports\/report-\d+/)) {
        const reportId = url.split('/').pop();
        const report = mockStatusReports.find(r => r.id === reportId);
        return Promise.resolve({
          ok: true,
          json: async () => ({ statusReport: report })
        });
      }
      
      // Default for other operations (update, delete, etc.)
      return Promise.resolve({
        ok: true,
        json: async () => ({ 
          success: true,
          statusReport: mockStatusReports[0]
        })
      });
    });
  });

  afterEach(() => {
    resetMockBlobStorage();
    resetMockEmailService();
  });

  describe('Admin Status Reports Listing Page', () => {
    it('renders the admin status reports list page correctly', async () => {
      render(<AdminStatusReportsPage />);
      
      // Wait for status reports to load
      await waitFor(() => {
        expect(screen.getByText(/Monthly Update - June/i)).toBeInTheDocument();
        expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument();
        expect(screen.getByText(/Special Event Report/i)).toBeInTheDocument();
      });
      
      // Check for status indicators
      expect(screen.getByText(/NEW/i)).toBeInTheDocument();
      expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
      expect(screen.getByText(/REJECTED/i)).toBeInTheDocument();
      
      // Check for group names
      expect(screen.getAllByText(/Test Group 1/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Test Group 2/i)).toBeInTheDocument();
      
      // Check for action buttons
      expect(screen.getAllByText(/Bearbeiten/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Löschen/i).length).toBeGreaterThan(0);
    });
    
    it('filters status reports by status', async () => {
      render(<AdminStatusReportsPage />);
      
      // Wait for initial status reports to load
      await waitFor(() => {
        expect(screen.getByText(/Monthly Update - June/i)).toBeInTheDocument();
      });
      
      // Find and click the status filter dropdown
      const statusFilter = screen.getByLabelText(/Status/i);
      fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
      
      // Mock the filtered response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            statusReports: mockStatusReports.filter(r => r.status === 'ACTIVE') 
          })
        })
      );
      
      // Check that only active status reports are shown after re-fetch
      await waitFor(() => {
        expect(screen.queryByText(/Monthly Update - June/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument();
        expect(screen.queryByText(/Special Event Report/i)).not.toBeInTheDocument();
      });
    });
    
    it('filters status reports by group', async () => {
      render(<AdminStatusReportsPage />);
      
      // Wait for initial status reports to load
      await waitFor(() => {
        expect(screen.getByText(/Monthly Update - June/i)).toBeInTheDocument();
      });
      
      // Find and click the group filter dropdown
      const groupFilter = screen.getByLabelText(/Gruppe/i);
      fireEvent.change(groupFilter, { target: { value: 'group-2' } });
      
      // Mock the filtered response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            statusReports: mockStatusReports.filter(r => r.groupId === 'group-2') 
          })
        })
      );
      
      // Check that only status reports from the selected group are shown
      await waitFor(() => {
        expect(screen.queryByText(/Monthly Update - June/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Quarterly Report/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Special Event Report/i)).toBeInTheDocument();
      });
    });
    
    it('searches status reports by title', async () => {
      render(<AdminStatusReportsPage />);
      
      // Wait for initial status reports to load
      await waitFor(() => {
        expect(screen.getByText(/Monthly Update - June/i)).toBeInTheDocument();
      });
      
      // Find and input to the search field
      const searchInput = screen.getByPlaceholderText(/Suchen/i);
      fireEvent.change(searchInput, { target: { value: 'Quarterly' } });
      
      // Mock the search response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            statusReports: mockStatusReports.filter(r => r.title.includes('Quarterly')) 
          })
        })
      );
      
      // Trigger search (usually with a button or after delay)
      const searchButton = screen.getByText(/Suchen/i);
      fireEvent.click(searchButton);
      
      // Check that only matching status reports are shown
      await waitFor(() => {
        expect(screen.queryByText(/Monthly Update - June/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument();
        expect(screen.queryByText(/Special Event Report/i)).not.toBeInTheDocument();
      });
    });
    
    it('handles deleting a status report', async () => {
      render(<AdminStatusReportsPage />);
      
      // Wait for status reports to load
      await waitFor(() => {
        expect(screen.getByText(/Monthly Update - June/i)).toBeInTheDocument();
      });
      
      // Mock the window.confirm to always return true
      window.confirm = jest.fn().mockImplementation(() => true);
      
      // Mock the delete response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        })
      );
      
      // Get the delete button for the first report and click it
      const deleteButtons = screen.getAllByText(/Löschen/i);
      fireEvent.click(deleteButtons[0]);
      
      // Check that the confirm dialog was shown
      expect(window.confirm).toHaveBeenCalled();
      
      // Mock the updated list response after deletion
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            statusReports: mockStatusReports.slice(1) // Remove the first report
          })
        })
      );
      
      // Verify the list is refreshed and report is removed
      await waitFor(() => {
        expect(screen.queryByText(/Monthly Update - June/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument();
        expect(screen.getByText(/Special Event Report/i)).toBeInTheDocument();
      });
    });
    
    it('displays error when fetching status reports fails', async () => {
      // Mock a failed API response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Failed to fetch status reports' })
        })
      );
      
      render(<AdminStatusReportsPage />);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Statusberichte/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Report Edit Form', () => {
    it('loads and displays status report data correctly', async () => {
      const mockReport = mockStatusReports[0];
      
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load
      await waitFor(() => {
        // Check the form is populated with report data
        expect(screen.getByDisplayValue(mockReport.title)).toBeInTheDocument();
        
        // Check the content is loaded in the rich text editor
        const richTextEditor = screen.getByTestId('rich-text-input');
        expect(richTextEditor).toHaveValue(mockReport.content);
        
        // Check reporter info is displayed
        expect(screen.getByDisplayValue(mockReport.reporterFirstName)).toBeInTheDocument();
        expect(screen.getByDisplayValue(mockReport.reporterLastName)).toBeInTheDocument();
      });
    });
    
    it('updates a status report successfully', async () => {
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly Update - June')).toBeInTheDocument();
      });
      
      // Update the report title
      const titleInput = screen.getByLabelText(/Titel/i);
      fireEvent.change(titleInput, { target: { value: 'Updated Report Title' } });
      
      // Update the content
      const contentInput = screen.getByTestId('rich-text-input');
      fireEvent.change(contentInput, { target: { value: '<p>Updated report content</p>' } });
      
      // Mock the successful update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            statusReport: {
              ...mockStatusReports[0],
              title: 'Updated Report Title',
              content: '<p>Updated report content</p>'
            }
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message
      await waitFor(() => {
        expect(screen.getByText(/Statusbericht erfolgreich aktualisiert/i)).toBeInTheDocument();
      });
    });
    
    it('changes status report status from NEW to ACTIVE and sends notification', async () => {
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly Update - June')).toBeInTheDocument();
      });
      
      // Update the status to ACTIVE
      const statusSelect = screen.getByLabelText(/Status/i);
      fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
      
      // Mock the successful update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            statusReport: {
              ...mockStatusReports[0],
              status: 'ACTIVE'
            }
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message and email notification
      await waitFor(() => {
        expect(screen.getByText(/Statusbericht erfolgreich aktualisiert/i)).toBeInTheDocument();
        expect(screen.getByText(/Benachrichtigung an Gruppenverantwortliche gesendet/i)).toBeInTheDocument();
      });
    });
    
    it('changes status report status from NEW to REJECTED and sends notification', async () => {
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly Update - June')).toBeInTheDocument();
      });
      
      // Update the status to REJECTED
      const statusSelect = screen.getByLabelText(/Status/i);
      fireEvent.change(statusSelect, { target: { value: 'REJECTED' } });
      
      // Mock the successful update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            statusReport: {
              ...mockStatusReports[0],
              status: 'REJECTED'
            }
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message and email notification
      await waitFor(() => {
        expect(screen.getByText(/Statusbericht erfolgreich aktualisiert/i)).toBeInTheDocument();
        expect(screen.getByText(/Ablehnungsbenachrichtigung gesendet/i)).toBeInTheDocument();
      });
    });
    
    it('handles API errors when updating a status report', async () => {
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly Update - June')).toBeInTheDocument();
      });
      
      // Update the report title
      const titleInput = screen.getByLabelText(/Titel/i);
      fireEvent.change(titleInput, { target: { value: 'Updated Report Title' } });
      
      // Mock a failed update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: async () => ({ 
            success: false,
            error: 'Failed to update status report'
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Aktualisieren des Statusberichts/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to update status report/i)).toBeInTheDocument();
      });
    });
    
    it('uploads new files for the status report', async () => {
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly Update - June')).toBeInTheDocument();
      });
      
      // Mock the successful upload and update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            statusReport: {
              ...mockStatusReports[0],
              fileUrls: JSON.stringify([
                'https://mock-blob-storage.vercel.app/status-reports/report-1-report.pdf',
                'https://mock-blob-storage.vercel.app/status-reports/report-1-photo.jpg'
              ])
            }
          })
        })
      );
      
      // Upload files (using mock button)
      const uploadButton = screen.getByTestId('mock-file-upload-button');
      fireEvent.click(uploadButton);
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message
      await waitFor(() => {
        expect(screen.getByText(/Statusbericht erfolgreich aktualisiert/i)).toBeInTheDocument();
      });
    });
    
    it('removes existing files from the status report', async () => {
      // Mock a report with existing files
      const reportWithFiles = {
        ...mockStatusReports[0],
        fileUrls: JSON.stringify([
          'https://mock-blob-storage.vercel.app/status-reports/report-1-document1.pdf',
          'https://mock-blob-storage.vercel.app/status-reports/report-1-image1.jpg'
        ])
      };
      
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ statusReport: reportWithFiles })
        })
      );
      
      render(<StatusReportEditForm reportId="report-1" />);
      
      // Wait for report data to load with files
      await waitFor(() => {
        expect(screen.getByDisplayValue('Monthly Update - June')).toBeInTheDocument();
        expect(screen.getByText(/document1.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/image1.jpg/i)).toBeInTheDocument();
      });
      
      // Click remove button for the first file
      const removeButtons = screen.getAllByText(/Entfernen/i);
      fireEvent.click(removeButtons[0]);
      
      // Mock the successful update response with one file removed
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            statusReport: {
              ...reportWithFiles,
              fileUrls: JSON.stringify([
                'https://mock-blob-storage.vercel.app/status-reports/report-1-image1.jpg'
              ])
            }
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message and updated file list
      await waitFor(() => {
        expect(screen.getByText(/Statusbericht erfolgreich aktualisiert/i)).toBeInTheDocument();
        expect(screen.queryByText(/document1.pdf/i)).not.toBeInTheDocument();
        expect(screen.getByText(/image1.jpg/i)).toBeInTheDocument();
      });
    });
  });
});