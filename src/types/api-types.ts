/**
 * API-related types and interfaces
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Context object for simple API routes (no dynamic params)
 */
export interface SimpleRouteContext {
  [key: string]: unknown;
}

/**
 * Context object for API routes with dynamic ID parameter
 */
export interface IdRouteContext {
  params: Promise<{ id: string }>;
  [key: string]: unknown;
}

/**
 * Context object for API routes with dynamic slug parameter
 */
export interface SlugRouteContext {
  params: Promise<{ slug: string }>;
  [key: string]: unknown;
}

/**
 * Context object for API routes with dynamic groupId parameter
 */
export interface GroupIdRouteContext {
  params: Promise<{ groupId: string }>;
  [key: string]: unknown;
}

/**
 * Union type covering all possible Next.js API route context shapes
 */
export type NextJSRouteContext = SimpleRouteContext | IdRouteContext | SlugRouteContext | GroupIdRouteContext;

/**
 * Type for API handler functions with proper type safety
 * Uses generic parameter to accommodate different context shapes
 */
export type ApiHandler<TContext = NextJSRouteContext> = (request: NextRequest, context?: TContext) => Promise<NextResponse>;

/**
 * Generic paginated response structure used across all API endpoints.
 * Provides consistent pagination metadata for list queries.
 *
 * @template T - The type of items in the paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Result of processing a single email in newsletter sending
 */
export interface EmailSendResult {
  email: string;
  success: boolean;
  error?: string;
}

/**
 * Result of processing a chunk of emails in newsletter sending
 */
export interface ChunkResult {
  sentCount: number;
  failedCount: number;
  completedAt: string;
  results: EmailSendResult[];
}

/**
 * Newsletter sending state with chunk tracking and retry information
 * Extends NewsletterSettings to inherit all configuration options
 */
export interface NewsletterSendingState {
  // Chunk tracking fields
  chunkResults?: ChunkResult[];
  totalSent?: number;
  totalFailed?: number;
  lastChunkCompletedAt?: string;
  completedChunks?: number;

  // Retry tracking fields
  retryInProgress?: boolean;
  retryStartedAt?: string;
  failedEmails?: string[];
  retryChunkSizes?: number[];
  currentRetryStage?: number;
  retryResults?: ChunkResult[];

  // Status field
  status?: string;

  // Allow any additional fields for flexibility
  [key: string]: unknown;
}

/**
 * Purpose details for Antrag an Kreisvorstand
 */
export interface AntragPurposes {
  zuschuss?: {
    enabled: boolean;
    amount: number; // Amount in euros
  };
  personelleUnterstuetzung?: {
    enabled: boolean;
    details?: string; // Free text describing personnel needs (optional but required when enabled)
  };
  raumbuchung?: {
    enabled: boolean;
    location?: string;
    numberOfPeople?: number;
    details?: string; // Additional details like time, duration, special requirements (optional but required when enabled)
  };
  weiteres?: {
    enabled: boolean;
    details?: string; // Free text for other requirements (optional but required when enabled)
  };
}

/**
 * Form data for Antrag submission
 */
export interface AntragFormData {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  summary: string;
  purposes: AntragPurposes;
  files?: File[];
}

/**
 * Antrag with database ID and system fields
 */
export interface AntragWithId extends Omit<AntragFormData, 'files'> {
  id: string;
  status: 'NEU' | 'AKZEPTIERT' | 'ABGELEHNT';
  fileUrls?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
  decisionComment?: string;
  decidedBy?: string;
  decidedAt?: Date | string;
}

/**
 * Request for generating composite header image
 */
export interface CompositeGenerationRequest {
  bannerUrl: string;
  logoUrl: string;
  compositeWidth: number;
  compositeHeight: number;
  logoTopOffset: number;
  logoLeftOffset: number;
  logoHeight: number;
}

/**
 * Response from composite generation service
 */
export interface CompositeGenerationResponse {
  compositeUrl: string;
  cacheKey: string;
}

/**
 * AI generation request for newsletter intro
 */
export interface AIGenerationRequest {
  topThemes: string;
  boardProtocol?: string; // Made optional
  previousIntro?: string;
}

