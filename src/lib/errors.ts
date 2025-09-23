import { NextResponse } from 'next/server';
import { logger } from './logger';

// Type for error context
type ErrorContext = Record<string, unknown>;

/**
 * Error types for better error categorization and handling
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
  NEWSLETTER = 'NEWSLETTER',
}

/**
 * Custom error class with additional properties for better error handling
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly originalError?: Error;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    originalError?: Error,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;

    // Ensures proper stack trace in modern V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    // If we have an original error, append its stack to ours
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  /**
   * Creates a validation error
   */
  static validation(message: string, context?: ErrorContext): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400, undefined, context);
  }

  /**
   * Creates an authentication error
   */
  static authentication(message: string = 'Authentication failed'): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, 401);
  }

  /**
   * Creates an authorization error
   */
  static authorization(message: string = 'Not authorized'): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403);
  }

  /**
   * Creates a not found error
   */
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, 404);
  }

  /**
   * Creates a database error
   */
  static database(message: string, originalError?: Error): AppError {
    return new AppError(message, ErrorType.DATABASE, 500, originalError);
  }

  /**
   * Creates a file upload error
   */
  static fileUpload(message: string, originalError?: Error, context?: ErrorContext): AppError {
    return new AppError(message, ErrorType.FILE_UPLOAD, 500, originalError, context);
  }

  /**
   * Converts the error to a NextResponse object for API responses
   */
  toResponse(includeDetails: boolean = false): NextResponse {
    const errorBody: Record<string, unknown> = {
      error: this.message,
      type: this.type,
    };

    // Include additional details in non-production environments
    if (includeDetails && process.env.NODE_ENV !== 'production') {
      if (this.originalError) {
        errorBody.originalError = {
          message: this.originalError.message,
          name: this.originalError.name,
          stack: this.originalError.stack,
        };
      }
      
      if (this.context) {
        errorBody.context = this.context;
      }
    }

    return NextResponse.json(errorBody, { status: this.statusCode });
  }
}

/**
 * Helper function to create a validation error response with field errors
 */
export function validationErrorResponse(fieldErrors: Record<string, string>): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Validierung fehlgeschlagen',
    type: ErrorType.VALIDATION,
    fieldErrors
  }, { status: 400 });
}

/**
 * Helper function to create a standardized error response for API routes
 */
export function apiErrorResponse(
  error: unknown, 
  defaultMessage: string = 'An unexpected error occurred',
  context?: ErrorContext
): NextResponse {
  // Handle newsletter-specific errors
  if (error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError) {
    // Log newsletter error with specific context
    logger.error(error, {
      module: 'api',
      context: {
        type: error.type,
        statusCode: error.statusCode,
        errorName: error.name,
        ...error.context,
        ...context
      },
      tags: ['api', 'newsletter', error.name.toLowerCase(), `status-${error.statusCode}`]
    });
    
    return error.toResponse(process.env.NODE_ENV !== 'production');
  }
  
  if (error instanceof AppError) {
    // Log AppError with context
    logger.error(error, {
      module: 'api',
      context: {
        type: error.type,
        statusCode: error.statusCode,
        ...error.context,
        ...context
      },
      tags: ['api', error.type.toLowerCase(), `status-${error.statusCode}`]
    });
    
    return error.toResponse(process.env.NODE_ENV !== 'production');
  }

  if (error instanceof Error) {
    // Log the standard Error with context
    logger.error(error, {
      module: 'api',
      context: {
        defaultMessage,
        ...context
      },
      tags: ['api', 'unhandled-error']
    });
    
    // Return a generic error message for client
    return NextResponse.json(
      { error: defaultMessage, type: ErrorType.UNKNOWN },
      { status: 500 }
    );
  }

  // For non-Error objects
  const unknownError = new Error(String(error) || 'Unknown error');
  logger.error(unknownError, {
    module: 'api',
    context: {
      originalError: error,
      defaultMessage,
      ...context
    },
    tags: ['api', 'unknown-error']
  });
  
  return NextResponse.json(
    { error: defaultMessage, type: ErrorType.UNKNOWN },
    { status: 500 }
  );
}

/**
 * Client-side error handler that provides localized error messages
 */
