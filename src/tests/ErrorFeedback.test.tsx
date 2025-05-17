import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorFeedback from '@/components/ErrorFeedback';

describe('ErrorFeedback Component', () => {
  it('should render nothing when error is null', () => {
    const { container } = render(<ErrorFeedback error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render compact variant correctly', () => {
    render(<ErrorFeedback error="Test error" variant="compact" />);
    
    const errorText = screen.getByText('Test error');
    expect(errorText).toBeInTheDocument();
    expect(errorText.tagName).toBe('SPAN'); // Typography with variant caption
  });

  it('should render standard variant correctly', () => {
    render(<ErrorFeedback error="Test error" />);
    
    const errorText = screen.getByText(/Test error/i);
    expect(errorText).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument(); // Alert component
  });

  it('should render full variant with error details', () => {
    const details = {
      type: 'VALIDATION',
      fieldErrors: {
        name: 'Name is required',
        email: 'Email is invalid'
      }
    };
    
    render(
      <ErrorFeedback 
        error="Validation failed" 
        details={details} 
        variant="full"
        showDetails={true}
      />
    );
    
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
    expect(screen.getByText('Fehlertyp:')).toBeInTheDocument();
    expect(screen.getByText('VALIDATION')).toBeInTheDocument();
    expect(screen.getByText('Validierungsfehler:')).toBeInTheDocument();
    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText(/Email is invalid/)).toBeInTheDocument();
  });

  it('should toggle details visibility when clicked', () => {
    const details = { type: 'VALIDATION' };
    
    render(
      <ErrorFeedback 
        error="Test error" 
        details={details} 
        variant="full"
      />
    );
    
    // Details should be hidden initially
    expect(screen.queryByText('Fehlertyp:')).not.toBeInTheDocument();
    
    // Click the details button
    fireEvent.click(screen.getByText('Details anzeigen'));
    
    // Details should now be visible
    expect(screen.getByText('Fehlertyp:')).toBeInTheDocument();
    expect(screen.getByText('VALIDATION')).toBeInTheDocument();
    
    // Click again to hide
    fireEvent.click(screen.getByText('Details ausblenden'));
    
    // Details should be hidden again
    expect(screen.queryByText('Fehlertyp:')).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    
    render(
      <ErrorFeedback 
        error="Test error" 
        variant="full" 
        onRetry={onRetry}
      />
    );
    
    // Click the retry button
    fireEvent.click(screen.getByText('Erneut versuchen'));
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when close button is clicked', () => {
    const onDismiss = jest.fn();
    
    render(
      <ErrorFeedback 
        error="Test error" 
        onDismiss={onDismiss}
      />
    );
    
    // Click the close button (MUI Alert close button)
    fireEvent.click(screen.getByRole('button'));
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  
  it('should correctly display context information in full variant', () => {
    const details = {
      type: 'FILE_UPLOAD',
      context: {
        fileName: 'test.jpg',
        fileSize: 1024 * 1024 * 6, // 6MB
        maxSize: 1024 * 1024 * 5 // 5MB
      }
    };
    
    render(
      <ErrorFeedback 
        error="File size exceeds limit" 
        details={details} 
        variant="full"
        showDetails={true}
      />
    );
    
    expect(screen.getByText('File size exceeds limit')).toBeInTheDocument();
    expect(screen.getByText('Zusätzliche Informationen:')).toBeInTheDocument();
    expect(screen.getByText(/fileName:/)).toBeInTheDocument();
    expect(screen.getByText(/test.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/fileSize:/)).toBeInTheDocument();
    expect(screen.getByText(/maxSize:/)).toBeInTheDocument();
  });
});