import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GroupsPage from '../app/gruppen/page';
import GroupDetailPage from '../app/gruppen/[slug]/page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn().mockReturnValue({ slug: 'test-group' }),
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  })
}));

// Mock MainLayout
jest.mock('../components/MainLayout', () => {
  return {
    __esModule: true,
    MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-layout">{children}</div>
  };
});

// Mock fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('Group Pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GroupsPage', () => {
    it('renders loading state initially', () => {
      // Mock API response (not immediately resolved)
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, groups: [] })
        }), 100))
      );

      render(<GroupsPage />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders groups when API call succeeds', async () => {
      // Mock successful API response with data
      const mockGroups = [
        {
          id: '1',
          name: 'Test Group 1',
          slug: 'test-group-1',
          description: '<p>This is a test group description.</p>',
          logoUrl: 'https://example.com/logo1.jpg',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Test Group 2',
          slug: 'test-group-2',
          description: '<p>Another test group description.</p>',
          logoUrl: null,
          createdAt: new Date().toISOString()
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, groups: mockGroups })
      });

      render(<GroupsPage />);
      
      // Wait for groups to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Group 1')).toBeInTheDocument();
        expect(screen.getByText('Test Group 2')).toBeInTheDocument();
      });

      // Verify detail links
      expect(screen.getAllByText('Details')).toHaveLength(2);
    });

    it('renders error when API call fails', async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Failed to fetch groups' })
      });

      render(<GroupsPage />);
      
      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to load groups/)).toBeInTheDocument();
      });
    });
  });

  describe('GroupDetailPage', () => {
    it('renders loading state initially', () => {
      // Mock API response (not immediately resolved)
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, group: null })
        }), 100))
      );

      render(<GroupDetailPage />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders group details when API call succeeds', async () => {
      // Mock successful API response with data
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group',
        description: '<p>This is a detailed group description.</p>',
        logoUrl: 'https://example.com/logo.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        metadata: null,
        statusReports: [
          {
            id: '101',
            groupId: '1',
            title: 'Test Report',
            content: '<p>This is a test status report content.</p>',
            reporterFirstName: 'John',
            reporterLastName: 'Doe',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            fileUrls: JSON.stringify(['https://example.com/test-file.pdf'])
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, group: mockGroup })
      });

      render(<GroupDetailPage />);
      
      // Wait for group details to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument();
        expect(screen.getByText(/This is a detailed group description/)).toBeInTheDocument();
      });

      // Verify status report is displayed
      expect(screen.getByText('Test Report')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      
      // Verify file attachment is displayed
      await waitFor(() => {
        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });
    });

    it('renders no status reports message when group has none', async () => {
      // Mock successful API response with group but no reports
      const mockGroup = {
        id: '1',
        name: 'Test Group',
        slug: 'test-group',
        description: '<p>This is a detailed group description.</p>',
        logoUrl: 'https://example.com/logo.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        metadata: null,
        statusReports: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, group: mockGroup })
      });

      render(<GroupDetailPage />);
      
      // Wait for group details to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument();
      });

      // Verify no status reports message
      expect(screen.getByText(/keine Statusberichte/)).toBeInTheDocument();
    });

    it('renders error when API call fails', async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Group not found' })
      });

      render(<GroupDetailPage />);
      
      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/Arbeitsgruppe nicht gefunden/)).toBeInTheDocument();
      });
    });

    it('handles empty file URLs array', async () => {
      // Mock successful API response with empty file URLs array
      const mockGroupWithEmptyFileUrls = {
        id: '2',
        name: 'Test Group',
        slug: 'test-group',
        description: '<p>Group with empty file URLs array.</p>',
        logoUrl: 'https://example.com/logo.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        metadata: null,
        statusReports: [
          {
            id: '102',
            groupId: '2',
            title: 'Report with Empty File URLs',
            content: '<p>This report has an empty file URLs array.</p>',
            reporterFirstName: 'Alice',
            reporterLastName: 'Brown',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            fileUrls: JSON.stringify([])  // Empty array
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, group: mockGroupWithEmptyFileUrls })
      });

      render(<GroupDetailPage />);
      
      // Wait for group details to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument();
      });

      // Verify message for empty file URLs array
      expect(screen.getByText('Keine Dateianhänge verfügbar')).toBeInTheDocument();
    });

    it('handles invalid file URLs gracefully', async () => {
      // Mock successful API response with invalid file URLs
      const mockGroupWithInvalidFileUrls = {
        id: '3',
        name: 'Test Group',
        slug: 'test-group',
        description: '<p>Group with invalid file URLs.</p>',
        logoUrl: 'https://example.com/logo.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        metadata: null,
        statusReports: [
          {
            id: '103',
            groupId: '3',
            title: 'Report with Invalid File URLs',
            content: '<p>This report has invalid file URLs.</p>',
            reporterFirstName: 'Jane',
            reporterLastName: 'Smith',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            fileUrls: '{"invalid": "json"}'  // Invalid JSON for fileUrls (not an array)
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, group: mockGroupWithInvalidFileUrls })
      });

      render(<GroupDetailPage />);
      
      // Wait for group details to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument();
      });

      // Verify error message for invalid file URLs
      expect(screen.getByText('Fehler beim Laden der Dateianhänge')).toBeInTheDocument();
    });

    it('handles special characters in slug parameter', async () => {
      // Override the default mock to test special characters
      const { useParams: useParamsMock } = await import('next/navigation');
      useParamsMock.mockReturnValueOnce({ slug: 'arbeitsgruppe-für-ökologie-1234' });

      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          group: {
            id: '5',
            name: 'Arbeitsgruppe für Ökologie',
            slug: 'arbeitsgruppe-für-ökologie-1234',
            description: '<p>Test with special characters.</p>',
            logoUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'ACTIVE',
            metadata: null,
            statusReports: []
          }
        })
      });

      render(<GroupDetailPage />);
      
      // Wait for group details to be displayed
      await waitFor(() => {
        expect(screen.getByText('Arbeitsgruppe für Ökologie')).toBeInTheDocument();
      });

      // Verify the correct endpoint was called with the special character slug
      expect(mockFetch).toHaveBeenCalledWith('/api/groups/arbeitsgruppe-für-ökologie-1234');
    });
  });
});