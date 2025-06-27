import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import '@testing-library/jest-dom';
import ErrorFeedback from '../../components/ui/ErrorFeedback';

describe('ErrorFeedback Component', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorFeedback error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when error is undefined', () => {
    const { container } = render(<ErrorFeedback error={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message when error is provided', () => {
    const errorMessage = 'Something went wrong';
    render(<ErrorFeedback error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders compact variant correctly', () => {
    const errorMessage = 'Validation failed';
    render(<ErrorFeedback error={errorMessage} variant="compact" />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // Compact variant uses Box, not Alert, so no alert role
    const errorIcon = screen.getByTestId('ErrorOutlineIcon');
    expect(errorIcon).toBeInTheDocument();
  });

  it('renders full variant with details', () => {
    const errorMessage = 'Detailed error message';
    render(<ErrorFeedback error={errorMessage} variant="full" />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Fehler:')).toBeInTheDocument(); // German header
  });

  it('renders standard variant by default', () => {
    const errorMessage = 'Standard error message';
    render(<ErrorFeedback error={errorMessage} />);
    
    expect(screen.getByText(/Standard error message/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Fehler:')).toBeInTheDocument(); // German label
  });

  it('handles very long error messages', () => {
    const longError = 'This is a very long error message that should be displayed properly even if it contains many words and takes up multiple lines in the interface';
    render(<ErrorFeedback error={longError} />);
    
    expect(screen.getByText(/This is a very long error message/)).toBeInTheDocument();
  });

  it('handles special characters in error messages', () => {
    const specialError = 'Error with special chars: <>&"\'';
    render(<ErrorFeedback error={specialError} />);
    
    expect(screen.getByText(/Error with special chars/)).toBeInTheDocument();
  });

  it('renders retry button when onRetry callback provided', () => {
    const errorMessage = 'Retryable error';
    const mockRetry = jest.fn();
    render(<ErrorFeedback error={errorMessage} onRetry={mockRetry} />);
    
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument(); // German retry text
  });

  it('shows details when variant is full and details provided', () => {
    const errorMessage = 'Error with details';
    const details = {
      type: 'ValidationError',
      fieldErrors: { email: 'Invalid email format' }
    };
    
    render(<ErrorFeedback error={errorMessage} variant="full" details={details} />);
    
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument(); // German toggle text
  });
});