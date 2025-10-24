/**
 * TypeScript Type Definitions for FAQ System
 *
 * This file defines the TypeScript interfaces and types that will be added
 * to the project's central type files during implementation.
 *
 * IMPORTANT: These types should be added to existing type files:
 * - Add to `src/types/api-types.ts` for API-related types
 * - Reuse existing types from `src/types/` where possible
 */

// ==============================================================================
// FAQ Status Enum
// ==============================================================================

/**
 * FAQ entry lifecycle status
 */
export type FaqStatus = 'ACTIVE' | 'ARCHIVED';

// ==============================================================================
// FAQ Entry Types
// ==============================================================================

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

// ==============================================================================
// API Request/Response Types
// ==============================================================================

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

// ==============================================================================
// Form Types
// ==============================================================================

/**
 * Form data for creating/editing FAQ entries (client-side)
 */
export interface FaqFormData {
  title: string;
  content: string; // HTML string from RichTextEditor
  status: FaqStatus;
}

/**
 * Initial data for FAQ edit form
 */
export interface FaqEditFormInitialData {
  id: string;
  title: string;
  content: string;
  status: FaqStatus;
}

// ==============================================================================
// Component Props Types
// ==============================================================================

/**
 * Props for FaqAccordionItem component (admin view)
 */
export interface FaqAccordionItemAdminProps {
  faq: FaqEntryWithUsers;
  expanded: boolean;
  editing: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: UpdateFaqRequest) => Promise<void>;
  onArchive: () => Promise<void>;
  onReactivate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

/**
 * Props for FaqAccordionItem component (portal view)
 */
export interface FaqAccordionItemPortalProps {
  faq: FaqEntryPublic;
  expanded: boolean;
  onToggleExpand: () => void;
}

/**
 * Props for CreateFaqDialog component
 */
export interface CreateFaqDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateFaqRequest) => Promise<void>;
}

/**
 * Props for FaqSearchBar component
 */
export interface FaqSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

// ==============================================================================
// State Management Types
// ==============================================================================

/**
 * Admin FAQ page state
 */
export interface AdminFaqState {
  // Data
  faqs: FaqEntryWithUsers[];
  totalItems: number;
  totalPages: number;

  // UI State
  loading: boolean;
  error: string | null;
  expandedAccordionId: string | null;
  editingFaqId: string | null;
  createDialogOpen: boolean;
  deleteDialogOpen: boolean;
  faqToDeleteId: string | null;

  // Filters
  tabValue: number; // 0=ACTIVE, 1=ARCHIVED, 2=ALL
  searchTerm: string;
  page: number;
  pageSize: number;
}

/**
 * Portal FAQ page state
 */
export interface PortalFaqState {
  // Data
  faqs: FaqEntryPublic[];

  // UI State
  loading: boolean;
  error: string | null;
  expandedAccordionId: string | null;

  // Filters
  searchTerm: string;
  filteredFaqs: FaqEntryPublic[]; // Client-side filtered results
}

// ==============================================================================
// Validation Types (Zod Schema Types)
// ==============================================================================

/**
 * Inferred type from createFaqSchema (Zod)
 * Define in src/lib/validation/faq-schema.ts
 */
export type CreateFaqSchemaType = {
  title: string;
  content: string;
  status?: FaqStatus;
};

/**
 * Inferred type from updateFaqSchema (Zod)
 * Define in src/lib/validation/faq-schema.ts
 */
export type UpdateFaqSchemaType = {
  title?: string;
  content?: string;
  status?: FaqStatus;
};

/**
 * Inferred type from searchQuerySchema (Zod)
 * Define in src/lib/validation/faq-schema.ts
 */
export type SearchQuerySchemaType = {
  query?: string;
};

// ==============================================================================
// Database Operation Function Signatures
// ==============================================================================

/**
 * Session context for authorization checks
 * Reuse existing session type from NextAuth or define in user.ts
 */
export interface SessionContext {
  role: 'admin' | 'mitglied';
  user: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * Pagination parameters for database queries
 */
export interface PaginationParams {
  skip: number;
  take: number;
}

/**
 * Where clause for FAQ queries (Prisma types)
 * Use Prisma.FaqEntryWhereInput in actual implementation
 */
export interface FaqWhereInput {
  status?: FaqStatus;
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    content?: { contains: string; mode: 'insensitive' };
  }>;
}

/**
 * Order by clause for FAQ queries (Prisma types)
 * Use Prisma.FaqEntryOrderByWithRelationInput in actual implementation
 */
export interface FaqOrderByInput {
  title?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
  updatedAt?: 'asc' | 'desc';
}

// ==============================================================================
// Utility Types
// ==============================================================================

/**
 * Status display configuration (for chips/badges)
 */
export interface FaqStatusDisplay {
  value: FaqStatus;
  label: string; // German label
  color: 'success' | 'default'; // MUI chip color
}

/**
 * Status options for admin UI
 */
export const FAQ_STATUS_OPTIONS: readonly FaqStatusDisplay[] = [
  { value: 'ACTIVE', label: 'Aktiv', color: 'success' },
  { value: 'ARCHIVED', label: 'Archiviert', color: 'default' },
] as const;

// ==============================================================================
// Error Types
// ==============================================================================

/**
 * API error response structure
 */
export interface FaqApiError {
  error: string; // German error message
  details?: Record<string, string>; // Validation error details
}

/**
 * Notification message for UI feedback
 */
export interface FaqNotification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string; // German message
}

// ==============================================================================
// Integration Notes
// ==============================================================================

/**
 * INTEGRATION CHECKLIST:
 *
 * 1. Add to src/types/api-types.ts:
 *    - FaqStatus
 *    - FaqEntry, FaqEntryWithUsers, FaqEntryPublic
 *    - CreateFaqRequest, UpdateFaqRequest
 *    - ListFaqsAdminQuery, ListFaqsAdminResponse, ListFaqsPortalResponse
 *    - FaqApiError
 *
 * 2. Add to src/types/component-types.ts:
 *    - FaqAccordionItemAdminProps, FaqAccordionItemPortalProps
 *    - CreateFaqDialogProps, FaqSearchBarProps
 *    - FaqStatusDisplay, FAQ_STATUS_OPTIONS
 *    - FaqNotification
 *
 * 3. Add to src/types/form-types.ts:
 *    - FaqFormData, FaqEditFormInitialData
 *
 * 4. Reuse from existing types:
 *    - SessionContext from src/types/user.ts or NextAuth types
 *    - PaginationParams might already exist in api-types.ts
 *
 * 5. Database operations (src/lib/db/faq-operations.ts):
 *    - Use Prisma-generated types for actual implementation
 *    - FaqWhereInput → Prisma.FaqEntryWhereInput
 *    - FaqOrderByInput → Prisma.FaqEntryOrderByWithRelationInput
 *
 * 6. Validation schemas (src/lib/validation/faq-schema.ts):
 *    - Export Zod schemas: createFaqSchema, updateFaqSchema, searchQuerySchema
 *    - Use z.infer<typeof schema> to generate types
 *
 * IMPORTANT: Before creating any new type, check src/types/ for existing
 * definitions that can be reused or extended (Constitution Principle XII).
 */