export function getClientErrorMessage(error: unknown, defaultMessage: string = 'Ein unerwarteter Fehler ist aufgetreten'): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message || defaultMessage;
  }
  
  return defaultMessage;
}

/**
 * Helper to format and standardize database errors
 */
export function handleDatabaseError(error: unknown, operation: string): AppError {
  // Convert to Error object if needed
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Log with structured context
  logger.error(errorObj, {
    module: 'database',
    context: { operation },
    tags: ['database', 'error', operation]
  });
  
  // Handle specific database errors if needed (could add specific error codes here)
  return AppError.database(
    `Database error during ${operation}: ${errorObj.message}`, 
    errorObj
  );
}

/**
 * Helper to format and standardize file upload errors
 */
export function handleFileUploadError(error: unknown, context?: ErrorContext): AppError {
  // Convert to Error object if needed
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Log with structured context
  logger.error(errorObj, {
    module: 'fileUpload',
    context,
    tags: ['fileUpload', 'error']
  });
  
  return AppError.fileUpload(
    `File upload failed: ${errorObj.message}`, 
    errorObj, 
    context
  );
}

/**
 * Translation map for common error messages to German (for user-facing errors)
 */
export const errorTranslations: Record<string, string> = {
  'Authentication failed': 'Authentifizierung fehlgeschlagen',
  'Not authorized': 'Nicht autorisiert',
  'Resource not found': 'Ressource nicht gefunden',
  'Validation failed': 'Validierung fehlgeschlagen',
  'An unexpected error occurred': 'Ein unerwarteter Fehler ist aufgetreten',
  'Database error': 'Datenbankfehler',
  'File upload failed': 'Datei-Upload fehlgeschlagen',
  'File size exceeds limit': 'Dateigröße überschreitet das Limit',
  'Unsupported file type': 'Nicht unterstützter Dateityp',
  'Newsletter not found': 'Newsletter nicht gefunden',
  'Newsletter validation failed': 'Newsletter-Validierung fehlgeschlagen',
};

/**
 * Get a localized error message
 */
export function getLocalizedErrorMessage(message: string): string {
  return errorTranslations[message] || message;
}

/**
 * Newsletter-specific error class for when a newsletter is not found
 */
export class NewsletterNotFoundError extends AppError {
  constructor(message: string = 'Newsletter not found', context?: ErrorContext) {
    super(message, ErrorType.NEWSLETTER, 404, undefined, context);
    this.name = 'NewsletterNotFoundError';
  }
}

/**
 * Newsletter-specific error class for validation errors
 */
export class NewsletterValidationError extends AppError {
  public readonly details?: Record<string, string>;

  constructor(
    message: string = 'Newsletter validation failed',
    details?: Record<string, string>,
    context?: ErrorContext
  ) {
    super(message, ErrorType.NEWSLETTER, 400, undefined, context);
    this.name = 'NewsletterValidationError';
    this.details = details;
  }

  /**
   * Override toResponse to include validation details
   */
  toResponse(includeDetails: boolean = false): NextResponse {
    const errorBody: Record<string, unknown> = {
      error: this.message,
      type: this.type,
    };

    // Always include validation details for validation errors
    if (this.details) {
      errorBody.fieldErrors = this.details;
    }

    // Include additional details in non-production environments
    if (includeDetails && process.env.NODE_ENV !== 'production') {
      if (this.context) {
        errorBody.context = this.context;
      }
    }

    return NextResponse.json(errorBody, { status: this.statusCode });
  }
}

/**
 * Helper function to check if an error is newsletter-related
 */
export function isNewsletterError(error: unknown): error is NewsletterNotFoundError | NewsletterValidationError {
  return error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError;
}

/**
 * Validation result type for all validators
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}

/**
 * Validation error class for form field validation errors
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    const firstError = Object.values(fieldErrors)[0] || 'Validierung fehlgeschlagen';
    super(firstError, ErrorType.VALIDATION, 400);
    this.fieldErrors = fieldErrors;
    this.name = 'ValidationError';
  }

  /**
   * Converts the error to a NextResponse object using validationErrorResponse
   */
  toResponse(): NextResponse {
    return validationErrorResponse(this.fieldErrors);
  }
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}