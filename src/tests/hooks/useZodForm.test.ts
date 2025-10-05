import { renderHook, act, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';

// Test schema with German localization
const testSchema = z.object({
  name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  age: z.number().min(18, 'Alter muss mindestens 18 sein')
});

type TestFormData = z.infer<typeof testSchema>;

describe('useZodForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize form with Zod schema validation', () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        defaultValues: { name: '', email: '', age: 0 }
      })
    );

    expect(result.current.formState).toBeDefined();
    expect(result.current.register).toBeDefined();
    expect(result.current.handleSubmit).toBeDefined();
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.hasValidationErrors).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should provide German error messages through existing validation infrastructure', async () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        defaultValues: { name: '', email: '', age: 0 }
      })
    );

    // Trigger validation by submitting invalid data
    await act(async () => {
      await result.current.handleSubmit(() => {})();
    });

    // Wait for validation errors to be processed
    await waitFor(() => {
      expect(result.current.hasValidationErrors).toBe(true);
    });

    const errors = result.current.validationErrors;
    expect(errors.length).toBeGreaterThan(0);

    // Check that error messages are in German (from Zod schema or localization system)
    const nameError = errors.find(err => err.field === 'name');
    expect(nameError).toBeDefined();
    expect(nameError?.message).toContain('mindestens');
  });

  it('should integrate with existing form submission handling', async () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        onSuccess: mockOnSuccess,
        defaultValues: { name: 'Valid Name', email: 'test@example.com', age: 25 }
      })
    );

    const validData: TestFormData = {
      name: 'Valid Name',
      email: 'test@example.com',
      age: 25
    };

    // Mock successful submission
    mockOnSubmit.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(validData, undefined);
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(result.current.submissionSuccess).toBe(true);
    expect(result.current.submissionError).toBe(null);
  });

  it('should handle submission errors properly', async () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        onError: mockOnError,
        defaultValues: { name: 'Valid Name', email: 'test@example.com', age: 25 }
      })
    );

    const testError = new Error('Submission failed');
    mockOnSubmit.mockRejectedValueOnce(testError);

    const validData: TestFormData = {
      name: 'Valid Name',
      email: 'test@example.com',
      age: 25
    };

    await act(async () => {
      await result.current.onSubmit(validData);
    });

    expect(mockOnError).toHaveBeenCalledWith(testError);
    expect(result.current.submissionError).toBe('Submission failed');
    expect(result.current.submissionSuccess).toBe(false);
  });

  it('should integrate with custom validations', async () => {
    const customValidations = [
      {
        field: 'name',
        isValid: false,
        message: 'Name ist bereits vergeben'
      }
    ];

    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        customValidations,
        defaultValues: { name: 'Valid Name', email: 'test@example.com', age: 25 }
      })
    );

    // Trigger validation
    await act(async () => {
      await result.current.handleSubmit(() => {})();
    });

    await waitFor(() => {
      expect(result.current.hasValidationErrors).toBe(true);
    });

    const errors = result.current.validationErrors;
    const customError = errors.find(err => err.field === 'name');
    expect(customError?.message).toBe('Name ist bereits vergeben');
  });

  it('should expose submission state management methods', () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        defaultValues: { name: '', email: '', age: 0 }
      })
    );

    expect(typeof result.current.setSubmissionError).toBe('function');
    expect(typeof result.current.setSubmissionSuccess).toBe('function');

    // Test state setters
    act(() => {
      result.current.setSubmissionError('Test error');
    });
    expect(result.current.submissionError).toBe('Test error');

    act(() => {
      result.current.setSubmissionSuccess(true);
    });
    expect(result.current.submissionSuccess).toBe(true);
  });

  it('should work with file uploads', async () => {
    const { result } = renderHook(() =>
      useZodForm({
        schema: testSchema,
        onSubmit: mockOnSubmit,
        defaultValues: { name: 'Valid Name', email: 'test@example.com', age: 25 }
      })
    );

    const validData: TestFormData = {
      name: 'Valid Name',
      email: 'test@example.com',
      age: 25
    };

    const mockFiles = [new File(['content'], 'test.pdf', { type: 'application/pdf' })];
    mockOnSubmit.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.onSubmit(validData, mockFiles);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(validData, mockFiles);
  });
});