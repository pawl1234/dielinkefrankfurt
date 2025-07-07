import { NextResponse } from 'next/server';

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

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.context = context;
  }

  static validation(message: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400, undefined, context);
  }

  toResponse(): NextResponse {
    const errorBody: Record<string, unknown> = {
      error: this.message,
      type: this.type,
    };

    return NextResponse.json(errorBody, { status: this.statusCode });
  }
}

export function validationErrorResponse(fieldErrors: Record<string, string>): NextResponse {
  return NextResponse.json({
    error: 'Validation failed',
    type: ErrorType.VALIDATION,
    fieldErrors
  }, { status: 400 });
}

export function apiErrorResponse(
  error: unknown, 
  defaultMessage: string = 'An unexpected error occurred'
): NextResponse {
  if (error instanceof AppError) {
    return error.toResponse();
  }

  return NextResponse.json(
    { error: defaultMessage, type: ErrorType.UNKNOWN },
    { status: 500 }
  );
}

export function getLocalizedErrorMessage(message: string): string {
  return message;
}

export class NewsletterNotFoundError extends AppError {}
export class NewsletterValidationError extends AppError {}

export function isNewsletterError(error: unknown): error is NewsletterNotFoundError | NewsletterValidationError {
  return error instanceof NewsletterNotFoundError || error instanceof NewsletterValidationError;
}