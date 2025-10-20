/**
 * Newsletter domain barrel export
 * Provides centralized exports for all newsletter functionality
 */

// Settings management
export * from './settings-service';

// Consolidated sending service (replaces: sending-coordinator, email-processor-service,
// email-sender-service, transporter-manager, chunk-aggregator-service, send-session-service)
export * from './newsletter-sending-service';

// Consolidated content service (replaces: preview-service, template-generator)
export * from './newsletter-content-service';

// Newsletter archiving
export {
  getSentNewsletter
} from './archive-service';
export type {
  SentNewsletterWithMeta
} from './archive-service';

// Analytics and tracking
export * from './analytics-service';
export * from './tracking-service';

// Test email sending
export * from './test-email-service';

// Admin notifications
export * from './admin-notification-service';

// Helper utilities
export * from './helpers';

// Constants
export * from './constants';
