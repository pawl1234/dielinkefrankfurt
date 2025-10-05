# Form Patterns Documentation

**Date**: 2025-09-24
**Version**: 1.0
**Status**: Active

## Overview

This document describes the established form patterns in our React/Next.js application using React Hook Form with Zod validation. These patterns have been proven through successful migrations of StatusReportForm, EditGroupForm, and AppointmentForm.

## Core Architecture

### Tech Stack
- **React Hook Form**: Form state management and validation
- **Zod**: Schema-based validation with TypeScript inference
- **Material-UI (MUI)**: UI components and styling
- **Custom Hooks**: Enhanced validation and submission handling

### Key Components
- `useZodForm` - Enhanced React Hook Form with Zod integration
- `FormBase` - Wrapper for consistent form layout and error handling
- `ValidatedTextField` - Automatic validation integration for text inputs
- `ValidatedController` - For complex controlled components
- `FieldError` - Consistent error display
- `FormSection` - Standardized section layout with help text

## Quick Start Guide

### 1. Basic Form Setup

```tsx
'use client';

import { useMemo } from 'react';
import { z } from 'zod';
import { useZodForm } from '@/hooks/useZodForm';
import FormBase, { FieldRefMap, CustomValidationEntry } from '@/components/forms/shared/FormBase';
import FormSection from '@/components/forms/shared/FormSection';
import ValidatedTextField from '@/components/forms/shared/ValidatedTextField';

// Define Zod schema
const myFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  email: z.string().email('Invalid email format'),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

type MyFormData = z.infer<typeof myFormSchema>;

export default function MyForm() {
  // Form initialization
  const form = useZodForm({
    schema: myFormSchema,
    defaultValues: {
      title: '',
      email: '',
      description: ''
    },
    onSubmit: handleFormSubmit
  });

  // Field references for error scrolling
  const fieldRefs: FieldRefMap = useMemo(() => ({
    'title': useRef<HTMLDivElement>(null),
    'email': useRef<HTMLDivElement>(null),
    'description': useRef<HTMLDivElement>(null)
  }), []);

  const fieldOrder: string[] = useMemo(() => [
    'title', 'email', 'description'
  ], []);

  async function handleFormSubmit(data: MyFormData) {
    // Handle form submission
    console.log('Form data:', data);
  }

  return (
    <FormBase
      formMethods={form}
      onSubmit={handleFormSubmit}
      fieldRefs={fieldRefs}
      fieldOrder={fieldOrder}
      submitButtonText="Submit"
    >
      <FormSection title="Basic Information">
        <ValidatedTextField
          name="title"
          label="Title"
          fullWidth
          margin="normal"
        />
        <ValidatedTextField
          name="email"
          label="Email"
          type="email"
          fullWidth
          margin="normal"
        />
        <ValidatedTextField
          name="description"
          label="Description"
          multiline
          rows={4}
          fullWidth
          margin="normal"
        />
      </FormSection>
    </FormBase>
  );
}
```

### 2. Advanced Form with Custom Validations

```tsx
export default function AdvancedForm() {
  const [richTextContent, setRichTextContent] = useState('');
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const form = useZodForm({
    schema: myFormSchema,
    defaultValues: { /* ... */ },
    onSubmit: handleFormSubmit
  });

  // Custom validations for complex fields
  const customValidations: CustomValidationEntry[] = useMemo(() => [
    {
      field: 'content',
      isValid: !!richTextContent &&
               richTextContent.trim() !== '' &&
               richTextContent.trim() !== '<p></p>',
      message: 'Rich text content is required'
    },
    {
      field: 'files',
      isValid: !fileUploadError,
      message: fileUploadError || 'File upload error'
    }
  ], [richTextContent, fileUploadError]);

  return (
    <FormBase
      formMethods={form}
      onSubmit={handleFormSubmit}
      fieldRefs={fieldRefs}
      fieldOrder={fieldOrder}
      customValidations={customValidations}
    >
      {/* Form content */}
    </FormBase>
  );
}
```

## Component Patterns

### ValidatedTextField
Use for standard text inputs that map directly to Zod schema fields:

