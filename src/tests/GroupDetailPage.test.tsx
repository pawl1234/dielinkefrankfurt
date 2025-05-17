import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupDetailPage from '@/app/admin/groups/[id]/page';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

// Mock the next auth session hook
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn()
}));

// Mock the next router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
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
const mockGroup = {
  id: '1',
  name: 'Test Group',
  description: 'This is a test group description with\nmultiple lines',
  logoUrl: 'https://example.com/logo.png',
  slug: 'test-group',
  status: 'NEW',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: null,
  responsiblePersons: [
    {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      groupId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  statusReports: [
    {
      id: '1',
      title: 'First Report',
      content: 'This is our first status report',
      reporterFirstName: 'John',
      reporterLastName: 'Doe',
      status: 'ACTIVE',
      groupId: '1',
      fileUrls: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

// Mock the global fetch function
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('GroupDetailPage', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated'
    });
    
    // Mock router and params
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup })
    });
  });

  it('redirects to login page when not authenticated', () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
    
    render(<GroupDetailPage />);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/login');
  });

  it('renders loading state initially', () => {
    render(<GroupDetailPage />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fetches and displays group details', async () => {
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    
    // Check that group details are displayed
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('This is a test group description with')).toBeInTheDocument();
      expect(screen.getByText('multiple lines')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('First Report')).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    // Mock failed API response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch group details' })
    });
    
    render(<GroupDetailPage />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to load group details. Please try again.')).toBeInTheDocument();
    });
  });

  it('navigates back when clicking the back button', async () => {
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    
    // Click on back button
    fireEvent.click(screen.getByText('Zurück zur Übersicht'));
    
    // Check that router was called
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/groups');
  });

  it('navigates to edit page when clicking edit button', async () => {
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    
    // Click on edit button
    fireEvent.click(screen.getByText('Bearbeiten'));
    
    // Check that router was called with correct URL
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/groups/1/edit');
  });

  it('shows correct action buttons based on group status', async () => {
    // Test for NEW status
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    
    // For NEW status, should show Activate and Reject buttons
    expect(screen.getByText('Aktivieren')).toBeInTheDocument();
    expect(screen.getByText('Ablehnen')).toBeInTheDocument();
    
    // Clean up
    jest.clearAllMocks();
    
    // Test for ACTIVE status
    mockGroup.status = 'ACTIVE';
    render(<GroupDetailPage />);
    
    // For ACTIVE status, should show Archive button but not Activate or Reject
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('Archivieren')).toBeInTheDocument();
    });
    expect(screen.queryByText('Aktivieren')).not.toBeInTheDocument();
    expect(screen.queryByText('Ablehnen')).not.toBeInTheDocument();
    
    // Clean up
    jest.clearAllMocks();
    
    // Test for ARCHIVED status
    mockGroup.status = 'ARCHIVED';
    render(<GroupDetailPage />);
    
    // For ARCHIVED status, should show Delete button
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('Löschen')).toBeInTheDocument();
    });
  });

  it('opens status change dialog when clicking status action button', async () => {
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    
    // Click on activate button
    fireEvent.click(screen.getByText('Aktivieren'));
    
    // Check that dialog is shown
    expect(screen.getByText('Gruppenstatus ändern')).toBeInTheDocument();
    expect(screen.getByText(/Soll diese Gruppe aktiviert werden/)).toBeInTheDocument();
    
    // Click cancel to close dialog
    fireEvent.click(screen.getByText('Abbrechen'));
    
    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Gruppenstatus ändern')).not.toBeInTheDocument();
    });
  });

  it('confirms status change and makes API call', async () => {
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    
    // Mock successful status update response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    // Mock successful refetch response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ group: { ...mockGroup, status: 'ACTIVE' } })
    });
    
    // Click on activate button
    fireEvent.click(screen.getByText('Aktivieren'));
    
    // Click confirm button
    fireEvent.click(screen.getByText('Bestätigen'));
    
    // Check that status update API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/admin\/groups\/1\/status/),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('ACTIVE')
        })
      );
    });
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/Gruppe wurde erfolgreich aktiviert/)).toBeInTheDocument();
    });
  });

  it('opens delete confirmation dialog when clicking delete button', async () => {
    // Set group status to ARCHIVED to show delete button
    mockGroup.status = 'ARCHIVED';
    
    render(<GroupDetailPage />);
    
    // Wait for group details to load
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    
    // Click on delete button
    fireEvent.click(screen.getByText('Löschen'));
    
    // Check that dialog is shown
    expect(screen.getByText('Gruppe löschen')).toBeInTheDocument();
    expect(screen.getByText(/Sind Sie sicher, dass Sie diese Gruppe vollständig löschen möchten/)).toBeInTheDocument();
  });
});