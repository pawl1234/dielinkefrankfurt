import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminGroupsPage from '@/app/admin/groups/page';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock the next auth session hook
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn()
}));

// Mock the next router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock the MainLayout component
jest.mock('@/components/MainLayout', () => {
  return {
    MainLayout: function MockedMainLayout({ children }: { children: React.ReactNode }) {
      return <div data-testid="main-layout">{children}</div>;
    }
  };
});

// Sample group data for testing
const mockGroups = [
  {
    id: '1',
    name: 'Test Group 1',
    description: 'This is test group 1 description',
    logoUrl: 'https://example.com/logo1.png',
    slug: 'test-group-1',
    status: 'NEW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: null
  },
  {
    id: '2',
    name: 'Test Group 2',
    description: 'This is test group 2 description',
    logoUrl: null,
    slug: 'test-group-2',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: null
  },
  {
    id: '3',
    name: 'Test Group 3',
    description: 'This is test group 3 description',
    logoUrl: 'https://example.com/logo3.png',
    slug: 'test-group-3',
    status: 'ARCHIVED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: null
  }
];

// Mock the global fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('AdminGroupsPage', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated'
    });
    
    // Mock router
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ groups: mockGroups })
    });
  });

  it('redirects to login page when not authenticated', () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
    
    render(<AdminGroupsPage />);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/login');
  });

  it('renders loading state initially', () => {
    render(<AdminGroupsPage />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fetches and displays groups', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    // Check that groups are displayed
    await waitFor(() => {
      expect(screen.getByText('Test Group 1')).toBeInTheDocument();
      expect(screen.getByText('Test Group 2')).toBeInTheDocument();
    });
  });

  it('filters groups based on status tabs', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    // Click on 'Aktive Gruppen' tab
    fireEvent.click(screen.getByText('Aktive Gruppen'));
    
    // Check that API was called with correct status filter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=ACTIVE'),
        expect.anything()
      );
    });
  });

  it('allows searching for groups', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    // Type in search box
    const searchInput = screen.getByLabelText('Gruppen durchsuchen');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Check that API was called with search term
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test%20search'),
        expect.anything()
      );
    });
  });

  it('allows changing sort order', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    // Click on date sort button
    fireEvent.click(screen.getByText('Datum'));
    
    // Check that API was called with correct sort parameters
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('orderBy=createdAt'),
        expect.anything()
      );
    });
  });

  it('shows error message when API fails', async () => {
    // Mock failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch groups' })
    });
    
    render(<AdminGroupsPage />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to load groups. Please try again.')).toBeInTheDocument();
    });
  });

  it('navigates to group detail view when clicking view button', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByText('Test Group 1')).toBeInTheDocument();
    });
    
    // Click on 'Details' button of first group
    fireEvent.click(screen.getAllByText('Details')[0]);
    
    // Check that router was called with correct URL
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/groups/1');
  });

  it('opens confirmation dialog when deleting a group', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load and find archived group
    await waitFor(() => {
      expect(screen.getByText('Test Group 3')).toBeInTheDocument();
    });
    
    // Click on the 'Archived' tab to see archived groups
    fireEvent.click(screen.getByText('Archiv'));
    
    // Wait for the API call to complete after tab change
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=ARCHIVED'),
        expect.anything()
      );
    });
    
    // Find and click delete button (might be multiple, so use getAllByText and click the first one)
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);
    });
    
    // Check that confirmation dialog is shown
    expect(screen.getByText('Gruppe löschen')).toBeInTheDocument();
    expect(screen.getByText(/Sind Sie sicher/)).toBeInTheDocument();
  });

  it('should handle status changes', async () => {
    render(<AdminGroupsPage />);
    
    // Wait for groups to load
    await waitFor(() => {
      expect(screen.getByText('Test Group 1')).toBeInTheDocument();
    });
    
    // Mock successful status update response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    // Find and click activate button for new group
    const activateButton = screen.getByText('Aktivieren');
    fireEvent.click(activateButton);
    
    // Check that dialog is shown
    expect(screen.getByText('Gruppenstatus ändern')).toBeInTheDocument();
    
    // Click confirm button
    const confirmButton = screen.getByText('Bestätigen');
    fireEvent.click(confirmButton);
    
    // Check that status update API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/admin\/groups\/\d+\/status/),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('ACTIVE')
        })
      );
    });
  });
});