```tsx
<ValidatedTextField
  name="title"
  label="Title"
  fullWidth
  margin="normal"
  showCharacterCount // Shows character count if maxLength is set
/>
```

### ValidatedController
Use for complex controlled components:

```tsx
<ValidatedController
  name="category"
  useFormControl
  formControlProps={{
    fullWidth: true,
    sx: { mt: 1 }
  }}
  render={({ field, hasError }) => (
    <Select
      {...field}
      error={hasError}
      displayEmpty
    >
      <MenuItem value="">Select Category</MenuItem>
      {categories.map(cat => (
        <MenuItem key={cat.id} value={cat.id}>
          {cat.name}
        </MenuItem>
      ))}
    </Select>
  )}
/>
```

### FieldError
Use for custom validation errors not covered by Zod:

```tsx
<FieldError
  name="richTextContent"
  mode="block"
  customValidations={customValidations}
/>
```

### FormSection
Use to group related fields with consistent styling:

```tsx
<FormSection
  title="Contact Information"
  helpTitle="How we'll reach you"
  helpText={<Typography variant="body2">...</Typography>}
>
  {/* Form fields */}
</FormSection>
```

## Zod Schema Patterns

### Basic Field Types
```tsx
const schema = z.object({
  // Required text (1-100 chars)
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),

  // Optional text with default
  description: z.string().optional().default(''),

  // Email validation
  email: z.string().email('Invalid email format'),

  // Number with range
  age: z.number().min(18, 'Must be 18+').max(120, 'Invalid age'),

  // Date string (for forms)
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),

  // Boolean
  isActive: z.boolean().default(false),

  // Enum
  status: z.enum(['draft', 'published', 'archived'])
});
```

### Complex Validations
```tsx
const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

## Custom Validation Patterns

### When to Use Custom Validations
Use custom validations for:
- Rich text editors (content validation)
- File uploads (error handling)
- Complex conditional logic
- Multi-field dependencies not handled by Zod

### Custom Validation Structure
```tsx
const customValidations: CustomValidationEntry[] = useMemo(() => [
  {
    field: 'fieldName',
    isValid: /* validation logic */,
    message: 'Error message if invalid'
  }
], [dependencies]);
```

### Common Custom Validation Examples

#### Rich Text Editor
```tsx
{
  field: 'content',
  isValid: !!editorContent &&
           editorContent.trim() !== '' &&
           editorContent.trim() !== '<p></p>' &&
           editorContent.length <= maxLength,
  message: editorContent.length > maxLength
    ? `Content too long. Maximum ${maxLength} characters (current: ${editorContent.length})`
    : 'Content is required'
}
```

#### Conditional File Upload
```tsx
{
  field: 'coverImage',
  isValid: !isFeatured || !!coverImage || !!existingCoverImage,
  message: 'Cover image is required for featured items'
}
```

#### File Upload Errors
```tsx
{
  field: 'files',
  isValid: !fileUploadError,
  message: fileUploadError || 'File upload error'
}
```

## Error Handling Patterns

### Display Modes
- **Inline**: Use `ValidatedTextField` for automatic inline error display
- **Block**: Use `<FieldError mode="block" />` for standalone error messages
- **Custom**: Use `useFieldError` hook for custom error handling

### Error Scrolling
FormBase automatically scrolls to the first error using fieldRefs and fieldOrder:

```tsx
const fieldRefs: FieldRefMap = useMemo(() => ({
  'field1': ref1,
  'field2': ref2,
  'field3': ref3
}), []);

const fieldOrder: string[] = useMemo(() => [
  'field1', 'field2', 'field3'
], []);
```

## Form Submission Patterns

### Basic Submission
```tsx
async function handleFormSubmit(data: FormData) {
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Submission failed');
  }
}
```

### File Upload Submission
```tsx
async function handleFormSubmit(data: FormData, files?: (File | Blob)[]) {
  const formData = new FormData();

  // Add form fields
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else if (typeof value === 'boolean') {
      formData.append(key, value.toString());
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });

  // Add files
  if (files?.length) {
    files.forEach((file, index) =>
      formData.append(`files[${index}]`, file)
    );
  }

  const response = await fetch('/api/endpoint', {
    method: 'POST',
    body: formData
  });

  if (response.status === 413) {
    throw new Error('Files too large. Please reduce file size.');
  }

  if (!response.ok) {
    throw new Error('Submission failed');
  }
}
```

## TypeScript Patterns

### Form Interface from Zod
```tsx
const formSchema = z.object({
  title: z.string(),
  email: z.string().email()
});

