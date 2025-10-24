/**
 * Component-specific types and interfaces
 */

import { Control, FieldValues, Path, RegisterOptions, UseFormSetValue } from 'react-hook-form';

/**
 * Props for DateTimePicker component with proper typing
 */
export interface DateTimePickerProps<TFieldValues extends FieldValues = FieldValues> {
  label: string;
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  rules?: Omit<RegisterOptions<TFieldValues, Path<TFieldValues>>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;
  required?: boolean;
  error?: string;
  minDate?: Date;
  defaultValue?: Date;
  setValue?: UseFormSetValue<TFieldValues>;
}

/**
 * Form control type for components that need control object
 */
export interface FormControlProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, Path<TFieldValues>>;
}

/**
 * Appointment interface for consistent typing across components
 * Based on Prisma Appointment model
 */
export interface Appointment {
  id: number;
  title: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  locationDetails: string | null;
  postalCode: string | null;
  firstName: string | null;
  lastName: string | null;
  recurringText: string | null;
  featured: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  processed: boolean;
  processingDate: string | null;
  statusChangeDate: string | null;
  rejectionReason: string | null;
  fileUrls: string | null;
  metadata: string | null;
}

/**
 * Partial appointment interface for public/display use cases
 * Contains only fields typically needed for frontend display
 */
export interface PublicAppointment {
  id: number;
  title: string;
  mainText: string;
  startDateTime: string;
  endDateTime: string | null;
  street: string | null;
  city: string | null;
  locationDetails: string | null;
  postalCode: string | null;
  featured: boolean;
}

/**
 * Public group with recurring meeting information
 * Extends basic Group type with meeting-specific fields for display
 */
export interface PublicGroupWithMeeting {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  recurringPatterns: string | null;
  meetingTime: string | null;
  meetingStreet: string | null;
  meetingCity: string | null;
  meetingPostalCode: string | null;
  meetingLocationDetails: string | null;
}

/**
 * Navigation menu item type discriminator
 */
export type MenuItemType = 'link' | 'divider' | 'submenu';

/**
 * Base interface for all navigation menu items
 * Provides common fields for MenuItem discriminated union
 */
export interface BaseMenuItem {
  /**
   * Type discriminator for the menu item
   */
  type: MenuItemType;
  /**
   * Unique identifier for React keys and submenu state tracking
   */
  key: string;
}

/**
 * Navigation link menu item
 * Represents a clickable link to a specific page
 */
export interface LinkMenuItem extends BaseMenuItem {
  /**
   * Type discriminator - must be 'link'
   */
  type: 'link';
  /**
   * Display label (German text, max 30 characters recommended)
   */
  label: string;
  /**
   * Next.js route path (must start with /)
   */
  href: string;
  /**
   * Optional Material UI icon component
   */
  icon?: React.ReactNode;
}

/**
 * Divider menu item
 * Represents a visual separator between groups of menu items
 */
export interface DividerMenuItem extends BaseMenuItem {
  /**
   * Type discriminator - must be 'divider'
   */
  type: 'divider';
}

/**
 * Submenu menu item
 * Represents a parent menu item with expandable child items
 */
export interface SubmenuMenuItem extends BaseMenuItem {
  /**
   * Type discriminator - must be 'submenu'
   */
  type: 'submenu';
  /**
   * Display label (German text, max 30 characters recommended)
   */
  label: string;
  /**
   * Optional Material UI icon component
   */
  icon?: React.ReactNode;
  /**
   * Nested menu items (no nested submenus - max 1 level deep)
   */
  items: MenuItem[];
}

/**
 * Discriminated union of all menu item types
 * Use type narrowing based on the 'type' field
 */
export type MenuItem = LinkMenuItem | DividerMenuItem | SubmenuMenuItem;

// ==============================================================================
// FAQ Component Types
// ==============================================================================

import type { FaqStatus } from './api-types';

/**
 * Status display configuration for FAQ chips/badges
 */
export interface FaqStatusDisplay {
  value: FaqStatus;
  label: string; // German label
  color: 'success' | 'default'; // MUI chip color
}

/**
 * Status options for admin UI (constant)
 */
export const FAQ_STATUS_OPTIONS: readonly FaqStatusDisplay[] = [
  { value: 'ACTIVE', label: 'Aktiv', color: 'success' },
  { value: 'ARCHIVED', label: 'Archiviert', color: 'default' },
] as const;