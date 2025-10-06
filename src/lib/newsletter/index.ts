/**
 * Newsletter domain barrel export
 * Provides centralized exports for all newsletter functionality
 */

// Settings management
export * from './settings-service';

// Preview and content generation
export * from './preview-service';

// Draft management - draft-specific operations
export {
  saveDraftNewsletter,
  updateDraftNewsletter,
  listDraftNewsletters,
  deleteDraftNewsletter
} from './draft-service';
export type { PaginatedResult } from './draft-service';

// General newsletter CRUD operations
export {
  getNewsletter,
  getNewsletterById,
  listNewsletters,
  createNewsletter,
  updateNewsletter,
  deleteNewsletter
} from './newsletter-crud-service';

// Newsletter archiving - avoid re-exporting deleteNewsletter
export {
  archiveNewsletter,
  getSentNewsletter,
  listSentNewsletters,
  updateNewsletterStatus,
  getNewsletterStats
} from './archive-service';
export type {
  ArchiveNewsletterParams,
  ListNewslettersParams,
  SentNewsletterWithMeta
} from './archive-service';

// Email sending coordination
export * from './sending-coordinator';

// Analytics and tracking
export * from './analytics-service';
export * from './tracking-service';

// Template generation
export * from './template-generator';

// Test email sending
export * from './test-email-service';

// Admin notifications
export * from './admin-notification-service';

// Validation utilities
export * from './validation';

// Helper utilities
export * from './helpers';

// Constants
export * from './constants';
