import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../theme/theme';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/admin/antraege'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock useAdminState hook
jest.mock('../../../../hooks/useAdminState', () => ({
  useAdminState: jest.fn(),
}));

// Mock admin components
jest.mock('../../../../components/admin/AdminNavigation', () => {
  return function MockAdminNavigation() {
    return <div data-testid="admin-navigation">Admin Navigation</div>;
  };
});

jest.mock('../../../../components/admin/AdminPageHeader', () => {
  return function MockAdminPageHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
    return (
      <div data-testid="admin-page-header">
        <span data-testid="page-title">{title}</span>
        <span data-testid="page-icon">{icon}</span>
      </div>
    );
  };
});


jest.mock('../../../../components/admin/tables/AdminPagination', () => {
  return function MockAdminPagination() {
    return <div data-testid="admin-pagination">Pagination</div>;
  };
});

jest.mock('../../../../components/admin/AdminNotification', () => {
  return function MockAdminNotification() {
    return <div data-testid="admin-notification">Notification</div>;
  };
});

jest.mock('../../../../components/admin/antraege/AntraegeTable', () => {
  return function MockAntraegeTable({ antraege }: { antraege: any[] }) {
    return (
      <div data-testid="antraege-table">
        {antraege.map((antrag) => (
          <div key={antrag.id} data-testid="antrag-item">
            {antrag.title}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('../../../../components/admin/antraege/AntraegeFilters', () => {
  return function MockAntraegeFilters() {
    return <div data-testid="antraege-filters">Filters</div>;
  };
});

jest.mock('../../../../components/admin/antraege/ConfigurationDialog', () => {
  return function MockConfigurationDialog() {
    return null;
  };
});

jest.mock('../../../../components/layout/MainLayout', () => {
  return function MockMainLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="main-layout">{children}</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

const { useSession } = require('next-auth/react');
const { useRouter } = require('next/navigation');
const { useAdminState } = require('../../../../hooks/useAdminState');

describe('AdminAntraegePage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockAdminState = {
    page: 1,
    pageSize: 10,
    timestamp: Date.now(),
    items: [],
    loading: false,
    error: null,
    totalPages: 1,
    notification: null,
    setLoading: jest.fn(),
    setItems: jest.fn(),
    setPaginationData: jest.fn(),
    setError: jest.fn(),
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    refreshTimestamp: jest.fn(),
    showNotification: jest.fn(),
    closeNotification: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockRouter);
    useAdminState.mockReturnValue(mockAdminState);
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

  const renderPage = async () => {
    const { default: AdminAntraegePage } = await import('../../../../app/admin/antraege/page');
    
    return render(
      <ThemeProvider theme={theme}>
        <AdminAntraegePage />
      </ThemeProvider>
    );
  };

  describe('Authentication', () => {
    it('redirects to login when unauthenticated', async () => {
      useSession.mockReturnValue({ status: 'unauthenticated' });

      await renderPage();

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/admin/login');
      });
    });

    it('shows loading spinner when session is loading', async () => {
      useSession.mockReturnValue({ status: 'loading' });

      await renderPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders page content when authenticated', async () => {
      useSession.mockReturnValue({ status: 'authenticated' });

      await renderPage();

      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      expect(screen.getByTestId('admin-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('admin-page-header')).toBeInTheDocument();
    });
  });

  describe('Page Header', () => {
    beforeEach(() => {
      useSession.mockReturnValue({ status: 'authenticated' });
    });

    it('displays correct page title', async () => {
      await renderPage();

      expect(screen.getByTestId('page-title')).toHaveTextContent('Anträge verwalten');
    });

    it('displays gavel icon', async () => {
      await renderPage();

      expect(screen.getByTestId('page-icon')).toBeInTheDocument();
    });
  });


  describe('Data Loading', () => {
    beforeEach(() => {
      useSession.mockReturnValue({ status: 'authenticated' });
    });

    it('shows loading spinner when data is loading', async () => {
      useAdminState.mockReturnValue({
        ...mockAdminState,
        loading: true,
      });

      await renderPage();

      expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    });

    it('shows error message when there is an error', async () => {
      useAdminState.mockReturnValue({
        ...mockAdminState,
        error: 'Failed to load anträge',
      });

      await renderPage();

      expect(screen.getByText('Failed to load anträge')).toBeInTheDocument();
    });

    it('shows empty state when no data', async () => {
      useAdminState.mockReturnValue({
        ...mockAdminState,
        items: [],
      });

      await renderPage();

      expect(screen.getByText('Keine neuen Anträge vorhanden.')).toBeInTheDocument();
    });

    it('renders AntraegeTable when data is available', async () => {
      const mockAntraege = [
        {
          id: '1',
          title: 'Test Antrag',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          summary: 'Test summary',
          purposes: { zuschuss: { enabled: true, amount: 500 } },
          fileUrls: null,
          status: 'NEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      useAdminState.mockReturnValue({
        ...mockAdminState,
        items: mockAntraege,
      });

      await renderPage();

      expect(screen.getByTestId('antraege-table')).toBeInTheDocument();
      expect(screen.getByText('Test Antrag')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      useSession.mockReturnValue({ status: 'authenticated' });
    });

    it('renders pagination component', async () => {
      await renderPage();

      expect(screen.getByTestId('admin-pagination')).toBeInTheDocument();
    });
  });

  describe('Notification', () => {
    beforeEach(() => {
      useSession.mockReturnValue({ status: 'authenticated' });
    });

    it('renders notification component', async () => {
      await renderPage();

      expect(screen.getByTestId('admin-notification')).toBeInTheDocument();
    });
  });
});