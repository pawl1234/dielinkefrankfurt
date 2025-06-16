import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditGroupWrapper from '../components/EditGroupWrapper';
import '@testing-library/jest-dom';
import { GroupStatus } from '@prisma/client';

// Mock GroupEditForm component
jest.mock('../components/GroupEditForm', () => {
  const MockGroupEditForm = ({
    group,
    onSubmitSuccess,
    onCancel,
  }: {
    group: { id: string; name: string; status: string };
    onSubmitSuccess?: () => void;
    onCancel?: () => void;
  }) => {
    return (
      <div data-testid="mock-group-edit-form">
        <div>Editing Group: {group.name}</div>
        <button onClick={onSubmitSuccess} data-testid="mock-success-button">
          Submit Success
        </button>
        <button onClick={onCancel} data-testid="mock-cancel-button">
          Cancel
        </button>
      </div>
    );
  };
  return {
    __esModule: true,
    default: MockGroupEditForm,
  };
});

describe('EditGroupWrapper', () => {
  const mockGroup = {
    id: '123',
    name: 'Test Group',
    description: '<p>Test description</p>',
    logoUrl: 'https://example.com/logo.jpg',
    status: 'ACTIVE' as GroupStatus,
    slug: 'test-group',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: JSON.stringify({
      originalUrl: 'https://example.com/original-logo.jpg',
      croppedUrl: 'https://example.com/logo.jpg'
    }),
    responsiblePersons: [
      {
        id: '1',
        groupId: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const MockGroupComponent = () => <div data-testid="mock-group-component">Group Details</div>;

  it('renders the group component in view mode by default', () => {
    render(
      <EditGroupWrapper
        group={mockGroup}
        groupComponent={<MockGroupComponent />}
      />
    );
    
    // Group component should be visible
    expect(screen.getByTestId('mock-group-component')).toBeInTheDocument();
    
    // Edit form should not be visible
    expect(screen.queryByTestId('mock-group-edit-form')).not.toBeInTheDocument();
  });

  it('toggles to edit mode when the hidden edit button is clicked', () => {
    render(
      <EditGroupWrapper
        group={mockGroup}
        groupComponent={<MockGroupComponent />}
      />
    );
    
    // Find the hidden button and click it
    const editButton = screen.getByRole('button', { hidden: true });
    fireEvent.click(editButton);
    
    // Group component should no longer be visible
    expect(screen.queryByTestId('mock-group-component')).not.toBeInTheDocument();
    
    // Edit form should now be visible
    expect(screen.getByTestId('mock-group-edit-form')).toBeInTheDocument();
    expect(screen.getByText(`Editing Group: ${mockGroup.name}`)).toBeInTheDocument();
  });

  it('returns to view mode when cancel is clicked', () => {
    render(
      <EditGroupWrapper
        group={mockGroup}
        groupComponent={<MockGroupComponent />}
      />
    );
    
    // Go to edit mode
    const editButton = screen.getByRole('button', { hidden: true });
    fireEvent.click(editButton);
    
    // Click cancel button
    const cancelButton = screen.getByTestId('mock-cancel-button');
    fireEvent.click(cancelButton);
    
    // Should return to view mode
    expect(screen.getByTestId('mock-group-component')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-group-edit-form')).not.toBeInTheDocument();
  });

  it('calls onEditComplete when submit success', async () => {
    // Mock for the onEditComplete callback
    const mockOnEditComplete = jest.fn();
    
    render(
      <EditGroupWrapper
        group={mockGroup}
        groupComponent={<MockGroupComponent />}
        onEditComplete={mockOnEditComplete}
      />
    );
    
    // Go to edit mode
    const editButton = screen.getByRole('button', { hidden: true });
    fireEvent.click(editButton);
    
    // Click success button to simulate successful form submission
    const successButton = screen.getByTestId('mock-success-button');
    fireEvent.click(successButton);
    
    // Timeout is used in the component before calling onEditComplete
    await waitFor(() => {
      expect(mockOnEditComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 600 });
    
    // Should return to view mode after success
    expect(screen.getByTestId('mock-group-component')).toBeInTheDocument();
  });
});