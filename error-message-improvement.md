# Error Message Improvement Plan

**Date**: 2025-09-23
**Issue**: Inconsistent error handling with mixed German/English messages across forms
**Goal**: Streamline all error messages into a unified German system with consistent display

## Current State Analysis

### Frontend Validation (German) ✅
- `useValidationErrors` hook in `src/hooks/useValidationErrors.ts`
- German field labels: "**Datei-Anhänge:** Error message"
- Integrated with FormErrorMessage for prominent display
- Works correctly for React Hook Form + Custom validations

### Server-Side Validation (Mixed Languages) ❌

#### 1. Groups API (`/api/groups/submit`)
**File**: `src/lib/group-handlers.ts` - `validateGroupData()`
**Language**: **ENGLISH** (Problem!)
```javascript
// Current English messages:
if (!data.name) return 'Group name is required';
if (data.name.length < 3 || data.name.length > 100) return 'Group name must be between 3 and 100 characters';
if (!data.description) return 'Group description is required';
if (data.description.length < 50 || data.description.length > 5000) return 'Group description must be between 50 and 5000 characters';
if (!data.responsiblePersons || data.responsiblePersons.length === 0) return 'At least one responsible person is required';
return 'First name must be between 2 and 50 characters for all responsible persons';
return 'Last name must be between 2 and 50 characters for all responsible persons';
return 'Valid email is required for all responsible persons';
```

#### 2. Status Reports API (`/api/status-reports/submit`)
**File**: `src/lib/group-handlers.ts` - `validateStatusReportData()`
**Language**: **GERMAN** ✅
```javascript
// Current German messages:
if (!data.groupId) return 'Gruppen-ID ist erforderlich';
if (!data.title) return 'Berichtstitel ist erforderlich';
// Uses configurable limits from newsletter settings
```

#### 3. Appointments API (`/api/appointments/submit`)
**File**: `src/lib/appointment-handlers.ts` - `createAppointment()`
**Language**: **GERMAN** ✅
```javascript
// Current German messages:
if (!title) validationErrors.title = 'Titel ist erforderlich';
if (!mainText) validationErrors.mainText = 'Beschreibung ist erforderlich';
if (!startDateTime) validationErrors.startDateTime = 'Startdatum und -uhrzeit sind erforderlich';

// File validation uses getLocalizedErrorMessage() with translation map
getLocalizedErrorMessage('File size exceeds limit') // → 'Dateigröße überschreitet das Limit'
getLocalizedErrorMessage('Unsupported file type') // → 'Nicht unterstützter Dateityp'
```

### Error Translation System
**File**: `src/lib/errors.ts`
- Contains `errorTranslations` map for German translations
- `getLocalizedErrorMessage()` function for translation
- Used in appointment-handlers.ts for file upload errors

## Problems Identified

1. **Language Inconsistency**: Groups API uses English, others use German
2. **Bypass useValidationErrors**: Server errors appear as generic submission errors
3. **No Field Label Integration**: Server validation errors don't get German field labels ("**Feld:** Nachricht")
4. **Scattered Error Messages**: Error messages spread across multiple files without centralization
5. **No Unified Display**: Server errors show differently than frontend validation errors

## Current Error Flow

### Frontend Validation
```
React Hook Form → useValidationErrors → FormErrorMessage
Custom Validations → useValidationErrors → FormErrorMessage
Result: "**Datei-Anhänge:** Nicht unterstützter Dateityp"
```

### Server Validation (Current Problem)
```
Server validation → Plain error message → Generic FormErrorMessage
Result: "Group description must be between 50 and 5000 characters" (English, no field label)
```

## Solution: 4-Phase Streamlining Plan

### Phase 1: Centralize Error Messages
**Create**: `src/lib/error-messages.ts`

**Purpose**: Single source of truth for all error messages

**Content**:
```typescript
// Field labels (extend from useValidationErrors.ts)
export const fieldLabels = {
  // Group form fields
  'name': 'Gruppenname',
  'description': 'Beschreibung',
  'responsiblePersons': 'Verantwortliche Personen',

  // Appointment form fields
  'title': 'Titel',
  'mainText': 'Beschreibung',
  'startDateTime': 'Startdatum',
  // ... all other fields
};

// Standard validation messages
export const validationMessages = {
  required: (field: string) => `${fieldLabels[field]} ist erforderlich`,
  minLength: (field: string, min: number) => `${fieldLabels[field]} muss mindestens ${min} Zeichen lang sein`,
  maxLength: (field: string, max: number) => `${fieldLabels[field]} darf maximal ${max} Zeichen lang sein`,
  between: (field: string, min: number, max: number) => `${fieldLabels[field]} muss zwischen ${min} und ${max} Zeichen lang sein`,
  email: (field: string) => `${fieldLabels[field]} muss eine gültige E-Mail-Adresse sein`,
  // ... more patterns
};

// File upload specific messages
export const fileMessages = {
  sizeExceeded: 'Dateigröße überschreitet das Limit',
  unsupportedType: 'Nicht unterstützter Dateityp',
  // ... more file errors
};
```

