# Form Migration Guide

**Date**: 2025-09-24
**Version**: 1.0
**Status**: Active

## Overview

This guide provides step-by-step instructions for migrating existing forms to our established React Hook Form + Zod pattern. The migration patterns have been proven through successful migrations of StatusReportForm, EditGroupForm, and AppointmentForm.

## Prerequisites

Before starting a form migration, ensure you understand:
- [Form Patterns Documentation](./2025-09-24_form-patterns.md)
- [Error Handling & Validation System](./2025-09-23_error-handling-validation-system.md)
- Basic React Hook Form and Zod concepts

## Migration Checklist

### Phase 1: Analysis & Planning
- [ ] Identify all form fields and their current validation rules
- [ ] Map existing validation to Zod schema patterns
- [ ] Identify custom validations (rich text, file uploads, conditional logic)
- [ ] Plan field reference structure for error scrolling
- [ ] Review existing form submission logic

### Phase 2: Schema Creation
- [ ] Create Zod schema with German error messages
- [ ] Define TypeScript interface from schema
- [ ] Test schema validation with sample data
- [ ] Ensure schema matches API expectations

### Phase 3: Form Infrastructure
- [ ] Replace useForm with useZodForm
- [ ] Implement FormBase wrapper
- [ ] Set up field references and order
- [ ] Configure custom validations
- [ ] Update form submission handler

### Phase 4: Field Migration
- [ ] Replace TextField with ValidatedTextField
- [ ] Update complex components with ValidatedController
- [ ] Add FieldError components for custom validations
- [ ] Organize fields into FormSection components
- [ ] Ensure proper props passing

### Phase 5: Testing & Validation
- [ ] Test all validation scenarios
- [ ] Verify error scrolling behavior
- [ ] Test form submission with valid/invalid data
- [ ] Check file upload functionality (if applicable)
- [ ] Validate TypeScript compilation
- [ ] Run existing tests and update as needed

## Step-by-Step Migration Process

### Step 1: Create Zod Schema

Start by analyzing your existing validation rules and creating a Zod schema:

```tsx
// Before - Custom validation
const validateEmail = (email: string) => {
  return /\S+@\S+\.\S+/.test(email) ? null : 'Invalid email format';
};

// After - Zod schema
const formSchema = z.object({
  email: z.string()
    .min(1, 'E-Mail ist erforderlich')
    .email('Ungültige E-Mail-Adresse'),
  title: z.string()
    .min(1, 'Titel ist erforderlich')
    .max(100, 'Titel darf maximal 100 Zeichen haben')
});

type FormData = z.infer<typeof formSchema>;
```

### Step 2: Replace useForm Hook

Replace the existing useForm hook with useZodForm:

```tsx
// Before
const {
  control,
  handleSubmit,
  formState: { errors, isSubmitting },
  reset
} = useForm<FormData>();

// After
const form = useZodForm({
  schema: formSchema,
  defaultValues: {
    email: initialValues?.email || '',
    title: initialValues?.title || ''
  },
  onSubmit: handleFormSubmit
});

const { control } = form;
```

### Step 3: Set Up FormBase Infrastructure

Add required infrastructure for FormBase:

```tsx
// Field references for error scrolling
const fieldRefs: FieldRefMap = useMemo(() => ({
  'email': useRef<HTMLDivElement>(null),
  'title': useRef<HTMLDivElement>(null)
}), []);

// Field order for error scrolling priority
const fieldOrder: string[] = useMemo(() => [
  'email', 'title'
], []);

// Custom validations for complex fields
const customValidations: CustomValidationEntry[] = useMemo(() => [
  {
    field: 'customField',
    isValid: /* validation logic */,
    message: 'Error message'
  }
], [dependencies]);
```

### Step 4: Replace Form Wrapper

Replace existing form structure with FormBase:

```tsx
// Before
<form onSubmit={handleSubmit(onSubmit)}>
  {/* form content */}
  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Loading...' : 'Submit'}
  </button>
</form>

// After
<FormBase
  formMethods={form}
  onSubmit={handleFormSubmit}
  fieldRefs={fieldRefs}
  fieldOrder={fieldOrder}
  customValidations={customValidations}
  submitButtonText="Submit"
>
  {/* form content */}
</FormBase>
```

