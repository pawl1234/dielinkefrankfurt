// Central export point for all test factories

export * from './antrag.factory';
export * from './appointment.factory';
export * from './group.factory';
export * from './newsletter.factory';
export * from './status-report.factory';

// Re-export commonly used test utilities
export { 
  createMockFile,
  createMockImageFile,
  createMockPdfFile,
  createMockFormData
} from '../test-utils';