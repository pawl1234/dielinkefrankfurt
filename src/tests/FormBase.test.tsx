import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import FormBase from '../components/forms/base/FormBase';
import { FormValidationHelper } from '../components/forms/utils/FormValidationHelper';
import '@testing-library/jest-dom';

// Mock window.scrollTo
global.scrollTo = jest.fn();

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock Element.focus
Element.prototype.focus = jest.fn();

// Setup a test form component using FormBase
function TestForm() {
  // Create refs for field scrolling
  const nameRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Test form state
  const [content, setContent] = React.useState('');

  // Form setup with react-hook-form
  const methods = useForm({
    defaultValues: {
      name: '',
      email: ''
    },
    mode: 'onSubmit'
  });

  const { register, formState: { errors } } = methods;

  // Field refs map for error scrolling
  const fieldRefs = {
    'name': nameRef,
    'email': emailRef,
    'content': contentRef
  };

  // Custom validations for fields not controlled by react-hook-form
  const customValidations = [
    { 
      field: 'content', 
      isValid: !!content && content.trim() !== '' 
    }
  ];

  // Form submission handler
  const handleSubmit = async (data: { name?: string; email?: string }) => {
    if (!data.name) {
      throw new Error('Name is required');
    }
    
    if (!data.email) {
      throw new Error('Email is required');
    }
    
    if (!content) {
      throw new Error('Content is required');
    }
    
    return Promise.resolve();
  };

  // Reset handler
  const handleReset = () => {
    setContent('');
  };

  return (
    <FormBase
      formMethods={methods}
      onSubmit={handleSubmit}
      onReset={handleReset}
      submitButtonText="Submit"
      fieldRefs={fieldRefs}
      customValidations={customValidations}
      validateBeforeSubmit={true}
    >
      <div ref={nameRef}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          {...register('name', { required: 'Name is required' })}
          data-testid="name-input"
        />
        {errors.name && <span role="alert">{errors.name.message}</span>}
      </div>

      <div ref={emailRef}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          {...register('email', { 
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format'
            }
          })}
          data-testid="email-input"
        />
        {errors.email && <span role="alert">{errors.email.message}</span>}
      </div>

      <div ref={contentRef}>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          data-testid="content-input"
        />
        {!content && <span role="alert">Content is required</span>}
      </div>
    </FormBase>
  );
}

describe('FormBase Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with submit and reset buttons', () => {
    render(<TestForm />);
    
    expect(screen.getByTestId('name-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('content-input')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.getByText('Zurücksetzen')).toBeInTheDocument();
  });

  it('shows validation errors and scrolls to first error field', async () => {
    render(<TestForm />);
    
    // Submit the form without filling any fields
    fireEvent.click(screen.getByText('Submit'));
    
    // Check if validation errors are displayed
    await waitFor(() => {
      expect(screen.getAllByRole('alert')).toHaveLength(3);
    });
    
    // Check if scrollIntoView was called for the first error field
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('validates custom fields correctly', async () => {
    render(<TestForm />);
    
    // Fill only the react-hook-form fields
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
    
    // Submit with missing custom field (content)
    fireEvent.click(screen.getByText('Submit'));
    
    // Should show content validation error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Content is required');
    });
    
    // Should have scrolled to content field
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('resets form fields when reset button is clicked', async () => {
    render(<TestForm />);
    
    // Fill all fields
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('content-input'), { target: { value: 'Some content' } });
    
    // Click reset button
    fireEvent.click(screen.getByText('Zurücksetzen'));
    
    // Fields should be reset
    await waitFor(() => {
      expect(screen.getByTestId('name-input')).toHaveValue('');
      expect(screen.getByTestId('email-input')).toHaveValue('');
      expect(screen.getByTestId('content-input')).toHaveValue('');
    });
  });

  it('shows success message after successful submission', async () => {
    render(<TestForm />);
    
    // Fill all fields
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('content-input'), { target: { value: 'Some content' } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit'));
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Erfolgreich übermittelt!')).toBeInTheDocument();
    });
  });
});

// Tests for FormValidationHelper
describe('FormValidationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates and scrolls to first field with error', () => {
    // Mock refs
    const nameRef = { current: document.createElement('div') };
    const emailRef = { current: document.createElement('div') };
    
    // Mock errors
    const errors = {
      name: { type: 'required', message: 'Name is required' },
      email: { type: 'required', message: 'Email is required' }
    };
    
    // Mock fieldRefs
    const fieldRefs = {
      name: nameRef,
      email: emailRef
    };
    
    // Call validate method
    const result = FormValidationHelper.validateAndScroll(errors, fieldRefs);
    
    // Should return true and scroll to first field (name)
    expect(result).toBe(true);
    expect(nameRef.current.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(emailRef.current.scrollIntoView).not.toHaveBeenCalled();
  });

  it('validates custom fields when react-hook-form fields are valid', () => {
    // Mock refs
    const contentRef = { current: document.createElement('div') };
    
    // Mock empty errors (no react-hook-form errors)
    const errors = {};
    
    // Mock fieldRefs
    const fieldRefs = {
      content: contentRef
    };
    
    // Mock custom validations
    const customFields = [
      { field: 'content', isValid: false }
    ];
    
    // Call validate method
    const result = FormValidationHelper.validateAndScroll(errors, fieldRefs, customFields);
    
    // Should return true and scroll to content field
    expect(result).toBe(true);
    expect(contentRef.current.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('returns false when no errors are found', () => {
    // Mock empty errors
    const errors = {};
    
    // Mock fieldRefs
    const fieldRefs = {};
    
    // No custom validations
    const customFields = [];
    
    // Call validate method
    const result = FormValidationHelper.validateAndScroll(errors, fieldRefs, customFields);
    
    // Should return false (no scrolling needed)
    expect(result).toBe(false);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls to field with matching ref name', () => {
    // Create a test element
    const testDiv = document.createElement('div');
    
    // Call scrollToField with a matching ref
    const result = FormValidationHelper.scrollToField('test', { 'test': { current: testDiv } });
    
    // Should return true and scroll
    expect(result).toBe(true);
    expect(testDiv.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('tries to focus element if focusable', () => {
    // Create a test input element with focus method
    const testInput = document.createElement('input');
    
    // Call scrollToField with a focusable element
    const result = FormValidationHelper.scrollToField('test', { 'test': { current: testInput } });
    
    // Should return true, scroll and focus
    expect(result).toBe(true);
    expect(testInput.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(testInput.focus).toHaveBeenCalledTimes(1);
  });

  it('attempts partial matching for complex field names', () => {
    // Create a test element
    const testDiv = document.createElement('div');
    
    // Call scrollToField with a complex name that includes the ref name
    const result = FormValidationHelper.scrollToField('items.0.name', { 'items': { current: testDiv } });
    
    // Should return true and scroll
    expect(result).toBe(true);
    expect(testDiv.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('returns false when no matching ref is found', () => {
    // Call scrollToField with non-matching ref
    const result = FormValidationHelper.scrollToField('test', { 'other': { current: document.createElement('div') } });
    
    // Should return false
    expect(result).toBe(false);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});