### Step 5: Migrate Form Fields

Replace individual field components:

```tsx
// Before - Manual TextField with Controller
<Controller
  name="email"
  control={control}
  rules={{ required: 'Email is required' }}
  render={({ field, fieldState: { error } }) => (
    <TextField
      {...field}
      label="Email"
      error={!!error}
      helperText={error?.message}
    />
  )}
/>

// After - ValidatedTextField
<ValidatedTextField
  name="email"
  label="E-Mail"
  fullWidth
  margin="normal"
/>
```

### Step 6: Handle Complex Fields

For fields requiring custom validation:

```tsx
// Rich text editor example
<RichTextEditor
  value={richTextContent}
  onChange={handleRichTextChange}
/>
<FieldError
  name="content"
  mode="block"
  customValidations={customValidations}
/>

// Select dropdown example
<ValidatedController
  name="category"
  useFormControl
  render={({ field, hasError }) => (
    <Select {...field} error={hasError}>
      {/* options */}
    </Select>
  )}
/>
```

### Step 7: Update Form Sections

Organize fields into FormSection components:

```tsx
<FormSection
  title="Contact Information"
  helpTitle="How we'll reach you"
  helpText={<Typography variant="body2">...</Typography>}
>
  <ValidatedTextField name="email" label="E-Mail" />
  <ValidatedTextField name="phone" label="Phone" />
</FormSection>
```

### Step 8: Update Submission Handler

Update the form submission logic:

```tsx
async function handleFormSubmit(data: FormData) {
  // Data is already validated by Zod
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (typeof value === 'boolean') {
      formData.append(key, value.toString());
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });

  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Submission failed');
  }
}
```

## Common Migration Scenarios

### Scenario 1: Simple Contact Form

**Before**: Basic form with email, name, message
**Complexity**: Low
**Migration time**: 1-2 hours

```tsx
// Key changes:
// - Create simple Zod schema
// - Replace TextField components
// - Add FormBase wrapper
```

### Scenario 2: Complex Multi-Section Form

**Before**: Large form with multiple sections, file uploads, conditional fields
**Complexity**: High
**Migration time**: 4-8 hours

```tsx
// Key changes:
// - Break into FormSection components
// - Handle file upload validation
// - Implement conditional field logic
// - Set up comprehensive custom validations
```

### Scenario 3: Edit Form with Pre-populated Data

**Before**: Form that edits existing data
**Complexity**: Medium
**Migration time**: 2-4 hours

```tsx
// Key changes:
// - Handle initial values properly
// - Implement mode="edit" in FormBase
// - Add onCancel handler
// - Ensure data formatting consistency
```

## Migration Patterns by Field Type

### Text Fields
```tsx
// Before
<TextField
  name="title"
  label="Title"
  error={!!errors.title}
  helperText={errors.title?.message}
/>

// After
<ValidatedTextField
  name="title"
  label="Titel"
/>
```

### Email Fields
```tsx
// Schema
email: z.string().email('Ungültige E-Mail-Adresse').optional()

// Component
<ValidatedTextField
  name="email"
  label="E-Mail"
  type="email"
/>
```

### Number Fields
```tsx
// Schema
quantity: z.number().min(1, 'Mindestens 1').max(100, 'Maximal 100')

// Component
<ValidatedTextField
  name="quantity"
  label="Anzahl"
  type="number"
  inputProps={{ min: 1, max: 100 }}
/>
```

### Date Fields
```tsx
// Schema (as string for form compatibility)
startDate: z.string().min(1, 'Startdatum ist erforderlich')

// Component
<ValidatedTextField
  name="startDate"
  label="Startdatum"
  type="date"
  InputLabelProps={{ shrink: true }}
/>
```