type FormData = z.infer<typeof formSchema>;
// Equivalent to: { title: string; email: string }
```

### Component Props
```tsx
interface MyFormProps {
  initialValues?: Partial<FormData>;
  onSubmit?: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}
```

### Field References
```tsx
const fieldRefs: FieldRefMap = useMemo(() => ({
  'title': useRef<HTMLDivElement>(null),
  'email': useRef<HTMLDivElement>(null)
}), []);
```

## Testing Patterns

### Component Testing
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MyForm from './MyForm';

describe('MyForm', () => {
  it('validates required fields', async () => {
    render(<MyForm />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('submits valid data', async () => {
    const mockSubmit = jest.fn();
    render(<MyForm onSubmit={mockSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Title' }
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        title: 'Test Title',
        email: '',
        description: ''
      });
    });
  });
});
```

## Performance Considerations

### Optimization Tips
1. **Memoize expensive computations**: Use `useMemo` for fieldRefs, fieldOrder, and customValidations
2. **Debounce validation**: Zod validation is fast, but consider debouncing for complex schemas
3. **Lazy load large forms**: Split large forms into steps or lazy-load sections
4. **Minimize re-renders**: Use `useCallback` for event handlers

### Memory Management
```tsx
// ✅ Good - memoized references
const fieldRefs: FieldRefMap = useMemo(() => ({
  'field1': useRef<HTMLDivElement>(null)
}), []);

// ❌ Bad - creates new object on every render
const fieldRefs = {
  'field1': useRef<HTMLDivElement>(null)
};
```

## Accessibility Patterns

### ARIA Labels
```tsx
<ValidatedTextField
  name="email"
  label="Email Address"
  inputProps={{
    'aria-describedby': 'email-helper-text'
  }}
  helperText={<span id="email-helper-text">We'll never share your email</span>}
/>
```

### Focus Management
FormBase automatically manages focus on validation errors through error scrolling.

### Screen Reader Support
- All form fields have proper labels
- Error messages are announced
- Form sections have appropriate headings

## Common Pitfalls and Solutions

### 1. Type Mismatches
**Problem**: Zod schema expects string dates but interface uses Date objects
```tsx
// ❌ Mismatch
interface FormData {
  startDate: Date;
}
const schema = z.object({
  startDate: z.string().datetime()
});
```

**Solution**: Align interface with schema
```tsx
// ✅ Aligned
interface FormData {
  startDate: string;
}
const schema = z.object({
  startDate: z.string().datetime()
});
```

### 2. Custom Validation Dependencies
**Problem**: Custom validations not updating when dependencies change
```tsx
// ❌ Missing dependencies
const customValidations = useMemo(() => [...], []);
```

**Solution**: Include all dependencies
```tsx
// ✅ Complete dependencies
const customValidations = useMemo(() => [...], [
  editorContent, fileUploadError, conditionalFlag
]);
```

### 3. Field Reference Errors
**Problem**: Missing field references cause error scrolling to fail
```tsx
// ❌ Incomplete fieldRefs
const fieldRefs = { 'field1': ref1 }; // Missing field2, field3
```

**Solution**: Include all form fields
```tsx
// ✅ Complete fieldRefs
const fieldRefs: FieldRefMap = useMemo(() => ({
  'field1': ref1,
  'field2': ref2,
  'field3': ref3
}), []);
```

## Migration from Legacy Forms

See the [Form Migration Guide](./2025-09-24_form-migration-guide.md) for detailed instructions on migrating existing forms to this pattern.

## Examples

- **StatusReportForm**: Simple form with file uploads and rich text
- **AppointmentForm**: Complex form with conditional fields and custom validation
- **EditGroupForm**: Edit form with existing data population

## Further Reading

- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Material-UI Forms](https://mui.com/material-ui/react-text-field/)
- [Validation System Documentation](./2025-09-23_error-handling-validation-system.md)