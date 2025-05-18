/**
 * Logger utility to standardize logging across the application
 * 
 * This provides consistent error formatting, log levels, and context handling.
 * In a production environment, this could be extended to integrate with external
 * logging services like Sentry, LogRocket, or server-side logging infrastructure.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  [key: string]: any;
}

interface LogOptions {
  context?: LogContext;
  timestamp?: boolean;
  sessionId?: string;
  userId?: string | null;
  module?: string;
  tags?: string[];
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  sessionId?: string;
  userId?: string | null;
  module?: string;
  tags?: string[];
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
}

/**
 * Get stack trace information for the current point in code
 */
function getStackInfo(): { file?: string; line?: number; function?: string } {
  const stack = new Error().stack;
  if (!stack) return {};

  // Parse the stack trace to get file, line, and function information
  // Format varies by browser, this is approximate for Node/V8
  const stackLines = stack.split('\n');
  // Skip the first 3 lines (Error, getStackInfo, and the logger function)
  const relevantLine = stackLines[3] || '';
  
  // Extract information from the stack trace line
  const match = relevantLine.match(/at\s+(.*)\s+\((.+):(\d+):(\d+)\)/);
  if (!match) return {};
  
  return {
    function: match[1],
    file: match[2],
    line: parseInt(match[3], 10)
  };
}

/**
 * Base logger function that handles all log levels
 */
function log(level: LogLevel, message: string | Error, options: LogOptions = {}) {
  // Skip logging if in test environment
  if (process.env.NODE_ENV === 'test') return;

  // If in production, we might want to filter debug logs
  if (process.env.NODE_ENV === 'production' && level === 'debug') return;

  const includeTimestamp = options.timestamp !== false;
  const { timestamp: timestampOption, ...restOptions } = options;
  let errorInfo;
  let finalMessage = message;

  // Extract error information if message is an Error
  if (message instanceof Error) {
    errorInfo = {
      name: message.name,
      message: message.message,
      stack: message.stack,
      cause: (message as any).cause, // Error cause is supported in newer JS
    };
    finalMessage = message.message;
  }

  // Get stack information for context
  const stackInfo = getStackInfo();

  // Prepare the log entry
  const entry: LogEntry = {
    level,
    message: String(finalMessage),
    timestamp: includeTimestamp ? new Date().toISOString() : '',
    ...restOptions,  // Spread the rest of options without timestamp
    context: {
      ...stackInfo,
      ...options.context,
    }
  };

  if (errorInfo) {
    entry.error = errorInfo;
  }

  // Log to console with appropriate method
  const logFn = level === 'debug' 
    ? console.debug 
    : level === 'info' 
      ? console.info 
      : level === 'warn' 
        ? console.warn 
        : console.error;

  // Format the log for console output
  const formattedPrefix = `[${entry.timestamp}] [${level.toUpperCase()}]${entry.module ? ` [${entry.module}]` : ''}`;
  
  if (level === 'error' || level === 'fatal') {
    // For errors, log in expanded format
    console.group(formattedPrefix);
    logFn(entry.message);
    
    if (entry.error) {
      if (entry.error.stack) {
        console.error(entry.error.stack);
      } else {
        console.error(`${entry.error.name}: ${entry.error.message}`);
      }
    }
    
    if (Object.keys(entry.context || {}).length > 0) {
      console.log('Context:', entry.context);
    }
    
    if (entry.tags && entry.tags.length > 0) {
      console.log('Tags:', entry.tags.join(', '));
    }
    
    console.groupEnd();
  } else {
    // For non-errors, use simpler format
    logFn(`${formattedPrefix} ${entry.message}`, 
      Object.keys(entry.context || {}).length > 0 ? entry.context : '');
  }

  // In production, here we would send logs to external service
  if ((level === 'error' || level === 'fatal') && process.env.NODE_ENV === 'production') {
    // Example integration point for external error logging
    // sendToErrorTrackingService(entry);
  }

  return entry;
}

/**
 * Logger object with methods for each log level
 */
export const logger = {
  debug: (message: string, options?: LogOptions) => log('debug', message, options),
  info: (message: string, options?: LogOptions) => log('info', message, options),
  warn: (message: string, options?: LogOptions) => log('warn', message, options),
  error: (message: string | Error, options?: LogOptions) => log('error', message, options),
  fatal: (message: string | Error, options?: LogOptions) => log('fatal', message, options),
  
  /**
   * Create a logger instance with predefined options
   */
  createLogger: (defaultOptions: LogOptions) => ({
    debug: (message: string, options?: LogOptions) => 
      log('debug', message, { ...defaultOptions, ...options }),
    info: (message: string, options?: LogOptions) => 
      log('info', message, { ...defaultOptions, ...options }),
    warn: (message: string, options?: LogOptions) => 
      log('warn', message, { ...defaultOptions, ...options }),
    error: (message: string | Error, options?: LogOptions) => 
      log('error', message, { ...defaultOptions, ...options }),
    fatal: (message: string | Error, options?: LogOptions) => 
      log('fatal', message, { ...defaultOptions, ...options }),
  })
};

/**
 * Formats an error with context for consistent error messages
 */
export function formatError(
  error: Error, 
  operation: string, 
  context?: LogContext
): string {
  const { file, line } = getStackInfo();
  const locationInfo = file ? `${file}${line ? `:${line}` : ''}` : 'unknown location';
  
  let message = `Error during ${operation} at ${locationInfo}: ${error.message}`;
  
  if (context && Object.keys(context).length > 0) {
    message += ` | Context: ${JSON.stringify(context)}`;
  }
  
  return message;
}

/**
 * Utility to log and return error responses
 */
export function logError(
  error: Error | unknown, 
  operation: string, 
  context?: LogContext
): Error {
  if (!(error instanceof Error)) {
    error = new Error(String(error));
  }
  
  logger.error(error as Error, { 
    module: 'api',
    context: {
      operation,
      ...context
    }
  });
  
  return error as Error;
}

export default logger;