### Select Fields
```tsx
// Schema
category: z.enum(['tech', 'design', 'business'], {
  errorMap: () => ({ message: 'Bitte wählen Sie eine Kategorie' })
})

// Component
<ValidatedController
  name="category"
  useFormControl
  render={({ field, hasError }) => (
    <Select {...field} error={hasError}>
      <MenuItem value="tech">Technologie</MenuItem>
      <MenuItem value="design">Design</MenuItem>
    </Select>
  )}
/>
```

### Boolean Fields
```tsx
// Schema
isActive: z.boolean().optional().default(false)

// Component
<Controller
  name="isActive"
  control={control}
  render={({ field }) => (
    <FormControlLabel
      control={<Checkbox {...field} checked={field.value} />}
      label="Aktiv"
    />
  )}
/>
```

### Rich Text Fields
```tsx
// Custom validation (not in schema)
const customValidations = useMemo(() => [
  {
    field: 'content',
    isValid: richTextContent.length > 0,
    message: 'Inhalt ist erforderlich'
  }
], [richTextContent]);

// Component
<RichTextEditor
  value={richTextContent}
  onChange={handleRichTextChange}
/>
<FieldError name="content" mode="block" customValidations={customValidations} />
```

### File Upload Fields
```tsx
// Custom validation
const customValidations = useMemo(() => [
  {
    field: 'files',
    isValid: !fileUploadError,
    message: fileUploadError || 'Datei-Upload-Fehler'
  }
], [fileUploadError]);

// Component
<FileUpload onFilesSelect={setFiles} onError={setFileUploadError} />
<FieldError name="files" mode="block" customValidations={customValidations} />
```

## Type Alignment Issues

### Common Type Mismatches

#### Date Objects vs Strings
```tsx
// Problem: Interface expects Date, schema expects string
interface FormData {
  startDate: Date; // ❌
}
const schema = z.object({
  startDate: z.string().datetime() // ❌
});

// Solution: Align types
interface FormData {
  startDate: string; // ✅
}
const schema = z.object({
  startDate: z.string().datetime() // ✅
});
```

#### Optional vs Required Fields
```tsx
// Problem: Schema optional but interface required
interface FormData {
  email: string; // ❌ Required in interface
}
const schema = z.object({
  email: z.string().optional() // ❌ Optional in schema
});

// Solution: Make interface match schema
interface FormData {
  email?: string; // ✅ Optional in both
}
```

## Testing Migration

### Unit Tests
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyMigratedForm from './MyMigratedForm';

describe('MyMigratedForm', () => {
  it('validates required fields', async () => {
    render(<MyMigratedForm />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/titel ist erforderlich/i)).toBeInTheDocument();
    });
  });

  it('submits valid data', async () => {
    const mockSubmit = jest.fn();
    render(<MyMigratedForm onSubmit={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/titel/i), {
      target: { value: 'Test Title' }
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: 'Test Title',
        // ... other fields
      });
    });
  });
});
```

### Manual Testing Checklist
- [ ] All fields validate correctly
- [ ] Error messages appear in German
- [ ] Error scrolling works to first invalid field
- [ ] Form submission works with valid data
- [ ] Form submission fails gracefully with invalid data
- [ ] File uploads work (if applicable)
- [ ] Form reset functionality works
- [ ] Cancel functionality works (edit mode)
- [ ] Success messages display correctly
- [ ] Form is accessible (keyboard navigation, screen reader)

## Troubleshooting Common Issues

### TypeScript Compilation Errors

**Error**: `Type 'string | undefined' is not assignable to type 'string'`
```tsx
// Problem: Schema allows undefined but interface doesn't
interface FormData {
  title: string; // Required
}
const schema = z.object({
  title: z.string().optional() // Optional
});

// Solution: Align the types
interface FormData {
  title?: string; // Make optional
}
// OR
const schema = z.object({
  title: z.string().min(1, 'Required') // Make required
});
```

**Error**: `Cannot find name 'CustomValidationEntry'`
```tsx
// Solution: Import from FormBase
import { CustomValidationEntry } from '@/components/forms/shared/FormBase';
```

### Runtime Validation Issues

**Issue**: Zod validation not working
```tsx
// Check: Ensure schema is properly defined
const schema = z.object({
  email: z.string().email('Invalid email') // ✅
});