/**
 * AI refinement request for generated text
 * Uses accumulated conversation history for multi-turn refinements
 */
export interface AIRefinementRequest {
  // Complete conversation history (including original generation)
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  // New refinement instruction
  refinementInstructions: string;
}

/**
 * AI generation response
 */
export interface AIGenerationResponse {
  generatedText: string;
  success: boolean;
  error?: string;
}

/**
 * AI topic extraction request for Vorstandsprotokoll analysis
 */
export interface AITopicExtractionRequest {
  boardProtocol: string;
}

/**
 * AI topic extraction response
 */
export interface AITopicExtractionResponse {
  extractedTopics: string;
  success: boolean;
  error?: string;
}

/**
 * Enhanced AI generation request that supports extracted topics
 */
export interface AIGenerationWithTopicsRequest {
  topThemes: string;
  extractedTopics?: string; // Alternative to raw boardProtocol
  boardProtocol?: string; // Fallback to raw protocol (backward compatibility)
  previousIntro?: string;
}

/**
 * Status Report submission request - API contract between frontend and backend
 */
export interface StatusReportSubmissionRequest {
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  files?: File[];
}

/**
 * Status Report submission successful response
 */
export interface StatusReportSubmissionResponse {
  success: true;
  statusReport: {
    id: string;
    title: string;
  };
}

/**
 * Status report data structure (matches database)
 * Used for displaying and editing existing status reports
 */
export interface StatusReportData {
  id: string;
  groupId: string;
  title: string;
  content: string;
  reporterFirstName: string;
  reporterLastName: string;
  status: 'NEW' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  fileUrls: string | null;
}

/**
 * Status report submission data for admin (includes status)
 * Used for admin form submissions
 */
export interface StatusReportAdminSubmission extends StatusReportSubmissionRequest {
  status: 'NEW' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';
  existingFileUrls?: string[];
}

/**
 * Group entity - represents a single group in the system
 */
export interface Group {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Groups list API response - supports both paginated and simple list responses
 */
export interface GroupsListResponse {
  success: boolean;
  groups: Group[];
  // Pagination metadata (present when paginated)
  totalItems?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  // Error info (present when success: false)
  error?: string;
}

/**
 * Group settings data
 */
export interface GroupSettingsData {
  id: number;
  officeContactEmail: string | null;
}

/**
 * Group contact request - sent via email only, not persisted
 */
export interface GroupContactRequest {
  requesterName: string;
  requesterEmail: string;
  message: string;
}

/**
 * Group contact API response
 */
export interface GroupContactResponse {
  success: boolean;
  error?: string;
}

// ==============================================================================
// Group Membership & Responsible Person Types
// ==============================================================================

/**
 * Group member response (user membership)
 */
export interface GroupMemberResponse {
  id: string;
  userId: string;
  groupId: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  isResponsiblePerson?: boolean; // Flag indicating if member is also responsible person
}

/**
 * Group responsible user response (user-based responsible person)
 */
export interface GroupResponsibleUserResponse {
  id: string;
  userId: string;
  groupId: string;
  assignedAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

/**
 * Portal group list item with membership indicators
 */
export interface PortalGroupListItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  status: string;
  isMember: boolean; // Current user is a member
  isResponsiblePerson: boolean; // Current user is a responsible person
  // Meeting information
  recurringPatterns: string | null;
  meetingTime: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
}

/**
 * Portal group detail with permissions
 */
export interface PortalGroupDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  status: string;
  recurringPatterns: string | null;
  meetingTime: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
  responsiblePersons: Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>;
  responsibleUsers: GroupResponsibleUserResponse[];
  permissions: GroupPermissions;
}

/**
 * User permissions for a specific group
 */
export interface GroupPermissions {
  isMember: boolean;
  isResponsiblePerson: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
  canLeave: boolean;
}

/**
 * Request to join a group
 */
export interface JoinGroupRequest {
  groupId: string;
}

/**
 * Request to leave a group
 */
export interface LeaveGroupRequest {
  groupId: string;
}

