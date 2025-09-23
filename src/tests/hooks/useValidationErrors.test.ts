import { renderHook } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { useValidationErrors } from '../../hooks/useValidationErrors';
import { CustomValidationEntry } from '../../components/forms/shared/FormBase';

describe('useValidationErrors Hook', () => {
  it('should collect React Hook Form field errors correctly', () => {
    const formErrors = {
      title: { type: 'required', message: 'Titel ist erforderlich' },
      firstName: { type: 'minLength', message: 'Mind. 2 Zeichen' }
    };

    const customValidations: CustomValidationEntry[] = [];

    const { result } = renderHook(() =>
      useValidationErrors({
        formErrors,
        customValidations,
        submissionError: null,
        isSubmitted: true
      })
    );

    expect(result.current.validationErrors).toHaveLength(2);
    expect(result.current.validationErrors[0].label).toBe('Titel');
    expect(result.current.validationErrors[0].message).toBe('Titel ist erforderlich');
    expect(result.current.validationErrors[1].label).toBe('Vorname');
    expect(result.current.validationErrors[1].message).toBe('Mind. 2 Zeichen');
    expect(result.current.hasValidationErrors).toBe(true);
    expect(result.current.hasAnyErrors).toBe(true);
  });

  it('should collect custom validation errors correctly', () => {
    const formErrors = {};
    const customValidations: CustomValidationEntry[] = [
      {
        field: 'content',
        isValid: false,
        message: 'Inhalt ist erforderlich und muss Text enthalten.'
      },
      {
        field: 'files',
        isValid: false,
        message: 'Mindestens eine Datei ist erforderlich.'
      }
    ];

    const { result } = renderHook(() =>
      useValidationErrors({
        formErrors,
        customValidations,
        submissionError: null,
        isSubmitted: true
      })
    );

    expect(result.current.validationErrors).toHaveLength(2);
    expect(result.current.validationErrors[0].label).toBe('Inhalt');
    expect(result.current.validationErrors[0].message).toBe('Inhalt ist erforderlich und muss Text enthalten.');
    expect(result.current.validationErrors[1].label).toBe('Datei-Anhänge');
    expect(result.current.validationErrors[1].message).toBe('Mindestens eine Datei ist erforderlich.');
    expect(result.current.hasValidationErrors).toBe(true);
  });

  it('should handle submission errors correctly', () => {
    const formErrors = {};
    const customValidations: CustomValidationEntry[] = [];
    const submissionError = 'Network error occurred';

    const { result } = renderHook(() =>
      useValidationErrors({
        formErrors,
        customValidations,
        submissionError,
        isSubmitted: true
      })
    );

    expect(result.current.validationErrors).toHaveLength(0);
    expect(result.current.submissionError).toBe('Network error occurred');
    expect(result.current.hasValidationErrors).toBe(false);
    expect(result.current.hasAnyErrors).toBe(true);
  });

  it('should not return errors when form is not submitted', () => {
    const formErrors = {
      title: { type: 'required', message: 'Titel ist erforderlich' }
    };
    const customValidations: CustomValidationEntry[] = [
      {
        field: 'content',
        isValid: false,
        message: 'Inhalt ist erforderlich.'
      }
    ];

    const { result } = renderHook(() =>
      useValidationErrors({
        formErrors,
        customValidations,
        submissionError: null,
        isSubmitted: false
      })
    );

    expect(result.current.validationErrors).toHaveLength(0);
    expect(result.current.hasValidationErrors).toBe(false);
    expect(result.current.hasAnyErrors).toBe(false);
  });

  it('should prioritize custom validation messages over RHF messages for same field', () => {
    const formErrors = {
      content: { type: 'required', message: 'This field is required' }
    };
    const customValidations: CustomValidationEntry[] = [
      {
        field: 'content',
        isValid: false,
        message: 'Inhalt ist erforderlich und muss Text enthalten.'
      }
    ];

    const { result } = renderHook(() =>
      useValidationErrors({
        formErrors,
        customValidations,
        submissionError: null,
        isSubmitted: true
      })
    );

    expect(result.current.validationErrors).toHaveLength(1);
    expect(result.current.validationErrors[0].label).toBe('Inhalt');
    expect(result.current.validationErrors[0].message).toBe('Inhalt ist erforderlich und muss Text enthalten.');
  });

  it('should use German field labels correctly', () => {
    const formErrors = {
      groupId: { type: 'required', message: 'This field is required' },
      reporterFirstName: { type: 'required', message: 'This field is required' }
    };

    const { result } = renderHook(() =>
      useValidationErrors({
        formErrors,
        customValidations: [],
        submissionError: null,
        isSubmitted: true
      })
    );

    expect(result.current.validationErrors).toHaveLength(2);
    expect(result.current.validationErrors[0].label).toBe('Gruppe');
    expect(result.current.validationErrors[0].message).toBe('This field is required');
    expect(result.current.validationErrors[1].label).toBe('Vorname des Erstellers');
    expect(result.current.validationErrors[1].message).toBe('This field is required');
  });
});