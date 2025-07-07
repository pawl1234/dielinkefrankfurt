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
 * Union type covering all possible Next.js API route context shapes
 */
export type NextJSRouteContext = SimpleRouteContext | IdRouteContext | SlugRouteContext;

/**
 * Type for API handler functions with proper type safety
 * Uses generic parameter to accommodate different context shapes
 */
export type ApiHandler<TContext = NextJSRouteContext> = (request: NextRequest, context?: TContext) => Promise<NextResponse>;

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
 * Newsletter sending settings with chunk tracking
 */
export interface NewsletterSendingSettings {
  chunkResults: ChunkResult[];
  totalSent: number;
  totalFailed: number;
  lastChunkCompletedAt: string;
  completedChunks: number;
  totalRecipients?: number;
  successfulSends?: number;
  failedSends?: number;
  adminNotificationEmail?: string;
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
    details: string; // Free text describing personnel needs
  };
  raumbuchung?: {
    enabled: boolean;
    location: string;
    numberOfPeople: number;
    details: string; // Additional details like time, duration, special requirements
  };
  weiteres?: {
    enabled: boolean;
    details: string; // Free text for other requirements
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