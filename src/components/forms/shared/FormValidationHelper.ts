'use client';

import { FieldRefMap } from './FormBase'; // Adjust path as necessary
import { FieldErrors, FieldValues } from 'react-hook-form';

interface CustomValidationEntry {
  field: string;
  isValid: boolean;
  message?: string;
}

export class FormValidationHelper {
  private static getRHFErrorForField(errors: FieldErrors<any>, fieldName: string): any {
    // ... (implementation from previous correct version)
    if (errors[fieldName]) {
      return errors[fieldName];
    }
    const parts = fieldName.split(/[.\[\]]+/g).filter(Boolean);
    let currentError = errors;
    for (const part of parts) {
        if (currentError && typeof currentError === 'object' && part in currentError) {
            currentError = (currentError as any)[part];
        } else {
            return undefined;
        }
    }
    return currentError !== errors ? currentError : undefined;
  }

  public static scrollToFirstError(
    rhfErrors: FieldErrors<FieldValues>,
    customValidations: CustomValidationEntry[],
    fieldRefs: FieldRefMap,
    fieldOrderInput?: string[] // Make it optional here for safety
  ): boolean {
    const fieldOrder = fieldOrderInput || []; // Default to empty array if undefined/null

    // console.log('scrollToFirstError called. fieldOrder:', fieldOrder, 'rhfErrors:', rhfErrors, 'customV:', customValidations);

    for (const fieldName of fieldOrder) { // Now fieldOrder is guaranteed to be an array
      const fieldRef = fieldRefs[fieldName];

      const rhfError = this.getRHFErrorForField(rhfErrors, fieldName);
      if (rhfError && fieldRef?.current) {
        // console.log(`RHF error for "${fieldName}", scrolling.`, rhfError);
        fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = fieldRef.current.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) focusable.focus({ preventScroll: true });
        else if (fieldRef.current.hasAttribute('tabindex')) fieldRef.current.focus({ preventScroll: true });
        return true;
      }

      const customValidationError = customValidations.find(
        (cv) => cv.field === fieldName && !cv.isValid
      );
      if (customValidationError && fieldRef?.current) {
        // console.log(`Custom error for "${fieldName}", scrolling.`, customValidationError);
        fieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = fieldRef.current.querySelector<HTMLElement>(
            'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
        if (focusable) focusable.focus({ preventScroll: true });
        else if (fieldRef.current.hasAttribute('tabindex')) fieldRef.current.focus({ preventScroll: true });
        return true;
      }
    }
    // console.log('No scrollable error found in fieldOrder.');
    return false;
  }
}