// Check: Ensure useZodForm is properly configured
const form = useZodForm({
  schema, // ✅ Pass schema
  defaultValues: { email: '' },
  onSubmit: handleSubmit
});
```

**Issue**: Custom validations not displaying
```tsx
// Check: Ensure customValidations are memoized
const customValidations = useMemo(() => [
  // validations
], [dependencies]); // ✅ Include all dependencies

// Check: Ensure customValidations are passed to FormBase
<FormBase
  customValidations={customValidations} // ✅
  // ... other props
>
```

**Issue**: Error scrolling not working
```tsx
// Check: Ensure fieldRefs includes all fields
const fieldRefs: FieldRefMap = useMemo(() => ({
  'email': emailRef,
  'title': titleRef, // ✅ Must include all form fields
  'description': descriptionRef
}), []);

// Check: Ensure refs are attached to DOM elements
<Box ref={emailRef}> // ✅ Attach to container
  <ValidatedTextField name="email" />
</Box>
```

### Form Submission Issues

**Issue**: File uploads not working
```tsx
// Check: Ensure files are passed to FormBase
<FormBase
  files={fileList} // ✅ Pass file list
  onSubmit={handleSubmit}
>

// Check: Ensure submission handler receives files
async function handleSubmit(data: FormData, files?: (File | Blob)[]) {
  // Handle files parameter
}
```

## Migration Examples

### Complete Migration Example

See the [FormTemplate.tsx](../src/components/forms/templates/FormTemplate.tsx) for a comprehensive example of the migrated form pattern.

### Real Migration Examples
- **StatusReportForm**: Simple form with rich text and file uploads
- **AppointmentForm**: Complex form with conditional fields and custom validation
- **EditGroupForm**: Edit form with existing data population

## Performance Considerations

### Before Migration
- Forms may have excessive re-renders
- Validation may be inconsistent
- Error handling may be scattered

### After Migration
- Zod validation is optimized and fast
- FormBase provides consistent re-render optimization
- useZodForm hooks are properly memoized

### Optimization Tips
```tsx
// ✅ Memoize expensive computations
const fieldRefs = useMemo(() => ({
  // field refs
}), []);

const customValidations = useMemo(() => [
  // validations
], [dependencies]);

// ✅ Use useCallback for handlers
const handleRichTextChange = useCallback((value: string) => {
  setValue('content', value);
}, [setValue]);
```

## Post-Migration Cleanup

After successful migration:

1. **Remove old validation code**:
   ```tsx
   // Remove custom validation functions
   // Remove manual error state management
   // Remove custom form submission logic
   ```

2. **Update tests**:
   ```tsx
   // Update test imports
   // Update test assertions for new error messages
   // Add tests for new validation scenarios
   ```

3. **Documentation**:
   ```tsx
   // Update component documentation
   // Update API documentation if form contracts changed
   // Update user guides if UI changed significantly
   ```

4. **Performance monitoring**:
   ```tsx
   // Check bundle size impact
   // Monitor form submission metrics
   // Verify user experience metrics
   ```

## Getting Help

For migration assistance:

1. **Documentation**: Review [Form Patterns Documentation](./2025-09-24_form-patterns.md)
2. **Examples**: Study existing migrated forms (StatusReportForm, AppointmentForm)
3. **Template**: Use [FormTemplate.tsx](../src/components/forms/templates/FormTemplate.tsx) as reference
4. **Testing**: Follow the testing patterns in existing form tests

## Migration Success Criteria

A migration is considered successful when:

- ✅ TypeScript compilation passes without errors
- ✅ All existing form functionality works identically
- ✅ Validation messages are in German and user-friendly
- ✅ Error scrolling works to first invalid field
- ✅ Form submission handles success/error states correctly
- ✅ File uploads work correctly (if applicable)
- ✅ Form reset and cancel functionality works
- ✅ All tests pass
- ✅ Code complexity is reduced compared to original
- ✅ Performance is maintained or improved

Following this guide ensures consistent, maintainable forms that align with our established patterns and provide an excellent user experience.