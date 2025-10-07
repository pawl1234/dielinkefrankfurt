/**
 * Email infrastructure barrel export
 *
 * Provides centralized access to all email-related functionality
 */

// Email sending and transport
export * from './mailer';
export * from './senders';

// Email rendering
export * from './rendering';

// Email hashing and validation
export * from './hashing';

// Email attachments
export * from './attachments';

// Image composition for newsletter headers
export * from './image-composition';
