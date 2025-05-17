import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams } from 'next/navigation';
import GroupDetailPage from '../app/gruppen/[slug]/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock MainLayout component
jest.mock('../components/MainLayout', () => {
  return {
    MainLayout: function MockLayout({ children }: { children: React.ReactNode }) {
      return <div data-testid="mock-layout">{children}</div>;
    }
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn().mockImplementation(() => 'January 1, 2025'),
}));

describe('Group Status Reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ slug: 'test-group' });
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise((resolve) => {
        // Don't resolve to keep loading state
        setTimeout(resolve, 1000);
      })
    );

    render(<GroupDetailPage />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders status reports when fetched successfully', async () => {
    const mockGroup = {
      id: '1',
      name: 'Test Group',
      slug: 'test-group',
      description: '<p>Group description</p>',
      status: 'ACTIVE',
      logoUrl: 'https://example.com/logo.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: null,
      statusReports: [
        {
          id: '101',
          title: 'Status Report 1',
          content: '<p>This is the first report content</p>',
          reporterFirstName: 'John',
          reporterLastName: 'Doe',
          fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
          status: 'ACTIVE',
          groupId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '102',
          title: 'Status Report 2',
          content: '<p>This is the second report content</p>',
          reporterFirstName: 'Jane',
          reporterLastName: 'Smith',
          fileUrls: null,
          status: 'ACTIVE',
          groupId: '1',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, group: mockGroup }),
    });

    render(<GroupDetailPage />);
    
    // Wait for status reports to be rendered
    await waitFor(() => {
      expect(screen.getByText('Status Report 1')).toBeInTheDocument();
      expect(screen.getByText('Status Report 2')).toBeInTheDocument();
    });
    
    // Check if first report's content is displayed
    expect(screen.getByText('This is the first report content')).toBeInTheDocument();
    
    // Check if reporter names are displayed
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    
    // Check if file attachment exists in the first report
    expect(screen.getByText('file1.pdf')).toBeInTheDocument();
  });

  it('renders empty state when no status reports exist', async () => {
    const mockGroup = {
      id: '1',
      name: 'Test Group',
      slug: 'test-group',
      description: '<p>Group description</p>',
      status: 'ACTIVE',
      logoUrl: 'https://example.com/logo.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: null,
      statusReports: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, group: mockGroup }),
    });

    render(<GroupDetailPage />);
    
    // Wait for empty state message to be rendered
    await waitFor(() => {
      expect(screen.getByText('Diese Arbeitsgruppe hat noch keine Statusberichte veröffentlicht.')).toBeInTheDocument();
    });
  });

  it('handles invalid file URLs gracefully', async () => {
    const mockGroup = {
      id: '1',
      name: 'Test Group',
      slug: 'test-group',
      description: '<p>Group description</p>',
      status: 'ACTIVE',
      logoUrl: 'https://example.com/logo.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: null,
      statusReports: [
        {
          id: '101',
          title: 'Status Report with Invalid URLs',
          content: '<p>This report has invalid file URLs</p>',
          reporterFirstName: 'John',
          reporterLastName: 'Doe',
          fileUrls: 'invalid-json', // Invalid JSON to test error handling
          status: 'ACTIVE',
          groupId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, group: mockGroup }),
    });

    render(<GroupDetailPage />);
    
    // Wait for error message to be rendered
    await waitFor(() => {
      expect(screen.getByText('Fehler beim Laden der Dateianhänge')).toBeInTheDocument();
    });
  });

  it('handles multiple file attachments correctly', async () => {
    const mockGroup = {
      id: '1',
      name: 'Test Group',
      slug: 'test-group',
      description: '<p>Group description</p>',
      status: 'ACTIVE',
      logoUrl: 'https://example.com/logo.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: null,
      statusReports: [
        {
          id: '101',
          title: 'Status Report with Multiple Files',
          content: '<p>This report has multiple file attachments</p>',
          reporterFirstName: 'John',
          reporterLastName: 'Doe',
          fileUrls: JSON.stringify([
            'https://example.com/file1.pdf', 
            'https://example.com/image.jpg',
            'https://example.com/document.docx'
          ]),
          status: 'ACTIVE',
          groupId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, group: mockGroup }),
    });

    render(<GroupDetailPage />);
    
    // Wait for file attachments to be rendered
    await waitFor(() => {
      expect(screen.getByText('Dateianhänge (3)')).toBeInTheDocument();
      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('image.jpg')).toBeInTheDocument();
      expect(screen.getByText('document.docx')).toBeInTheDocument();
    });
  });

  it('renders responsive layout correctly', async () => {
    // Mock window.matchMedia for testing responsive design
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const mockGroup = {
      id: '1',
      name: 'Test Group',
      slug: 'test-group',
      description: '<p>Group description</p>',
      status: 'ACTIVE',
      logoUrl: 'https://example.com/logo.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: null,
      statusReports: [
        {
          id: '101',
          title: 'Status Report 1',
          content: '<p>This is the report content</p>',
          reporterFirstName: 'John',
          reporterLastName: 'Doe',
          fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
          status: 'ACTIVE',
          groupId: '1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, group: mockGroup }),
    });

    render(<GroupDetailPage />);
    
    // Wait for status reports to be rendered
    await waitFor(() => {
      expect(screen.getByText('Status Report 1')).toBeInTheDocument();
    });
    
    // Ensure responsive containers are present
    const cardContent = screen.getByText('This is the report content').closest('.MuiCardContent-root');
    expect(cardContent).toBeInTheDocument();
    
    // Just test that the file is displayed correctly
    const fileBox = screen.getByText('file1.pdf');
    expect(fileBox).toBeInTheDocument();
  });
});