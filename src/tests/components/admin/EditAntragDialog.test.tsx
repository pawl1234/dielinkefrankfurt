import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import EditAntragDialog from '@/components/admin/antraege/EditAntragDialog';

// Mock fetch
global.fetch = jest.fn();

// Mock AntragForm to avoid complex rendering
jest.mock('@/components/forms/antraege/AntragForm', () => ({
  __esModule: true,
  default: ({ 
    mode, 
    initialValues, 
    submitButtonText, 
    onSubmit, 
    onCancel 
  }: { 
    mode: string;
    initialValues: any;
    submitButtonText: string;
    onSubmit: (data: any, files: any[]) => Promise<void>;
    onCancel: () => void;
  }) => {
    return React.createElement('div', { 'data-testid': 'antrag-form' },
      React.createElement('div', null, `Mode: ${mode}`),
      React.createElement('div', null, `Initial Title: ${initialValues?.title || 'None'}`),
      React.createElement('div', null, `Submit Text: ${submitButtonText}`),
      React.createElement('button', { 
        onClick: () => onSubmit({
          firstName: 'Updated',
          lastName: 'Name',
          email: 'updated@example.com',
          title: 'Updated Title',
          summary: 'Updated Summary',
          purposes: { zuschuss: { enabled: true, amount: 1000 } }
        }, [])
      }, 'Submit Form'),
      React.createElement('button', { onClick: onCancel }, 'Cancel Form')
    );
  },
}));

describe('EditAntragDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockAntragData = {
    id: '123',
    title: 'Original Title',
    summary: 'Original Summary',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    status: 'NEU',
    purposes: JSON.stringify({
      zuschuss: { enabled: true, amount: 500 }
    }),
    fileUrls: JSON.stringify(['https://example.com/file1.pdf']),
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockAntragData,
    });
  });

  it('should not fetch data when closed', () => {
    render(React.createElement(EditAntragDialog, {
      open: false,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should fetch and display form when opened', async () => {
    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/antraege/123');

    await waitFor(() => {
      expect(screen.getByText('Antrag bearbeiten')).toBeInTheDocument();
      expect(screen.getByTestId('antrag-form')).toBeInTheDocument();
      expect(screen.getByText('Mode: edit')).toBeInTheDocument();
      expect(screen.getByText('Initial Title: Original Title')).toBeInTheDocument();
    });
  });

  it('should handle loading state', async () => {
    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should handle 404 error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '999',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByText('Antrag nicht gefunden')).toBeInTheDocument();
    });
  });

  it.skip('should show warning for non-editable antrag', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockAntragData,
        status: 'AKZEPTIERT',
      }),
    });

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByText('Dieser Antrag kann nicht bearbeitet werden. Nur Anträge mit Status "NEU" können bearbeitet werden.')).toBeInTheDocument();
      expect(screen.queryByTestId('antrag-form')).not.toBeInTheDocument();
    });
  });

  it('should handle successful form submission', async () => {
    // Mock successful update
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAntragData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockAntragData, title: 'Updated Title' }),
      });

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByTestId('antrag-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/antraege/123',
        expect.objectContaining({
          method: 'PUT',
          body: expect.any(FormData),
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle form submission error', async () => {
    // Mock fetch for initial load
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAntragData,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      });

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByTestId('antrag-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('should handle form cancellation', async () => {
    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByTestId('antrag-form')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel Form');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close dialog when close button is clicked', () => {
    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable close button when saving', async () => {
    // Mock slow response
    let resolveUpdate: (value: any) => void;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAntragData,
      })
      .mockReturnValueOnce(updatePromise);

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByTestId('antrag-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    // Check that submit button shows saving state
    await waitFor(() => {
      expect(screen.getByText(/Speichern\.\.\./)).toBeInTheDocument();
    });

    // Close button should be disabled
    const closeButton = screen.getByLabelText('close');
    expect(closeButton).toBeDisabled();

    // Resolve the update
    resolveUpdate!({
      ok: true,
      json: async () => ({ ...mockAntragData, title: 'Updated' }),
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it.skip('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByText('Ein unerwarteter Fehler ist aufgetreten')).toBeInTheDocument();
    });
  });

  it('should create proper FormData for submission', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAntragData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockAntragData, title: 'Updated Title' }),
      });

    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByTestId('antrag-form')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      const updateCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[1]?.method === 'PUT'
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1].body).toBeInstanceOf(FormData);
    });
  });

  it('should show correct submit button text based on saving state', async () => {
    render(React.createElement(EditAntragDialog, {
      open: true,
      onClose: mockOnClose,
      antragId: '123',
      onSuccess: mockOnSuccess,
    }));

    await waitFor(() => {
      expect(screen.getByText('Submit Text: Änderungen speichern')).toBeInTheDocument();
    });
  });
});