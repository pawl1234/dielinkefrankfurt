import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import '@testing-library/jest-dom';
import ValidatedTextField from '@/components/forms/shared/ValidatedTextField';

// Mock the FieldError hooks
jest.mock('@/components/forms/shared/FieldError', () => ({
  useFieldError: jest.fn(),
  useFieldHasError: jest.fn()
}));

const mockUseFieldError = require('@/components/forms/shared/FieldError').useFieldError;
const mockUseFieldHasError = require('@/components/forms/shared/FieldError').useFieldHasError;

interface TestFormData {
  email: string;
  name: string;
  title: string;
  description: string;
}

function TestWrapper({ children, defaultValues = {} }: {
  children: React.ReactNode;
  defaultValues?: Partial<TestFormData>;
}) {
  const methods = useForm<TestFormData>({
    defaultValues: {
      email: '',
      name: '',
      title: '',
      description: '',
      ...defaultValues
    }
  });

  return (
    <FormProvider {...methods}>
      <form>
        {children}
      </form>
    </FormProvider>
  );
}

describe('ValidatedTextField', () => {
  beforeEach(() => {
    mockUseFieldError.mockReset();
    mockUseFieldHasError.mockReset();
  });

  it('should render basic TextField with registration', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper>
        <ValidatedTextField name="email" label="E-Mail" />
      </TestWrapper>
    );

    const input = screen.getByLabelText('E-Mail');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('name', 'email');
  });

  it('should display error state and message', () => {
    mockUseFieldError.mockReturnValue('E-Mail ist erforderlich');
    mockUseFieldHasError.mockReturnValue(true);

    render(
      <TestWrapper>
        <ValidatedTextField name="email" label="E-Mail" />
      </TestWrapper>
    );

    const input = screen.getByLabelText('E-Mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
  });

  it('should show custom helper text when no errors', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="email"
          label="E-Mail"
          helperText="Bitte geben Sie Ihre E-Mail ein"
        />
      </TestWrapper>
    );

    expect(screen.getByText('Bitte geben Sie Ihre E-Mail ein')).toBeInTheDocument();
  });

  it('should prioritize error message over custom helper text', () => {
    mockUseFieldError.mockReturnValue('E-Mail ist erforderlich');
    mockUseFieldHasError.mockReturnValue(true);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="email"
          label="E-Mail"
          helperText="Bitte geben Sie Ihre E-Mail ein"
        />
      </TestWrapper>
    );

    expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
    expect(screen.queryByText('Bitte geben Sie Ihre E-Mail ein')).not.toBeInTheDocument();
  });

  it('should show character count when enabled', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper defaultValues={{ title: 'Hello' }}>
        <ValidatedTextField
          name="title"
          label="Titel"
          rules={{ maxLength: { value: 100, message: 'Max 100 Zeichen' } }}
          showCharacterCount
        />
      </TestWrapper>
    );

    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('should combine character count with custom helper text', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper defaultValues={{ title: 'Test' }}>
        <ValidatedTextField
          name="title"
          label="Titel"
          rules={{ maxLength: { value: 50, message: 'Max 50 Zeichen' } }}
          helperText="Titel des Berichts"
          showCharacterCount
        />
      </TestWrapper>
    );

    expect(screen.getByText('Titel des Berichts (4/50)')).toBeInTheDocument();
  });

  it('should handle validation rules correctly', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="email"
          label="E-Mail"
          rules={{
            required: 'E-Mail ist erforderlich',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Ungültige E-Mail'
            }
          }}
        />
      </TestWrapper>
    );

    const input = screen.getByLabelText('E-Mail');
    expect(input).toBeInTheDocument();

    // Verify the field can receive input
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input).toHaveValue('test@example.com');
  });

  it('should support multiline text fields', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="description"
          label="Beschreibung"
          multiline
          rows={4}
        />
      </TestWrapper>
    );

    const textarea = screen.getByLabelText('Beschreibung');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should pass through all TextField props', () => {
    mockUseFieldError.mockReturnValue(undefined);
    mockUseFieldHasError.mockReturnValue(false);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="name"
          label="Name"
          placeholder="Ihr Name"
          fullWidth
          variant="outlined"
          size="small"
          data-testid="custom-textfield"
        />
      </TestWrapper>
    );

    const input = screen.getByTestId('custom-textfield').querySelector('input');
    expect(input).toHaveAttribute('placeholder', 'Ihr Name');
  });

  it('should handle custom validations prop', () => {
    const customValidations = [
      { field: 'email', isValid: false, message: 'Custom validation failed' }
    ];

    mockUseFieldError.mockReturnValue('Custom validation failed');
    mockUseFieldHasError.mockReturnValue(true);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="email"
          label="E-Mail"
          customValidations={customValidations}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Custom validation failed')).toBeInTheDocument();

    // Verify that custom validations were passed to the hooks
    expect(mockUseFieldError).toHaveBeenCalledWith('email', customValidations, undefined, false);
    expect(mockUseFieldHasError).toHaveBeenCalledWith('email', customValidations, undefined, false);
  });

  it('should handle forceShowErrors prop', () => {
    mockUseFieldError.mockReturnValue('Forced error');
    mockUseFieldHasError.mockReturnValue(true);

    render(
      <TestWrapper>
        <ValidatedTextField
          name="email"
          label="E-Mail"
          forceShowErrors
        />
      </TestWrapper>
    );

    // Verify that forceShowErrors was passed to the hooks
    expect(mockUseFieldError).toHaveBeenCalledWith('email', [], undefined, true);
    expect(mockUseFieldHasError).toHaveBeenCalledWith('email', [], undefined, true);
  });
});