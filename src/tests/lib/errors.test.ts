// Mock NextResponse before any imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: jest.fn().mockResolvedValue(data),
      status: init?.status || 200,
    })),
  },
}));

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import {
  AppError,
  ErrorType,
  NewsletterNotFoundError,
  NewsletterValidationError,
  isNewsletterError,
  apiErrorResponse,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

const mockJsonResponse = NextResponse.json as jest.MockedFunction<typeof NextResponse.json>;

describe('Newsletter Error Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV for consistent tests
    process.env.NODE_ENV = 'test';
  });

  describe('NewsletterNotFoundError', () => {
    test('should create error with default message', () => {
      const error = new NewsletterNotFoundError();
      
      expect(error).toBeInstanceOf(NewsletterNotFoundError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Newsletter not found');
      expect(error.type).toBe(ErrorType.NEWSLETTER);
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NewsletterNotFoundError');
    });

    test('should create error with custom message', () => {
      const error = new NewsletterNotFoundError('Newsletter with ID 123 not found');
      
      expect(error.message).toBe('Newsletter with ID 123 not found');
    });

    test('should create error with context', () => {
      const context = { newsletterId: '123', operation: 'fetch' };
      const error = new NewsletterNotFoundError('Newsletter not found', context);
      
      expect(error.context).toEqual(context);
    });

    test('should generate proper error response', () => {
      const error = new NewsletterNotFoundError('Newsletter not found');
      error.toResponse();
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        {
          error: 'Newsletter not found',
          type: ErrorType.NEWSLETTER,
        },
        { status: 404 }
      );
    });

    test('should include context in response in non-production', () => {
      process.env.NODE_ENV = 'development';
      const context = { newsletterId: '123' };
      const error = new NewsletterNotFoundError('Newsletter not found', context);
      error.toResponse(true);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        {
          error: 'Newsletter not found',
          type: ErrorType.NEWSLETTER,
          context: { newsletterId: '123' },
        },
        { status: 404 }
      );
    });
  });

  describe('NewsletterValidationError', () => {
    test('should create error with default message', () => {
      const error = new NewsletterValidationError();
      
      expect(error).toBeInstanceOf(NewsletterValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Newsletter validation failed');
      expect(error.type).toBe(ErrorType.NEWSLETTER);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('NewsletterValidationError');
    });

    test('should create error with custom message and details', () => {
      const details = {
        footerText: 'Footer text is required',
        chunkSize: 'Chunk size must be between 1 and 100',
      };
      const error = new NewsletterValidationError('Invalid newsletter settings', details);
      
      expect(error.message).toBe('Invalid newsletter settings');
      expect(error.details).toEqual(details);
    });

    test('should create error with context', () => {
      const context = { operation: 'update', userId: 'user123' };
      const error = new NewsletterValidationError('Validation failed', undefined, context);
      
      expect(error.context).toEqual(context);
    });

    test('should include validation details in response', () => {
      const details = {
        footerText: 'Footer text is required',
        chunkSize: 'Chunk size must be positive',
      };
      const error = new NewsletterValidationError('Validation failed', details);
      error.toResponse();
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          type: ErrorType.NEWSLETTER,
          fieldErrors: details,
        },
        { status: 400 }
      );
    });

    test('should include context in response in non-production', () => {
      process.env.NODE_ENV = 'development';
      const details = { footerText: 'Required' };
      const context = { operation: 'update' };
      const error = new NewsletterValidationError('Validation failed', details, context);
      error.toResponse(true);
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          type: ErrorType.NEWSLETTER,
          fieldErrors: details,
          context: context,
        },
        { status: 400 }
      );
    });

    test('should generate response without details if none provided', () => {
      const error = new NewsletterValidationError('Validation failed');
      error.toResponse();
      
      expect(mockJsonResponse).toHaveBeenCalledWith(
        {
          error: 'Validation failed',
          type: ErrorType.NEWSLETTER,
        },
        { status: 400 }
      );
    });
  });

  describe('isNewsletterError', () => {
    test('should return true for NewsletterNotFoundError', () => {
      const error = new NewsletterNotFoundError();
      expect(isNewsletterError(error)).toBe(true);
    });

    test('should return true for NewsletterValidationError', () => {
      const error = new NewsletterValidationError();
      expect(isNewsletterError(error)).toBe(true);
    });

    test('should return false for generic AppError', () => {
      const error = new AppError('Generic error');
      expect(isNewsletterError(error)).toBe(false);
    });

    test('should return false for standard Error', () => {
      const error = new Error('Standard error');
      expect(isNewsletterError(error)).toBe(false);
    });

    test('should return false for non-error values', () => {
      expect(isNewsletterError('string')).toBe(false);
      expect(isNewsletterError(123)).toBe(false);
      expect(isNewsletterError(null)).toBe(false);
      expect(isNewsletterError(undefined)).toBe(false);
      expect(isNewsletterError({})).toBe(false);
    });
  });

  describe('apiErrorResponse with Newsletter Errors', () => {
    const mockLogger = logger.error as jest.Mock;

    test('should handle NewsletterNotFoundError', () => {
      const error = new NewsletterNotFoundError('Newsletter 123 not found');
      apiErrorResponse(error);
      
      expect(mockLogger).toHaveBeenCalledWith(error, {
        module: 'api',
        context: {
          type: ErrorType.NEWSLETTER,
          statusCode: 404,
          errorName: 'NewsletterNotFoundError',
        },
        tags: ['api', 'newsletter', 'newsletternotfounderror', 'status-404'],
      });
      
      // Verify the error's toResponse method was called
      expect(mockJsonResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Newsletter 123 not found',
          type: ErrorType.NEWSLETTER,
        }),
        { status: 404 }
      );
    });

    test('should handle NewsletterValidationError', () => {
      const details = { chunkSize: 'Must be positive' };
      const error = new NewsletterValidationError('Invalid settings', details);
      apiErrorResponse(error);
      
      expect(mockLogger).toHaveBeenCalledWith(error, {
        module: 'api',
        context: {
          type: ErrorType.NEWSLETTER,
          statusCode: 400,
          errorName: 'NewsletterValidationError',
        },
        tags: ['api', 'newsletter', 'newslettervalidationerror', 'status-400'],
      });
      
      // Verify the error's toResponse method was called with validation details
      expect(mockJsonResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid settings',
          type: ErrorType.NEWSLETTER,
          fieldErrors: details,
        }),
        { status: 400 }
      );
    });

    test('should include additional context in logs', () => {
      const error = new NewsletterNotFoundError('Not found', { newsletterId: '123' });
      const additionalContext = { userId: 'user456' };
      
      apiErrorResponse(error, 'Default message', additionalContext);
      
      expect(mockLogger).toHaveBeenCalledWith(error, {
        module: 'api',
        context: {
          type: ErrorType.NEWSLETTER,
          statusCode: 404,
          errorName: 'NewsletterNotFoundError',
          newsletterId: '123',
          userId: 'user456',
        },
        tags: ['api', 'newsletter', 'newsletternotfounderror', 'status-404'],
      });
    });

    test('should handle newsletter errors before generic AppError', () => {
      // This test ensures newsletter errors are handled in the correct order
      const newsletterError = new NewsletterValidationError('Newsletter error');
      const genericError = new AppError('Generic error');
      
      apiErrorResponse(newsletterError);
      apiErrorResponse(genericError);
      
      // Check that both were logged with different tags
      expect(mockLogger).toHaveBeenCalledTimes(2);
      
      // Newsletter error should have newsletter tag
      expect(mockLogger).toHaveBeenNthCalledWith(1, newsletterError, 
        expect.objectContaining({
          tags: expect.arrayContaining(['newsletter'])
        })
      );
      
      // Generic error should not have newsletter tag
      expect(mockLogger).toHaveBeenNthCalledWith(2, genericError,
        expect.objectContaining({
          tags: expect.not.arrayContaining(['newsletter'])
        })
      );
    });
  });
});