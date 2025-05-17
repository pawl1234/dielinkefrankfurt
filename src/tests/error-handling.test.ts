import { AppError, ErrorType, apiErrorResponse, getLocalizedErrorMessage } from '@/lib/errors';
import { withRetry, resilientFetch, safeJsonParse, withErrorRecovery } from '@/lib/error-recovery';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({ 
      data, 
      options,
      json: jest.fn().mockResolvedValue(data)
    })),
  },
}));

// Mock console methods to prevent test noise
global.console.error = jest.fn();
global.console.warn = jest.fn();
global.console.log = jest.fn();

describe('Error handling utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create an error with the correct properties', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, 400);
      
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('AppError');
    });

    it('should create factory errors with correct defaults', () => {
      const validationError = AppError.validation('Invalid input');
      expect(validationError.type).toBe(ErrorType.VALIDATION);
      expect(validationError.statusCode).toBe(400);
      
      const authError = AppError.authentication();
      expect(authError.type).toBe(ErrorType.AUTHENTICATION);
      expect(authError.statusCode).toBe(401);
      
      const notFoundError = AppError.notFound();
      expect(notFoundError.type).toBe(ErrorType.NOT_FOUND);
      expect(notFoundError.statusCode).toBe(404);
    });
    
    it('should convert to a NextResponse with correct status and data', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, 400);
      const response = error.toResponse();
      
      expect(response.options.status).toBe(400);
      expect(response.data.error).toBe('Test error');
      expect(response.data.type).toBe(ErrorType.VALIDATION);
    });
  });
  
  describe('apiErrorResponse', () => {
    it('should handle AppError instances', () => {
      const error = new AppError('Test error', ErrorType.VALIDATION, 400);
      const response = apiErrorResponse(error);
      
      expect(response.options.status).toBe(400);
      expect(response.data.error).toBe('Test error');
      expect(response.data.type).toBe(ErrorType.VALIDATION);
    });
    
    it('should handle standard Error instances', () => {
      const error = new Error('Standard error');
      const response = apiErrorResponse(error, 'Default message');
      
      expect(response.options.status).toBe(500);
      expect(response.data.error).toBe('Default message');
      expect(response.data.type).toBe(ErrorType.UNKNOWN);
    });
    
    it('should handle non-Error objects', () => {
      const error = 'String error';
      const response = apiErrorResponse(error, 'Default message');
      
      expect(response.options.status).toBe(500);
      expect(response.data.error).toBe('Default message');
      expect(response.data.type).toBe(ErrorType.UNKNOWN);
    });
  });
  
  describe('getLocalizedErrorMessage', () => {
    it('should translate known error messages', () => {
      expect(getLocalizedErrorMessage('Authentication failed')).toBe('Authentifizierung fehlgeschlagen');
      expect(getLocalizedErrorMessage('Not authorized')).toBe('Nicht autorisiert');
      expect(getLocalizedErrorMessage('Resource not found')).toBe('Ressource nicht gefunden');
    });
    
    it('should pass through unknown error messages', () => {
      expect(getLocalizedErrorMessage('Custom error message')).toBe('Custom error message');
    });
  });
  
  describe('withRetry', () => {
    it('should resolve if the operation succeeds on the first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });
    
    it('should retry the operation if it fails', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');
      
      const onRetry = jest.fn();
      
      const result = await withRetry(operation, { 
        maxAttempts: 3, 
        retryDelay: 10,
        onRetry
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
    
    it('should throw the last error if all attempts fail', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(withRetry(operation, { 
        maxAttempts: 3, 
        retryDelay: 10 
      })).rejects.toThrow('Operation failed');
      
      expect(operation).toHaveBeenCalledTimes(3);
    });
    
    it('should respect shouldRetry function', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Retryable'))
        .mockRejectedValueOnce(new Error('Non-retryable'))
        .mockResolvedValueOnce('success');
      
      const shouldRetry = jest.fn(error => error.message === 'Retryable');
      
      await expect(withRetry(operation, { 
        maxAttempts: 3, 
        retryDelay: 10,
        shouldRetry
      })).rejects.toThrow('Non-retryable');
      
      expect(operation).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"key": "value"}';
      const fallback = { fallback: true };
      
      const result = safeJsonParse(validJson, fallback);
      
      expect(result).toEqual({ key: 'value' });
    });
    
    it('should return fallback for invalid JSON', () => {
      const invalidJson = '{invalid: json}';
      const fallback = { fallback: true };
      
      const result = safeJsonParse(invalidJson, fallback);
      
      expect(result).toBe(fallback);
    });
  });
  
  describe('withErrorRecovery', () => {
    it('should resolve with operation result if successful', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const errorHandler = jest.fn();
      const cleanup = jest.fn();
      
      const result = await withErrorRecovery(operation, errorHandler, cleanup);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should attempt recovery if operation fails', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn().mockResolvedValue('recovered');
      const cleanup = jest.fn();
      
      const result = await withErrorRecovery(operation, errorHandler, cleanup);
      
      expect(result).toBe('recovered');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(error);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should throw if both operation and recovery fail', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn().mockResolvedValue(null); // Recovery failed
      const cleanup = jest.fn();
      
      await expect(withErrorRecovery(operation, errorHandler, cleanup))
        .rejects.toThrow('Operation failed');
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(error);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should always run cleanup even if it throws', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const errorHandler = jest.fn();
      const cleanup = jest.fn().mockRejectedValue(new Error('Cleanup failed'));
      
      const result = await withErrorRecovery(operation, errorHandler, cleanup);
      
      expect(result).toBe('success');
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });
});