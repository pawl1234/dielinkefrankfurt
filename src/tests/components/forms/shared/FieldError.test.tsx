import React from 'react';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import '@testing-library/jest-dom';
import FieldError, { useFieldError, useFieldHasError } from '@/components/forms/shared/FieldError';
import { CustomValidationEntry } from '@/components/forms/shared/FormBase';

// Mock the useValidationErrors hook
jest.mock('@/hooks/useValidationErrors', () => ({
  useValidationErrors: jest.fn()
}));

const mockUseValidationErrors = require('@/hooks/useValidationErrors').useValidationErrors;

interface TestFormData {
  email: string;
  name: string;
  description: string;
}

function TestWrapper({ children, defaultValues = {}, shouldSubmit = false }: {
  children: React.ReactNode;
  defaultValues?: Partial<TestFormData>;
  shouldSubmit?: boolean;
}) {
  const methods = useForm<TestFormData>({
    defaultValues: {
      email: '',
      name: '',
      description: '',
      ...defaultValues
    }
  });

  // Simulate form submission if requested
  if (shouldSubmit && !methods.formState.isSubmitted) {
    methods.trigger(); // This will mark the form as submitted
  }

  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
}

describe('FieldError', () => {
  beforeEach(() => {
    mockUseValidationErrors.mockReset();
  });

  it('should not display errors before form submission', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'email', label: 'E-Mail', message: 'E-Mail ist erforderlich' }]
    });

    render(
      <TestWrapper>
        <FieldError name="email" />
      </TestWrapper>
    );

    expect(screen.queryByText('E-Mail ist erforderlich')).not.toBeInTheDocument();
  });

  it('should display errors after form submission in block mode', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'email', label: 'E-Mail', message: 'E-Mail ist erforderlich' }]
    });

    render(
      <TestWrapper shouldSubmit>
        <FieldError name="email" mode="block" />
      </TestWrapper>
    );

    expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
  });

  it('should return error message for helperText mode', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'email', label: 'E-Mail', message: 'E-Mail ist erforderlich' }]
    });

    const result = render(
      <TestWrapper shouldSubmit>
        <FieldError name="email" mode="helperText" />
      </TestWrapper>
    );

    expect(result.container.textContent).toBe('E-Mail ist erforderlich');
  });

  it('should show errors when forceShow is true', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'email', label: 'E-Mail', message: 'E-Mail ist erforderlich' }]
    });

    render(
      <TestWrapper>
        <FieldError name="email" mode="block" forceShow />
      </TestWrapper>
    );

    expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
  });

  it('should handle custom validations', () => {
    const customValidations: CustomValidationEntry[] = [
      { field: 'description', isValid: false, message: 'Beschreibung ist zu kurz' }
    ];

    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'description', label: 'Beschreibung', message: 'Beschreibung ist zu kurz' }]
    });

    render(
      <TestWrapper shouldSubmit>
        <FieldError name="description" mode="block" customValidations={customValidations} />
      </TestWrapper>
    );

    expect(screen.getByText('Beschreibung ist zu kurz')).toBeInTheDocument();
  });

  it('should not display when no error exists for field', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'name', label: 'Name', message: 'Name ist erforderlich' }]
    });

    render(
      <TestWrapper shouldSubmit>
        <FieldError name="email" mode="block" />
      </TestWrapper>
    );

    expect(screen.queryByText('Name ist erforderlich')).not.toBeInTheDocument();
  });
});

describe('useFieldError', () => {
  function TestUseFieldError({ name }: { name: string }) {
    const error = useFieldError(name);
    return <div data-testid="error">{error || 'no error'}</div>;
  }

  beforeEach(() => {
    mockUseValidationErrors.mockReset();
  });

  it('should return error message when field has error', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'email', label: 'E-Mail', message: 'E-Mail ist erforderlich' }]
    });

    render(
      <TestWrapper shouldSubmit>
        <TestUseFieldError name="email" />
      </TestWrapper>
    );

    expect(screen.getByTestId('error')).toHaveTextContent('E-Mail ist erforderlich');
  });

  it('should return undefined when no error exists', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: []
    });

    render(
      <TestWrapper shouldSubmit>
        <TestUseFieldError name="email" />
      </TestWrapper>
    );

    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });
});

describe('useFieldHasError', () => {
  function TestUseFieldHasError({ name }: { name: string }) {
    const hasError = useFieldHasError(name);
    return <div data-testid="has-error">{hasError ? 'has error' : 'no error'}</div>;
  }

  beforeEach(() => {
    mockUseValidationErrors.mockReset();
  });

  it('should return true when field has error', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: [{ field: 'email', label: 'E-Mail', message: 'E-Mail ist erforderlich' }]
    });

    render(
      <TestWrapper shouldSubmit>
        <TestUseFieldHasError name="email" />
      </TestWrapper>
    );

    expect(screen.getByTestId('has-error')).toHaveTextContent('has error');
  });

  it('should return false when no error exists', () => {
    mockUseValidationErrors.mockReturnValue({
      validationErrors: []
    });

    render(
      <TestWrapper shouldSubmit>
        <TestUseFieldHasError name="email" />
      </TestWrapper>
    );

    expect(screen.getByTestId('has-error')).toHaveTextContent('no error');
  });
});