/**
 * Request to remove a member (for responsible persons)
 */
export interface RemoveMemberRequest {
  userId: string;
}

/**
 * Request to assign a responsible user (for admins)
 */
export interface AssignResponsibleUserRequest {
  userId: string;
}

/**
 * Request to remove a responsible user (for admins)
 */
export interface RemoveResponsibleUserRequest {
  userId: string;
}

/**
 * User management API types
 */
import { UserRole } from './user';

/**
 * Create user request
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * Create user response
 */
export interface CreateUserResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
  error?: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * Update user response
 */
export interface UpdateUserResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
  error?: string;
}

/**
 * Delete user request
 */
export interface DeleteUserRequest {
  id: string;
}

/**
 * Delete user response
 */
export interface DeleteUserResponse {
  success: boolean;
  error?: string;
}

/**
 * List users response
 */
export interface ListUsersResponse {
  success: boolean;
  users?: Array<{
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
  }>;
  error?: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Change password response
 */
export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ==============================================================================
// FAQ System Types
// ==============================================================================

/**
 * FAQ entry lifecycle status
 */
export type FaqStatus = 'ACTIVE' | 'ARCHIVED';

/**
 * Core FAQ entry data (matches Prisma model)
 */
export interface FaqEntry {
  id: string;
  title: string;
  content: string;
  status: FaqStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * FAQ entry with creator/updater relations (used in admin views)
 */
export interface FaqEntryWithUsers extends FaqEntry {
  creator: {
    id: string;
    username: string;
  };
  updater: {
    id: string;
    username: string;
  };
}

/**
 * FAQ entry for public/member view (excludes sensitive fields)
 */
export interface FaqEntryPublic {
  id: string;
  title: string;
  content: string;
  status: 'ACTIVE'; // Always ACTIVE for public view
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request body for creating a new FAQ entry
 */
export interface CreateFaqRequest {
  title: string;
  content: string;
  status?: FaqStatus; // Optional, defaults to ACTIVE
}

/**
 * Request body for updating an existing FAQ entry (partial update)
 */
export interface UpdateFaqRequest {
  title?: string;
  content?: string;
  status?: FaqStatus;
}

/**
 * Query parameters for admin FAQ list endpoint
 */
export interface ListFaqsAdminQuery {
  page?: number; // Default: 1
  pageSize?: number; // Default: 10
  status?: FaqStatus; // Optional: filter by status
  search?: string; // Optional: search term (max 100 chars)
}

/**
 * Response from admin FAQ list endpoint (paginated)
 */
export interface ListFaqsAdminResponse {
  faqs: FaqEntryWithUsers[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Response from portal FAQ list endpoint (all active, no pagination)
 */
export interface ListFaqsPortalResponse {
  faqs: FaqEntryPublic[];
}

/**
 * API error response structure for FAQ endpoints
 */
export interface FaqApiError {
  error: string; // German error message
  details?: Record<string, string>; // Validation error details
}

// ==============================================================================
// Newsletter API Response Types
// ==============================================================================

/**
 * Response from POST /api/admin/newsletter/validate
 * Validates and processes recipient email addresses
 */
export interface ValidateRecipientsResponse {
  valid: number;
  invalid: number;
  new: number;
  existing: number;
  invalidEmails: string[];
  validatedEmails: string[]; // ValidatedEmails type
}

/**
 * Response from POST /api/admin/newsletter/send
 * Prepares newsletter for chunked sending
 */
export interface SendNewsletterResponse {
  success: boolean;
  validRecipients: number;
  newsletterId: string;
  emailChunks: string[][]; // ValidatedEmails[] - array of email chunks
  totalChunks: number;
  chunkSize: number;
  html: string;
  subject: string;
  settings: Record<string, unknown>; // NewsletterSettings
}

// ==============================================================================
// Appointment Link Enhancement Types
// ==============================================================================

/**
 * Metadata for appointment Open Graph tags.
 * Used internally for building rich link previews.
 */
export interface AppointmentMetadata {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  startDateTime: string; // ISO 8601
  endDateTime?: string; // ISO 8601
  location?: string;
}