// e2e-admin-group-management.test.tsx - End-to-end tests for admin group management workflows
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdminGroupsPage from '../components/AdminGroupsPage';
import GroupEditForm from '../components/GroupEditForm';
import { setupMockBlobStorage, setupMockEmailService, setupMockNextAuth, resetMockBlobStorage, resetMockEmailService } from './mock-services';
import { createMockGroup, createMockImageFile } from './test-utils';

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
    return '/admin/groups';
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
    default: ({ onFilesSelect }: { onFilesSelect: (files: any[]) => void }) => {
      return (
        <div data-testid="file-upload">
          <button
            onClick={() => onFilesSelect([createMockImageFile()])}
            data-testid="mock-file-upload-button"
          >
            Upload Logo
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
const mockGroups = [
  createMockGroup({ 
    id: 'group-1', 
    name: 'Test Group 1', 
    status: 'NEW',
    responsiblePersons: [
      {
        id: 'person-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        groupId: 'group-1'
      }
    ]
  }),
  createMockGroup({ 
    id: 'group-2', 
    name: 'Test Group 2', 
    status: 'ACTIVE',
    responsiblePersons: [
      {
        id: 'person-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        groupId: 'group-2'
      }
    ]
  }),
  createMockGroup({ 
    id: 'group-3', 
    name: 'Test Group 3', 
    status: 'REJECTED',
    responsiblePersons: [
      {
        id: 'person-3',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        groupId: 'group-3'
      }
    ]
  })
];

describe('Admin Group Management Workflows', () => {
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
      // For fetching groups list
      if (url.includes('/api/admin/groups') && !url.includes('/api/admin/groups/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ groups: mockGroups })
        });
      }
      
      // For fetching a specific group
      if (url.match(/\/api\/admin\/groups\/group-\d+/)) {
        const groupId = url.split('/').pop();
        const group = mockGroups.find(g => g.id === groupId);
        return Promise.resolve({
          ok: true,
          json: async () => ({ group })
        });
      }
      
      // Default for other operations (create, update, etc.)
      return Promise.resolve({
        ok: true,
        json: async () => ({ 
          success: true,
          group: mockGroups[0]
        })
      });
    });
  });

  afterEach(() => {
    resetMockBlobStorage();
    resetMockEmailService();
  });

  describe('Admin Groups Listing Page', () => {
    it('renders the admin groups list page correctly', async () => {
      render(<AdminGroupsPage />);
      
      // Wait for groups to load
      await waitFor(() => {
        expect(screen.getByText(/Test Group 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Group 2/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Group 3/i)).toBeInTheDocument();
      });
      
      // Check for status indicators
      expect(screen.getByText(/NEW/i)).toBeInTheDocument();
      expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
      expect(screen.getByText(/REJECTED/i)).toBeInTheDocument();
      
      // Check for action buttons
      expect(screen.getAllByText(/Bearbeiten/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Löschen/i).length).toBeGreaterThan(0);
    });
    
    it('filters groups by status', async () => {
      render(<AdminGroupsPage />);
      
      // Wait for initial groups to load
      await waitFor(() => {
        expect(screen.getByText(/Test Group 1/i)).toBeInTheDocument();
      });
      
      // Find and click the status filter dropdown
      const statusFilter = screen.getByLabelText(/Status/i);
      fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
      
      // Mock the filtered response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            groups: mockGroups.filter(g => g.status === 'ACTIVE') 
          })
        })
      );
      
      // Check that only active groups are shown after re-fetch
      await waitFor(() => {
        expect(screen.queryByText(/Test Group 1/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Test Group 2/i)).toBeInTheDocument();
        expect(screen.queryByText(/Test Group 3/i)).not.toBeInTheDocument();
      });
    });
    
    it('searches groups by name', async () => {
      render(<AdminGroupsPage />);
      
      // Wait for initial groups to load
      await waitFor(() => {
        expect(screen.getByText(/Test Group 1/i)).toBeInTheDocument();
      });
      
      // Find and input to the search field
      const searchInput = screen.getByPlaceholderText(/Suchen/i);
      fireEvent.change(searchInput, { target: { value: 'Group 1' } });
      
      // Mock the search response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            groups: mockGroups.filter(g => g.name.includes('Group 1')) 
          })
        })
      );
      
      // Trigger search (usually with a button or after delay)
      const searchButton = screen.getByText(/Suchen/i);
      fireEvent.click(searchButton);
      
      // Check that only matching groups are shown
      await waitFor(() => {
        expect(screen.getByText(/Test Group 1/i)).toBeInTheDocument();
        expect(screen.queryByText(/Test Group 2/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Test Group 3/i)).not.toBeInTheDocument();
      });
    });
    
    it('handles deleting a group', async () => {
      render(<AdminGroupsPage />);
      
      // Wait for groups to load
      await waitFor(() => {
        expect(screen.getByText(/Test Group 1/i)).toBeInTheDocument();
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
      
      // Get the delete button for the first group and click it
      const deleteButtons = screen.getAllByText(/Löschen/i);
      fireEvent.click(deleteButtons[0]);
      
      // Check that the confirm dialog was shown
      expect(window.confirm).toHaveBeenCalled();
      
      // Mock the updated list response after deletion
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            groups: mockGroups.slice(1) // Remove the first group
          })
        })
      );
      
      // Verify the list is refreshed and group is removed
      await waitFor(() => {
        expect(screen.queryByText(/Test Group 1/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Test Group 2/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Group 3/i)).toBeInTheDocument();
      });
    });
    
    it('displays error when fetching groups fails', async () => {
      // Mock a failed API response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Failed to fetch groups' })
        })
      );
      
      render(<AdminGroupsPage />);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Laden der Gruppen/i)).toBeInTheDocument();
      });
    });
  });

  describe('Group Edit Form', () => {
    it('loads and displays group data correctly', async () => {
      const mockGroup = mockGroups[0];
      
      render(<GroupEditForm groupId="group-1" />);
      
      // Wait for group data to load
      await waitFor(() => {
        // Check the form is populated with group data
        expect(screen.getByDisplayValue(mockGroup.name)).toBeInTheDocument();
        
        // Check responsible person data is displayed
        const responsiblePerson = mockGroup.responsiblePersons[0];
        expect(screen.getByDisplayValue(responsiblePerson.firstName)).toBeInTheDocument();
        expect(screen.getByDisplayValue(responsiblePerson.lastName)).toBeInTheDocument();
        expect(screen.getByDisplayValue(responsiblePerson.email)).toBeInTheDocument();
      });
    });
    
    it('updates a group successfully', async () => {
      render(<GroupEditForm groupId="group-1" />);
      
      // Wait for group data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Group 1')).toBeInTheDocument();
      });
      
      // Update the group name
      const nameInput = screen.getByLabelText(/Name der Gruppe/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Group Name' } });
      
      // Update the description
      const descriptionInput = screen.getByTestId('rich-text-input');
      fireEvent.change(descriptionInput, { target: { value: '<p>Updated description</p>' } });
      
      // Mock the successful update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            group: {
              ...mockGroups[0],
              name: 'Updated Group Name',
              description: '<p>Updated description</p>'
            }
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message
      await waitFor(() => {
        expect(screen.getByText(/Gruppe erfolgreich aktualisiert/i)).toBeInTheDocument();
      });
    });
    
    it('changes group status from NEW to ACTIVE and sends notification', async () => {
      render(<GroupEditForm groupId="group-1" />);
      
      // Wait for group data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Group 1')).toBeInTheDocument();
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
            group: {
              ...mockGroups[0],
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
        expect(screen.getByText(/Gruppe erfolgreich aktualisiert/i)).toBeInTheDocument();
        expect(screen.getByText(/Benachrichtigung an Gruppenverantwortliche gesendet/i)).toBeInTheDocument();
      });
    });
    
    it('changes group status from NEW to REJECTED and sends notification', async () => {
      render(<GroupEditForm groupId="group-1" />);
      
      // Wait for group data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Group 1')).toBeInTheDocument();
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
            group: {
              ...mockGroups[0],
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
        expect(screen.getByText(/Gruppe erfolgreich aktualisiert/i)).toBeInTheDocument();
        expect(screen.getByText(/Ablehnungsbenachrichtigung gesendet/i)).toBeInTheDocument();
      });
    });
    
    it('handles API errors when updating a group', async () => {
      render(<GroupEditForm groupId="group-1" />);
      
      // Wait for group data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Group 1')).toBeInTheDocument();
      });
      
      // Update the group name
      const nameInput = screen.getByLabelText(/Name der Gruppe/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Group Name' } });
      
      // Mock a failed update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          json: async () => ({ 
            success: false,
            error: 'Failed to update group'
          })
        })
      );
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/Fehler beim Aktualisieren der Gruppe/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to update group/i)).toBeInTheDocument();
      });
    });
    
    it('uploads a new logo image for the group', async () => {
      render(<GroupEditForm groupId="group-1" />);
      
      // Wait for group data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Group 1')).toBeInTheDocument();
      });
      
      // Mock the successful upload and update response
      mockFetch.mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            success: true,
            group: {
              ...mockGroups[0],
              logoUrl: 'https://mock-blob-storage.vercel.app/groups/group-1-logo.jpg'
            }
          })
        })
      );
      
      // Upload logo (using mock button)
      const uploadButton = screen.getByTestId('mock-file-upload-button');
      fireEvent.click(uploadButton);
      
      // Submit the form
      const submitButton = screen.getByText(/Speichern/i);
      fireEvent.click(submitButton);
      
      // Check for success message
      await waitFor(() => {
        expect(screen.getByText(/Gruppe erfolgreich aktualisiert/i)).toBeInTheDocument();
      });
    });
  });
});