### Phase 2: Standardize Server-Side Validation

**Update**: `src/lib/group-handlers.ts`
```typescript
// Replace validateGroupData() English messages with German using centralized system
import { validationMessages, fieldLabels } from './error-messages';

export function validateGroupData(data: Partial<GroupCreateData>): string | null {
  if (!data.name) return validationMessages.required('name');
  if (data.name.length < 3 || data.name.length > 100) return validationMessages.between('name', 3, 100);
  if (!data.description) return validationMessages.required('description');
  if (data.description.length < 50 || data.description.length > 5000) return validationMessages.between('description', 50, 5000);
  // ... convert all English messages to German
}
```

**Update**: `src/lib/appointment-handlers.ts`
```typescript
// Standardize to use centralized error messages
import { validationMessages } from './error-messages';

if (!title) validationErrors.title = validationMessages.required('title');
if (!mainText) validationErrors.mainText = validationMessages.required('mainText');
```

### Phase 3: Integrate Server Errors with useValidationErrors

**Enhance**: `src/hooks/useValidationErrors.ts`
```typescript
// Add server validation error processing
interface UseValidationErrorsProps<TFormValues extends FieldValues> {
  formErrors: FieldErrors<TFormValues>;
  customValidations: CustomValidationEntry[];
  submissionError: string | null;
  serverFieldErrors?: Record<string, string>; // NEW: Server field errors
  isSubmitted: boolean;
}

// Process server field errors into validation errors array
if (serverFieldErrors) {
  Object.entries(serverFieldErrors).forEach(([fieldName, message]) => {
    const label = fieldLabels[fieldName] || fieldName;
    errors.push({
      field: fieldName,
      label,
      message
    });
  });
}
```

**Update**: Form submission error handling in all forms
```typescript
// In form submit catch blocks, parse server validation errors
catch (error) {
  if (error.response?.data?.fieldErrors) {
    // Server returned structured field errors
    setServerFieldErrors(error.response.data.fieldErrors);
  } else {
    // Generic server error
    setSubmissionError(error.message);
  }
}
```

### Phase 4: Enhanced API Error Responses

**Update**: All API routes to return structured field errors
```typescript
// In API route validation error handling
return NextResponse.json({
  success: false,
  error: 'Validation failed',
  fieldErrors: {
    'name': 'Gruppenname ist erforderlich',
    'description': 'Beschreibung muss zwischen 50 und 5000 Zeichen lang sein'
  }
}, { status: 400 });
```

## Files to Modify

### New Files
- `src/lib/error-messages.ts` - Centralized error message system

### Modified Files
- `src/lib/group-handlers.ts` - Convert validateGroupData() to German
- `src/lib/appointment-handlers.ts` - Standardize error messages
- `src/hooks/useValidationErrors.ts` - Add server error integration
- `src/components/forms/appointments/AppointmentForm.tsx` - Enhanced error handling
- `src/components/forms/status-reports/StatusReportForm.tsx` - Enhanced error handling
- `src/components/forms/groups/GroupRequestForm.tsx` - Enhanced error handling
- `src/app/api/groups/submit/route.ts` - Return structured field errors
- `src/app/api/status-reports/submit/route.ts` - Return structured field errors
- `src/app/api/appointments/submit/route.ts` - Return structured field errors

## Expected Results

### Before (Current State)
```
Frontend Error: "**Datei-Anhänge:** Nicht unterstützter Dateityp" ✅
Server Error: "Group description must be between 50 and 5000 characters" ❌
```

### After (Improved State)
```
Frontend Error: "**Datei-Anhänge:** Nicht unterstützter Dateityp" ✅
Server Error: "**Beschreibung:** Beschreibung muss zwischen 50 und 5000 Zeichen lang sein" ✅
```

### Benefits
- ✅ **Single Language**: All German error messages
- ✅ **Consistent Display**: All errors show with field labels in FormErrorMessage
- ✅ **DRY Principle**: One centralized error message system
- ✅ **Better UX**: Clear, consistent error communication across all forms
- ✅ **Maintainable**: Easy to update messages in one place
- ✅ **Scalable**: New forms automatically get consistent error handling

## Implementation Notes

1. **Backward Compatibility**: Keep existing error handling working during transition
2. **Testing**: Update all tests to expect German error messages
3. **Validation**: Ensure all error paths are covered by centralized system
4. **Field Mapping**: Ensure all form fields have German labels in fieldLabels map
5. **Edge Cases**: Handle compound validation errors (e.g., array fields, nested objects)

## Priority

**High Priority**: Groups API validation (currently English) needs immediate attention as it affects user experience.

**Medium Priority**: Integration with useValidationErrors system for consistent display.

**Low Priority**: Centralization and code cleanup (improves maintainability but doesn't affect user experience).

## Related Issues

- File upload errors already integrated with useValidationErrors ✅
- FormErrorMessage component supports multiple errors with field labels ✅
- Error translation system exists in `src/lib/errors.ts` but not consistently used
- Server-side validation bypasses frontend error collection system
